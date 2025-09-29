import React from 'react'

export interface Column<T> {
  key: string
  header: string
  className?: string
  render: (row: T) => React.ReactNode
}

export interface ResponsiveTableProps<T> {
  items: T[]
  keyField: (row: T) => string
  columns: Column<T>[]
  mobileItem: (row: T) => React.ReactNode
  empty?: React.ReactNode
}

function ResponsiveTable<T>({ items, keyField, columns, mobileItem, empty }: ResponsiveTableProps<T>) {
  if (!items || items.length === 0) {
    return (
      <div className="py-12 text-center">
        <div className="text-gray-400 mb-2">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-mobile-body text-gray-500">
          {empty ?? 'No records found.'}
        </p>
      </div>
    )
  }

  return (
    <>
      {/* Enhanced mobile list */}
      <div className="md:hidden space-y-3">
        {items.map((row) => (
          <div key={keyField(row)} className="card-mobile touch-manipulation">
            {mobileItem(row)}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-1.5 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${c.className ?? ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {items.map((row) => (
              <tr key={keyField(row)} className="hover:bg-gray-50 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 ${c.className ?? ''}`}>
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

export default ResponsiveTable
