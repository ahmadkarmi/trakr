import React from 'react'
import { useParams } from 'react-router-dom'
import DashboardLayout from '../components/DashboardLayout'

const SurveyTemplateEditor: React.FC = () => {
  const { surveyId } = useParams<{ surveyId: string }>()
  const isEditing = !!surveyId

  return (
    <DashboardLayout title={isEditing ? 'Edit Survey Template' : 'Create Survey Template'}>
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          {isEditing ? `Edit Template - ${surveyId}` : 'Create New Template'}
        </h2>
        <p className="text-gray-600">
          The survey template editor will be implemented here.
          This will provide a drag-and-drop interface for creating audit templates.
        </p>
      </div>
    </DashboardLayout>
  )
}

export default SurveyTemplateEditor
