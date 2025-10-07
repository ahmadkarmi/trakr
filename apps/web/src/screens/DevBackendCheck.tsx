import React, { useState } from 'react'
import { api } from '../utils/api'
import DashboardLayout from '../components/DashboardLayout'

const DevBackendCheck: React.FC = () => {
  const [testResults, setTestResults] = useState<any>(null)
  const [testing, setTesting] = useState(false)

  // Get environment info
  const backend = (import.meta as any).env?.VITE_BACKEND || 'NOT SET (defaults to mock)'
  const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'NOT SET'
  const isSupabase = backend === 'supabase'

  const testBranches = async () => {
    setTesting(true)
    setTestResults(null)
    try {
      const startTime = performance.now()
      const branches = await api.getBranches()
      const endTime = performance.now()
      
      setTestResults({
        success: true,
        type: 'Branches',
        count: branches.length,
        time: Math.round(endTime - startTime),
        sample: branches.slice(0, 3).map(b => ({
          id: b.id.slice(0, 8),
          name: b.name,
          location: b.location || 'N/A'
        }))
      })
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const testUsers = async () => {
    setTesting(true)
    setTestResults(null)
    try {
      const startTime = performance.now()
      const users = await api.getUsers()
      const endTime = performance.now()
      
      setTestResults({
        success: true,
        type: 'Users',
        count: users.length,
        time: Math.round(endTime - startTime),
        sample: users.slice(0, 3).map(u => ({
          id: u.id.slice(0, 8),
          name: u.name,
          email: u.email,
          role: u.role
        }))
      })
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  const testAssignments = async () => {
    setTesting(true)
    setTestResults(null)
    try {
      const startTime = performance.now()
      const assignments = await api.getAllBranchManagerAssignments()
      const endTime = performance.now()
      
      setTestResults({
        success: true,
        type: 'Branch Manager Assignments',
        count: assignments.length,
        time: Math.round(endTime - startTime),
        sample: assignments.map(a => ({
          branchId: a.branchId.slice(0, 8),
          managerId: a.managerId.slice(0, 8),
          assignedAt: new Date(a.assignedAt).toLocaleDateString()
        }))
      })
    } catch (error: any) {
      setTestResults({
        success: false,
        error: error.message
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <DashboardLayout title="Backend Check">
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 text-white">
            <h1 className="text-3xl font-bold mb-2">🔍 Backend Configuration Check</h1>
            <p className="text-blue-100">Verify that the app is using Supabase instead of mock data</p>
          </div>

          {/* Environment Status */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold mb-4">Environment Configuration</h2>
            
            <div className={`p-4 rounded-lg ${isSupabase ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-4xl">{isSupabase ? '✅' : '❌'}</div>
                <div>
                  <div className="font-bold text-lg">
                    {isSupabase ? 'SUCCESS: Using Supabase' : 'ERROR: Using Mock Data'}
                  </div>
                  <div className="text-sm text-gray-600">
                    VITE_BACKEND = "{backend}"
                  </div>
                </div>
              </div>
              
              <div className="mt-3 text-sm">
                <div className="font-mono bg-gray-900 text-green-400 p-3 rounded">
                  Supabase URL: {supabaseUrl}
                </div>
              </div>
            </div>

            {!isSupabase && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
                <div className="font-semibold text-yellow-900 mb-2">⚠️ Action Required</div>
                <div className="text-sm text-yellow-800">
                  <p>1. Stop the dev server (Ctrl+C)</p>
                  <p>2. Ensure .env file has: <code className="bg-yellow-100 px-2 py-0.5 rounded">VITE_BACKEND=supabase</code></p>
                  <p>3. Restart: <code className="bg-yellow-100 px-2 py-0.5 rounded">npm run dev</code></p>
                </div>
              </div>
            )}
          </div>

          {/* Test Buttons */}
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick API Tests</h2>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={testBranches}
                disabled={testing}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? '⏳ Testing...' : '🏢 Test Branches'}
              </button>
              
              <button
                onClick={testUsers}
                disabled={testing}
                className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? '⏳ Testing...' : '👥 Test Users'}
              </button>
              
              <button
                onClick={testAssignments}
                disabled={testing}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {testing ? '⏳ Testing...' : '📋 Test Assignments'}
              </button>
            </div>

            {/* Test Results */}
            {testResults && (
              <div className={`mt-6 p-4 rounded-lg ${testResults.success ? 'bg-green-50 border-2 border-green-500' : 'bg-red-50 border-2 border-red-500'}`}>
                {testResults.success ? (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-3xl">✅</div>
                      <div>
                        <div className="font-bold text-lg text-green-900">
                          {testResults.type} - Success!
                        </div>
                        <div className="text-sm text-green-700">
                          Found {testResults.count} records in {testResults.time}ms
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <div className="text-sm font-semibold text-green-900 mb-2">Sample Data:</div>
                      <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(testResults.sample, null, 2)}
                      </pre>
                    </div>

                    {testResults.time < 10 && (
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded">
                        <div className="text-sm text-yellow-800">
                          ⚠️ Response was very fast ({testResults.time}ms). This might indicate mock data. 
                          Real Supabase calls typically take 50-500ms.
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-3xl">❌</div>
                      <div className="font-bold text-lg text-red-900">Error</div>
                    </div>
                    <pre className="bg-gray-900 text-red-400 p-3 rounded text-sm overflow-x-auto">
                      {testResults.error}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <h2 className="text-xl font-semibold mb-3">🔍 How to Verify</h2>
            <div className="space-y-2 text-sm text-gray-700">
              <p><strong>1. Check Environment Status:</strong> Should show "SUCCESS: Using Supabase"</p>
              <p><strong>2. Open DevTools Network Tab:</strong> Press F12 → Network</p>
              <p><strong>3. Click a Test Button:</strong> You should see network requests to <code className="bg-gray-200 px-1 rounded">*.supabase.co</code></p>
              <p><strong>4. Response Time:</strong> Mock data = &lt;10ms, Supabase = 50-500ms</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default DevBackendCheck
