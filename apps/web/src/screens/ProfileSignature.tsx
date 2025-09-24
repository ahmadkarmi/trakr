import React from 'react'
import DashboardLayout from '../components/DashboardLayout'
import { useAuthStore } from '../stores/auth'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { User } from '@trakr/shared'
import { api } from '../utils/api'
import { QK } from '../utils/queryKeys'

const ProfileSignature: React.FC = () => {
  const { user, updateUser } = useAuthStore()
  const queryClient = useQueryClient()

  const [uploading, setUploading] = React.useState(false)
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  // Canvas drawing state
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawingRef = React.useRef(false)
  const lastPosRef = React.useRef<{ x: number; y: number } | null>(null)

  const setSignatureMutation = useMutation<User, Error, { signatureUrl: string | null }>({
    mutationFn: async ({ signatureUrl }) => {
      if (!user) throw new Error('Not signed in')
      return api.setUserSignature(user.id, signatureUrl)
    },
    onSuccess: (updated) => {
      updateUser(updated)
      queryClient.invalidateQueries({ queryKey: QK.USER(user!.id) })
      setUploading(false)
    },
    onError: () => setUploading(false),
  })

  if (!user) {
    return (
      <DashboardLayout title="Profile · Signature">
        <div className="card p-6">
          <p className="text-gray-600">You must be signed in to manage your signature.</p>
        </div>
      </DashboardLayout>
    )
  }

  const onPickFile = () => fileInputRef.current?.click()

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const reader = new FileReader()
      reader.onload = () => {
        const dataUrl = String(reader.result || '')
        setSignatureMutation.mutate({ signatureUrl: dataUrl })
      }
      reader.onerror = () => setUploading(false)
      reader.readAsDataURL(file)
    } catch {
      setUploading(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const onClear = () => {
    setUploading(true)
    setSignatureMutation.mutate({ signatureUrl: null })
  }

  // Drawing helpers (works with mouse and touch via PointerEvents)
  const startDraw = (x: number, y: number) => {
    drawingRef.current = true
    lastPosRef.current = { x, y }
  }
  const drawTo = (x: number, y: number) => {
    if (!drawingRef.current || !canvasRef.current) return
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx || !lastPosRef.current) return
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y)
    ctx.lineTo(x, y)
    ctx.stroke()
    lastPosRef.current = { x, y }
  }
  const endDraw = () => {
    drawingRef.current = false
    lastPosRef.current = null
  }
  const clearCanvas = () => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, c.width, c.height)
  }
  const saveCanvasAsSignature = () => {
    if (!canvasRef.current) return
    const dataUrl = canvasRef.current.toDataURL('image/png')
    setUploading(true)
    setSignatureMutation.mutate({ signatureUrl: dataUrl })
  }

  return (
    <DashboardLayout title="Profile · Signature">
      <div className="space-y-6 max-w-3xl mx-auto">
        <div className="card p-6">
          <h2 className="text-lg font-semibold text-gray-900">Saved Signature</h2>
          <p className="text-sm text-gray-600 mt-1">Upload a signature image or draw one below. This will be used on approvals.</p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="md:col-span-2">
              <div className="border rounded p-3 bg-gray-50 flex items-center justify-center h-28">
                {user.signatureUrl ? (
                  <img src={user.signatureUrl} alt="Saved signature" className="max-h-24 object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">No signature uploaded</span>
                )}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button className="btn-outline btn-sm disabled:opacity-60" onClick={onPickFile} disabled={uploading}>
                {uploading ? 'Saving…' : (user.signatureUrl ? 'Replace' : 'Upload')}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileSelected} />
              <button className="btn-ghost btn-sm disabled:opacity-60" onClick={onClear} disabled={uploading || !user.signatureUrl}>Remove</button>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="text-base font-medium text-gray-900">Draw a Signature</h3>
            <p className="text-xs text-gray-500">Use mouse or touch to sign. Click Save to store it as your signature image.</p>
            <div className="mt-2 border rounded p-2 bg-gray-50">
              <canvas
                ref={canvasRef}
                width={800}
                height={180}
                className="w-full h-44 bg-white rounded border"
                onPointerDown={(e) => {
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                  startDraw(e.clientX - rect.left, e.clientY - rect.top)
                }}
                onPointerMove={(e) => {
                  if (!drawingRef.current) return
                  const rect = (e.target as HTMLCanvasElement).getBoundingClientRect()
                  drawTo(e.clientX - rect.left, e.clientY - rect.top)
                }}
                onPointerUp={endDraw}
                onPointerLeave={endDraw}
              />
              <div className="mt-2 flex items-center gap-2">
                <button className="btn-outline btn-xs" onClick={clearCanvas}>Clear</button>
                <button className="btn-secondary btn-xs disabled:opacity-60" onClick={saveCanvasAsSignature} disabled={uploading}>Save as signature</button>
              </div>
            </div>
          </div>

          <div className="mt-3 text-xs text-gray-500">
            Recommended: transparent PNG, width ~600–1200px. Drawn signatures are saved as PNG.
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

export default ProfileSignature
