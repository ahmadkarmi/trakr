import React from 'react'

const LoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Trakr</h2>
        <p className="text-gray-600">Please wait while we initialize the application...</p>
      </div>
    </div>
  )
}

export default LoadingScreen
