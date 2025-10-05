import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'

interface Tab {
  id: string
  label: string
  icon?: string
  disabled?: boolean
  badge?: number
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  children: React.ReactNode[]
  onChange?: (tabId: string) => void
}

export const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, children, onChange }) => {
  const [searchParams, setSearchParams] = useSearchParams()
  const tabFromUrl = searchParams.get('tab')
  const [activeTab, setActiveTab] = useState(tabFromUrl || defaultTab || tabs[0]?.id)

  // Sync with URL params
  useEffect(() => {
    if (tabFromUrl && tabs.some(t => t.id === tabFromUrl && !t.disabled)) {
      setActiveTab(tabFromUrl)
    }
  }, [tabFromUrl, tabs])

  const handleTabChange = (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.disabled) return

    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
    onChange?.(tabId)
  }

  const activeIndex = tabs.findIndex(t => t.id === activeTab)

  return (
    <div className="w-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8 overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            const isDisabled = tab.disabled

            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                disabled={isDisabled}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  transition-colors duration-200 flex items-center gap-2
                  ${isActive
                    ? 'border-blue-500 text-blue-600'
                    : isDisabled
                    ? 'border-transparent text-gray-400 cursor-not-allowed'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 cursor-pointer'
                  }
                `}
                aria-current={isActive ? 'page' : undefined}
              >
                {tab.icon && <span className="text-lg">{tab.icon}</span>}
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className={`
                    ml-2 py-0.5 px-2 rounded-full text-xs font-semibold
                    ${isActive
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-gray-100 text-gray-600'
                    }
                  `}>
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {children[activeIndex] || children[0]}
      </div>
    </div>
  )
}

export default Tabs
