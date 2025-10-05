import React from 'react'
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

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
  colors = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#6B7280'],
  height = 300
}) => {
  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {yKeys.map((key, index) => (
                <Line 
                  key={key}
                  type="monotone" 
                  dataKey={key} 
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )
      case 'bar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey={xKey} stroke="#6b7280" style={{ fontSize: '12px' }} />
              <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                labelStyle={{ color: '#374151', fontWeight: 600 }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {yKeys.map((key, index) => (
                <Bar 
                  key={key}
                  dataKey={key} 
                  fill={colors[index % colors.length]}
                  radius={[4, 4, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )
      case 'pie':
        // Filter out zero values for cleaner pie chart
        const pieData = data.filter(item => item.value > 0)
        
        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
        )
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <span className="text-gray-500">Unsupported chart type</span>
          </div>
        )
    }
  }

  return (
    <div style={{ minHeight: `${height}px` }} className="w-full">
      {renderChart()}
    </div>
  )
}

export default AnalyticsChart
