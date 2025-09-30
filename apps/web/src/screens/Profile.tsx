import React, { useEffect, useRef, useState } from 'react'
import DashboardLayout from '@/components/DashboardLayout'
import { useAuthStore } from '@/stores/auth'
import { api } from '../utils/api'

const Profile: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isUploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [showSaved, setShowSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setEmail(user.email || '')
    }
  }, [user])

  if (!user) return null

  const onPickFile = () => fileInputRef.current?.click()

  const onFileChange: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    setUploading(true)
    reader.onload = async () => {
      try {
        const dataUrl = reader.result as string
        const updated = await api.setUserAvatar(user.id, dataUrl)
        updateUser(updated)
      } finally {
        setUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const onRemoveAvatar = async () => {
    setUploading(true)
    try {
      const updated = await api.setUserAvatar(user.id, null)
      updateUser(updated)
    } finally {
      setUploading(false)
    }
  }

  return (
    <DashboardLayout title="Profile">
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="card flex flex-col items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full object-cover border" />
          ) : (
            <div className="w-32 h-32 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center text-4xl font-medium border">
              {user.name?.charAt(0) || '?'}
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-secondary btn-sm" onClick={onPickFile} disabled={isUploading}>{isUploading ? 'Uploading…' : (user.avatarUrl ? 'Change' : 'Upload')} Photo</button>
            {user.avatarUrl && (
              <button className="btn btn-outline btn-sm" onClick={onRemoveAvatar} disabled={isUploading}>Remove</button>
            )}
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900">Account</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Full Name</label>
              <input
                className={`input mt-1 ${name.trim() === '' || name.trim().length > 80 ? 'border-danger-300 focus-visible:ring-danger-500' : ''}`}
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-invalid={name.trim() === '' || name.trim().length > 80}
              />
              {(name.trim() === '' || name.trim().length > 80) && (
                <p className="mt-1 text-xs text-danger-600">
                  {name.trim() === '' ? 'Name is required.' : 'Name must be 80 characters or fewer.'}
                </p>
              )}
            </div>
            <div>
              <label className="label">Email</label>
              <input
                className={`input mt-1 ${!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? 'border-danger-300 focus-visible:ring-danger-500' : ''}`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())}
                inputMode="email"
              />
              {(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) && (
                <p className="mt-1 text-xs text-danger-600">Enter a valid email address.</p>
              )}
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button
              className="btn btn-primary btn-sm"
              onClick={async () => {
                setSaving(true)
                try {
                  const updated = await api.updateUser(user.id, { name: name.trim(), email: email.trim() })
                  updateUser(updated)
                  setShowSaved(true)
                  window.setTimeout(() => setShowSaved(false), 1500)
                } finally {
                  setSaving(false)
                }
              }}
              disabled={
                saving ||
                name.trim() === '' ||
                name.trim().length > 80 ||
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
              }
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <button
              className="btn btn-outline btn-sm"
              onClick={() => { setName(user.name || ''); setEmail(user.email || '') }}
              disabled={saving}
            >
              Reset
            </button>
            {showSaved && <span className="text-xs text-success-700">Saved.</span>}
          </div>

          <div className="mt-6">
            <label className="label">Signature</label>
            <p className="text-sm text-gray-600 mt-1">Manage your approval signature from the dedicated Signature page.</p>
            <a href="/profile/signature" className="inline-flex items-center gap-2 btn btn-outline btn-sm mt-2">Go to Signature</a>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Profile
