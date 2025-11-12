import '@testing-library/jest-dom'
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest'
import { screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router-dom'
import SurveyTemplateEditor from '../SurveyTemplateEditor'
import { QuestionType } from '@trakr/shared'
import { ensureSurveyTemplateFixture, renderWithSupabaseContext, type SurveyFixture } from '@/tests/utils/supabaseFixtures'

// Mock DashboardLayout to avoid React Router context issues in tests
vi.mock('@/components/DashboardLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>
}))

let fixture: SurveyFixture

const renderEditor = async () => {
  await renderWithSupabaseContext(
    (
      <Routes>
        <Route path="/surveys/:surveyId" element={<SurveyTemplateEditor />} />
      </Routes>
    ),
    { route: `/surveys/${fixture.surveyId}` }
  )
}

describe('SurveyTemplateEditor', () => {
  beforeAll(async () => {
    fixture = await ensureSurveyTemplateFixture()
  })

  beforeEach(async () => {
    fixture = await ensureSurveyTemplateFixture()
  })

  it('opens Add Question modal with autofocus and basic validation', async () => {
    await renderEditor()

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
    await renderEditor()
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
    await renderEditor()
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
