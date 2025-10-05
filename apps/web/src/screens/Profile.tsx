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
      <div className="mobile-container breathing-room">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
          <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
        </div>

        <div className="grid gap-4 sm:gap-6 md:grid-cols-[280px_1fr]">
          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 flex flex-col items-center">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.name} className="w-32 h-32 rounded-full object-cover border-2 border-gray-200" />
            ) : (
              <div className="w-32 h-32 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-4xl font-medium border-2 border-gray-200">
                {user.name?.charAt(0) || '?'}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-2 mt-4 w-full">
              <button 
                className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2 px-4 rounded-lg text-sm transition-colors" 
                onClick={onPickFile} 
                disabled={isUploading}
              >
                {isUploading ? 'Uploading…' : (user.avatarUrl ? 'Change' : 'Upload')}
              </button>
              {user.avatarUrl && (
                <button 
                  className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2 px-4 rounded-lg text-sm transition-colors" 
                  onClick={onRemoveAvatar} 
                  disabled={isUploading}
                >
                  Remove
                </button>
              )}
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-5 sm:p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account Information</h2>
            </div>
          <div className="grid gap-4 sm:grid-cols-2">
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

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-6 border-t border-gray-200">
            <button
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
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
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <button
              className="w-full sm:w-auto bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50"
              onClick={() => { setName(user.name || ''); setEmail(user.email || '') }}
              disabled={saving}
            >
              Reset
            </button>
            {showSaved && <span className="text-sm text-green-600 font-medium text-center sm:text-left">✓ Saved</span>}
          </div>

          <div className="pt-6 border-t border-gray-200">
            <h3 className="text-base font-semibold text-gray-900 mb-2">Signature</h3>
            <p className="text-sm text-gray-600 mb-3">Manage your approval signature for audit reviews</p>
            <a href="/profile/signature" className="inline-flex bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium py-2.5 px-4 rounded-lg transition-colors">
              Go to Signature Settings
            </a>
          </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default Profile
