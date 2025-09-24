import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Mock the shared module to avoid loading the real package during tests (prevents duplicate React copies)
vi.mock('@trakr/shared', () => {
  enum QuestionType {
    YES_NO = 'YES_NO',
    MULTIPLE_CHOICE = 'MULTIPLE_CHOICE',
    CHECKBOX = 'CHECKBOX',
    NUMBER = 'NUMBER',
    TEXT = 'TEXT',
    DATE = 'DATE',
  }
  enum AuditFrequency {
    UNLIMITED = 'UNLIMITED',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    QUARTERLY = 'QUARTERLY',
  }
  enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    AUDITOR = 'auditor',
    BRANCH_MANAGER = 'branch_manager',
  }
  const QUESTION_TYPE_LABELS: Record<string, string> = {
    [QuestionType.YES_NO]: 'Yes/No',
    [QuestionType.MULTIPLE_CHOICE]: 'Multiple Choice',
    [QuestionType.CHECKBOX]: 'Checkboxes',
    [QuestionType.NUMBER]: 'Number',
    [QuestionType.TEXT]: 'Text',
    [QuestionType.DATE]: 'Date',
  }
  const USER_ROLE_LABELS: Record<UserRole, string> = {
    [UserRole.SUPER_ADMIN]: 'Super Admin',
    [UserRole.ADMIN]: 'Admin',
    [UserRole.AUDITOR]: 'Auditor',
    [UserRole.BRANCH_MANAGER]: 'Branch Manager',
  }
  const fakeSurvey = {
    id: 'survey-test',
    title: 'Test Template',
    description: 'Desc',
    version: 1,
    isActive: true,
    createdBy: 'user-x',
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      { id: 'section-1', title: 'Page 1', description: 'P1', order: 0, questions: [] },
    ],
  }
  const mockApi = {
    getSurveyById: vi.fn(async (_id: string) => fakeSurvey),
    updateSurvey: vi.fn(async (_id: string, payload: Partial<Record<'title' | 'description' | 'isActive' | 'sections', unknown>>) => ({
      ...fakeSurvey,
      ...payload,
    })),
  }
  return { QuestionType, QUESTION_TYPE_LABELS, UserRole, USER_ROLE_LABELS, mockApi, AuditFrequency }
})

// Mock layout to avoid rendering full sidebar/topbar with Links
vi.mock('@/components/DashboardLayout', () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div>
      <h1>{title}</h1>
      <div>{children}</div>
    </div>
  ),
}))

// Force the editor to use a mocked API instead of reading VITE_BACKEND
vi.mock('../../utils/api', () => {
  const fakeSurvey = {
    id: 'survey-test',
    title: 'Test Template',
    description: 'Desc',
    version: 1,
    isActive: true,
    createdBy: 'user-x',
    createdAt: new Date(),
    updatedAt: new Date(),
    sections: [
      { id: 'section-1', title: 'Page 1', description: 'P1', order: 0, questions: [] },
    ],
  }
  return {
    api: {
      getSurveyById: vi.fn(async (_id: string) => fakeSurvey),
      updateSurvey: vi.fn(async (_id: string, _payload: any) => ({ ...fakeSurvey })),
    }
  }
})

// Import after mocks
import SurveyTemplateEditor from '../SurveyTemplateEditor'
import { QuestionType } from '@trakr/shared'

async function renderWithProviders(route = '/surveys/survey-test') {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await act(async () => {
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/surveys/:surveyId" element={<SurveyTemplateEditor />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    )
  })
}

describe('SurveyTemplateEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('opens Add Question modal with autofocus and basic validation', async () => {
    await renderWithProviders()

    // Wait for template settings to appear
    await screen.findByText('Template Settings')
    // There should be a tab for Page 1
    expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument()

    // Open Add Question modal
    const addBtn = screen.getByRole('button', { name: 'Add Question' })
    await userEvent.click(addBtn)

    const questionInput = await screen.findByLabelText('Question Text')
    // Autofocus
    await waitFor(() => expect(questionInput).toHaveFocus())

    // Save disabled until text entered
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    await waitFor(() => expect(saveBtn).toBeDisabled())

    await userEvent.type(questionInput, 'Is everything ok?')
    // Default YES/NO no points -> still valid but allowed to save (points can be zero)
    await waitFor(() => expect(saveBtn).not.toBeDisabled())

    // Save closes modal
    await userEvent.click(saveBtn)
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Question appears in table/list (wait for re-render)
    await waitFor(() => expect(screen.queryByText('No questions yet.')).not.toBeInTheDocument(), { timeout: 3000 })
    const matches = await screen.findAllByText(/Is everything ok\?/, {}, { timeout: 3000 })
    expect(matches.length).toBeGreaterThan(0)
  })

  it('YES/NO weighting: requires award when points > 0', async () => {
    renderWithProviders()
    await screen.findByText('Template Settings')

    await userEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    // Enter question text
    await userEvent.type(screen.getByLabelText('Question Text'), 'Fire extinguishers mounted?')

    // Points without selecting award should trigger error
    const pointsInput = screen.getByRole('spinbutton', { name: 'Points' })

    // Type points > 0 using input event for number inputs in JSDOM
    fireEvent.input(pointsInput, { target: { value: '5' } })

    // Must choose award (Yes/No) — show validation message and disable Save
    await screen.findByText('Select Yes or No to award points')
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    await waitFor(() => expect(saveBtn).toBeDisabled())

    await userEvent.click(screen.getByRole('button', { name: 'YES' }))
    await waitFor(() => expect(saveBtn).not.toBeDisabled())
  })

  it('Multiple Choice requires at least two options', async () => {
    renderWithProviders()
    await screen.findByText('Template Settings')

    await userEvent.click(screen.getByRole('button', { name: 'Add Question' }))

    await userEvent.type(screen.getByLabelText('Question Text'), 'Pick one')

    // Change type to Multiple Choice
    const typeSelect = screen.getByLabelText('Type')
    await userEvent.selectOptions(typeSelect, QuestionType.MULTIPLE_CHOICE)

    const addOptionInput = screen.getByPlaceholderText('Add option') as HTMLInputElement

    await userEvent.type(addOptionInput, 'Apple')
    await userEvent.keyboard('{Enter}')

    // Still invalid: need at least two options
    const saveBtn = screen.getByRole('button', { name: 'Save' })
    expect(saveBtn).toBeDisabled()

    await userEvent.type(addOptionInput, 'Banana')
    await userEvent.keyboard('{Enter}')

    await waitFor(() => expect(saveBtn).not.toBeDisabled())
  })
})
