import React from 'react'

export interface ProgressDonutProps {
  value: number // 0-100
  size?: number // px
  thickness?: number // px
  color?: string // tailwind color class, e.g., 'rgb(37 99 235)'
  label?: string
}

const ProgressDonut: React.FC<ProgressDonutProps> = ({ value, size = 120, thickness = 12, color = 'rgb(37 99 235)', label }) => {
  const pct = Math.max(0, Math.min(100, value))
  const deg = (pct / 100) * 360
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundImage: `conic-gradient(${color} ${deg}deg, #e5e7eb ${deg}deg)`
  }
  const innerSize = size - thickness * 2
  return (
    <div className="relative inline-flex items-center justify-center rounded-full" style={style}>
      <div
        className="absolute rounded-full bg-white"
        style={{
          width: innerSize,
          height: innerSize,
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      <div className="relative text-center">
        <div className="text-2xl font-semibold text-gray-900">{pct}%</div>
        {label && <div className="text-xs text-gray-500 mt-0.5">{label}</div>}
      </div>
    </div>
  )
}

export default ProgressDonut
