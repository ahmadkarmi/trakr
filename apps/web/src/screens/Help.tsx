import React from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { Link } from 'react-router-dom'

const Help: React.FC = () => {
  return (
    <DashboardLayout title="Help & Resources">
      <div className="grid gap-6 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Getting Started</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-6">
            <li>
              Review your <Link to="/profile" className="text-primary-700 hover:underline">Profile</Link> and <Link to="/profile/signature" className="text-primary-700 hover:underline">Signature</Link>.
            </li>
            <li>
              Check your role-based dashboard:
              <ul className="list-disc pl-6 mt-1">
                <li><Link to="/dashboard/admin" className="text-primary-700 hover:underline">Admin Dashboard</Link></li>
                <li><Link to="/dashboard/branch-manager" className="text-primary-700 hover:underline">Branch Manager</Link></li>
                <li><Link to="/dashboard/auditor" className="text-primary-700 hover:underline">Auditor</Link></li>
              </ul>
            </li>
          </ul>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Common Tasks</h2>
          <ul className="mt-3 space-y-2 text-sm text-gray-700 list-disc pl-6">
            <li>Start or continue an audit from your dashboard.</li>
            <li>View an audit and upload photos or add comments.</li>
            <li>Branch Managers can approve or reject audits with a note and signature.</li>
          </ul>
        </div>

        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">FAQ</h2>
          <div className="mt-3 space-y-3">
            <details className="group rounded-md border p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-sm font-medium text-gray-900">How do I change my profile photo?</span>
                <span className="text-gray-500 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="mt-2 text-sm text-gray-700">
                Go to <Link to="/profile" className="text-primary-700 hover:underline">Profile</Link> and use the Upload/Change Photo button.
              </div>
            </details>
            <details className="group rounded-md border p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Where do I set my approval signature?</span>
                <span className="text-gray-500 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="mt-2 text-sm text-gray-700">
                Visit <Link to="/profile/signature" className="text-primary-700 hover:underline">Profile → Signature</Link> to upload, type, or draw your signature.
              </div>
            </details>
            <details className="group rounded-md border p-3">
              <summary className="flex cursor-pointer list-none items-center justify-between">
                <span className="text-sm font-medium text-gray-900">Why can’t I start an audit for a branch?</span>
                <span className="text-gray-500 group-open:rotate-180 transition">▾</span>
              </summary>
              <div className="mt-2 text-sm text-gray-700">
                Some surveys have frequency limits (daily/weekly/monthly). If you’ve already run an audit in the current period, it may be unavailable until the next period.
              </div>
            </details>
          </div>
        </div>

        <div className="card md:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900">Need More Help?</h2>
          <p className="mt-2 text-gray-700 text-sm">
            This is a demo environment with a mock API. If you need deeper assistance or want to suggest improvements,
            please open an issue in your repository or contact your team admin.
          </p>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Help
