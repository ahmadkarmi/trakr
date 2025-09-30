import React from 'react'

interface AnalyticsChartProps {
  type: 'line' | 'bar' | 'pie'
  data: any[]
  xKey?: string
  yKeys?: string[]
  colors?: string[]
  height?: number
}

const AnalyticsChart: React.FC<AnalyticsChartProps> = ({
  type,
  data,
  xKey = 'name',
  yKeys = ['value'],
  colors = ['#3B82F6'],
  height = 300
}) => {
  // This is a placeholder component for charts
  // In a real implementation, you would use a charting library like Recharts, Chart.js, or D3
  
  const renderPlaceholderChart = () => {
    switch (type) {
      case 'line':
        return (
          <div className="flex items-end justify-between h-full px-4">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div 
                  className="w-8 bg-blue-500 rounded-t"
                  style={{ 
                    height: `${Math.random() * 80 + 20}%`,
                    backgroundColor: colors[0] 
                  }}
                />
                <span className="text-xs text-gray-600">{item[xKey]}</span>
              </div>
            ))}
          </div>
        )
      case 'bar':
        return (
          <div className="flex items-end justify-between h-full px-4">
            {data.map((item, index) => (
              <div key={index} className="flex flex-col items-center gap-2">
                <div 
                  className="w-12 bg-blue-500 rounded-t"
                  style={{ 
                    height: `${(item[yKeys[0]] / Math.max(...data.map(d => d[yKeys[0]]))) * 80 + 10}%`,
                    backgroundColor: colors[0] 
                  }}
                />
                <span className="text-xs text-gray-600 text-center">{item[xKey]}</span>
              </div>
            ))}
          </div>
        )
      case 'pie':
        return (
          <div className="flex items-center justify-center h-full">
            <div className="w-32 h-32 rounded-full border-8 border-blue-500 flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">Pie Chart</span>
            </div>
          </div>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">Chart placeholder</span>
          </div>
        )
    }
  }

  return (
    <div style={{ height: `${height}px` }} className="w-full">
      {renderPlaceholderChart()}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Chart visualization ({type}) - {data.length} data points
        </p>
      </div>
    </div>
  )
}

export default AnalyticsChart
