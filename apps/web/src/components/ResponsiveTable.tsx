import React from 'react'

export interface Column<T> {
  key: string
  header: string | React.ReactNode
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
    if (empty) return <>{empty}</>
    return (
      <div className="py-12 text-center text-gray-500 text-sm">
        No records found.
      </div>
    )
  }

  return (
    <>
      {/* Enhanced mobile list */}
      <div className="md:hidden space-y-6">
        {items.map((row) => (
          <div key={keyField(row)}>
            {mobileItem(row)}
          </div>
        ))}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-white/10">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              {columns.map((c) => (
                <th key={c.key} className={`px-3 py-1.5 text-left text-xs font-medium text-gray-500 dark:text-slate-400 uppercase tracking-wider ${c.className ?? ''}`}>{c.header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-(--color-card) divide-y divide-gray-200 dark:divide-white/10">
            {items.map((row) => (
              <tr key={keyField(row)} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                {columns.map((c) => (
                  <td key={c.key} className={`px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white ${c.className ?? ''}`}>
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
