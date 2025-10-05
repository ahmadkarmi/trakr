import React from 'react'
import { useParams, Navigate } from 'react-router-dom'

const AuditDetail: React.FC = () => {
  const { auditId } = useParams<{ auditId: string }>()
  
  // Redirect to summary screen - we always use summary for viewing audits
  return <Navigate to={`/audits/${auditId}/summary`} replace />
}

export default AuditDetail
