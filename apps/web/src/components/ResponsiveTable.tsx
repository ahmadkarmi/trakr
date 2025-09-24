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
      <div className="py-8 text-center text-gray-500">
        {empty ?? 'No records.'}
      </div>
    )
  }

  return (
    <>
      {/* Mobile list */}
      <ul className="md:hidden space-y-3">
        {items.map((row) => (
          <li key={keyField(row)} className="card">
            {mobileItem(row)}
          </li>
        ))}
      </ul>

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
              <tr key={keyField(row)}>
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-1.5 ${c.className ?? ''}`}>{c.render(row)}</td>
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
