import React from 'react'
import { User, Zone } from '@trakr/shared'

type Props = {
  auditors: User[]
  zones: Zone[]
  userId: string
  zoneId: string
  onChangeUser: (id: string) => void
  onChangeZone: (id: string) => void
  onAssign: () => void
  disabled?: boolean
  pending?: boolean
  confirming?: boolean
}

const ZoneAssignPanel: React.FC<Props> = ({
  auditors,
  zones,
  userId,
  zoneId,
  onChangeUser,
  onChangeZone,
  onAssign,
  disabled = false,
  pending = false,
  confirming = false,
}) => {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900">Zone Assignment (Default)</h2>
      <p className="text-gray-600">Assign entire zones to an auditor. All branches inside the zone are assigned automatically. Use the Kanban board below for manual redistribution (vacations, workload).</p>
      <p className="text-sm text-gray-600 mt-2">
        Note: Zone assignment only redistributes not‑started (Draft) audits. In‑progress or rejected work remains with the current auditor. Submitted or approved audits never move.
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="label">Auditor</label>
          <select className="input mt-1" value={userId} onChange={(e) => onChangeUser(e.target.value)}>
            <option value="">Select auditor</option>
            {auditors.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Zone</label>
          <select className="input mt-1" value={zoneId} onChange={(e) => onChangeZone(e.target.value)}>
            <option value="">Select zone</option>
            {zones.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div className="pb-1">
          <button
            className="btn-primary"
            disabled={disabled || pending || confirming}
            onClick={onAssign}
          >
            {pending || confirming ? 'Assigning…' : 'Assign Zone'}
          </button>
          <a
            href="/help#assignment-rules"
            target="_blank"
            rel="noreferrer"
            className="ml-2 inline-flex items-center text-xs text-gray-500 hover:text-gray-700"
            title="Assignment rules — opens help in a new tab"
            aria-label="Open assignment rules help"
          >
            Help
          </a>
        </div>
      </div>
    </div>
  )
}

export default ZoneAssignPanel
