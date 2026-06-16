'use client'
import { useEffect, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Upload, Plus, Edit, Trash2, Shield, LogOut, X, FileText, Image as ImageIcon, Link as LinkIcon, Youtube } from 'lucide-react'

const ADMIN_KEY = 'gp_admin_token'
export const BRANCHES_LIST = ['CS', 'DA', 'ECE', 'EE', 'ME', 'CE']

export function getAdminToken() {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(ADMIN_KEY)
}

export const adminApi = {
  login: async (email, password) => {
    const r = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    return r.json()
  },
  me: async () => {
    const t = getAdminToken(); if (!t) return { error: 'no token' }
    const r = await fetch('/api/admin/me', { headers: { Authorization: `Bearer ${t}` } })
    return r.json()
  },
  cms: async (collection, method = 'GET', body, id) => {
    const t = getAdminToken(); if (!t) return { error: 'no token' }
    const url = id ? `/api/admin/cms/${collection}/${id}` : `/api/admin/cms/${collection}`
    const r = await fetch(url, { method, headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined })
    return r.json()
  },
  upload: async (file, folder = 'gateplus/general') => {
    const t = getAdminToken(); if (!t) throw new Error('no token')
    // 1. get signature
    const isImage = file.type.startsWith('image/')
    const resourceType = isImage ? 'image' : 'auto'
    const sigRes = await fetch('/api/admin/upload-signature', {
      method: 'POST', headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ folder, resourceType }),
    })
    const sig = await sigRes.json()
    if (sig.error) throw new Error(sig.error)
    // 2. upload to cloudinary
    const fd = new FormData()
    fd.append('file', file)
    fd.append('api_key', sig.apiKey)
    fd.append('timestamp', sig.timestamp)
    fd.append('signature', sig.signature)
    fd.append('folder', sig.folder)
    const up = await fetch(sig.uploadUrl, { method: 'POST', body: fd })
    const data = await up.json()
    if (data.error) throw new Error(data.error.message || 'Upload failed')
    return { url: data.secure_url, publicId: data.public_id, format: data.format, bytes: data.bytes }
  },
}

// =================== ADMIN LOGIN MINI-FORM ===================
export function AdminLoginForm({ onAuth, onCancel }) {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setBusy(true)
    const r = await adminApi.login(email, pwd)
    setBusy(false)
    if (r.error) { toast.error(r.error); return }
    sessionStorage.setItem(ADMIN_KEY, r.token)
    toast.success(`Admin mode activated — ${r.admin.name}`)
    onAuth(r.admin)
  }
  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="text-xs font-bold tracking-widest text-[#A47148]">ADMIN SIGN IN</div>
      <Input type="email" placeholder="Admin email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Input type="password" placeholder="Password" value={pwd} onChange={(e) => setPwd(e.target.value)} required />
      <div className="flex gap-2">
        <Button type="submit" disabled={busy} className="btn-sunrise flex-1 h-11 rounded-xl">{busy ? '...' : 'Enter Admin Mode'}</Button>
        {onCancel && <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>}
      </div>
      <p className="text-xs text-[#6B5E52]">Default: admin@gateplus.local / admin123</p>
    </form>
  )
}

// =================== ADMIN FLOATING BAR ===================
export function AdminFloatingBar({ admin, onLogout }) {
  if (!admin) return null
  return (
    <div className="fixed bottom-20 lg:bottom-6 right-4 z-50">
      <div className="glass-dark rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-2xl text-white">
        <div className="w-7 h-7 rounded-lg sunrise-gradient flex items-center justify-center">
          <Shield className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="text-xs">
          <div className="font-bold tracking-wider text-[#FFB547]">ADMIN MODE</div>
          <div className="text-[10px] text-slate-300">{admin.email}</div>
        </div>
        <button onClick={onLogout} title="Exit admin mode" className="ml-2 text-slate-300 hover:text-white"><LogOut className="w-4 h-4" /></button>
      </div>
    </div>
  )
}

// =================== UPLOAD FIELD ===================
export function UploadField({ label, value, onChange, accept = 'image/*,application/pdf', folder = 'gateplus/general', maxMB = 25 }) {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const onFile = async (file) => {
    if (!file) return
    const isPdf = file.type === 'application/pdf'
    const isImg = file.type.startsWith('image/')
    if (!isPdf && !isImg) { toast.error('Only PDF or image files allowed'); return }
    if (isImg && file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return }
    if (isPdf && file.size > 25 * 1024 * 1024) { toast.error('PDF must be under 25MB'); return }
    setBusy(true); setProgress(20)
    try {
      const res = await adminApi.upload(file, folder)
      setProgress(100)
      onChange(res.url)
      toast.success('Uploaded')
    } catch (e) { toast.error(e.message || 'Upload failed') }
    setBusy(false); setTimeout(() => setProgress(0), 800)
  }
  return (
    <div>
      <Label className="text-xs font-semibold text-[#2A2A2A]">{label}</Label>
      <div className="mt-1 flex gap-2 items-start">
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
        <div className="flex-1">
          {value ? (
            <div className="flex items-center gap-2 p-2 rounded-lg border border-[#FFE5D0] bg-[#FFF8EE]">
              {value.match(/\.(jpg|jpeg|png|webp)/i) || value.includes('image/upload') ? (
                <img src={value} alt="" className="w-12 h-12 object-cover rounded" />
              ) : (
                <FileText className="w-6 h-6 text-[#FF7A18]" />
              )}
              <a href={value} target="_blank" rel="noreferrer" className="text-xs text-[#FF7A18] truncate flex-1">{value.split('/').slice(-1)[0]}</a>
              <button type="button" onClick={() => onChange('')} className="text-slate-400 hover:text-red-500"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <button type="button" onClick={() => ref.current?.click()} disabled={busy} className="w-full p-3 rounded-lg border-2 border-dashed border-[#FFE5D0] bg-[#FFF8EE]/50 hover:bg-[#FFE5D0]/30 transition text-sm text-[#6B5E52] flex items-center justify-center gap-2">
              <Upload className="w-4 h-4" />
              {busy ? `Uploading... ${progress}%` : `Click to upload (max ${maxMB}MB)`}
            </button>
          )}
          <Input className="mt-2 text-xs" placeholder="Or paste URL directly" value={value || ''} onChange={(e) => onChange(e.target.value)} />
        </div>
      </div>
    </div>
  )
}

// =================== CMS MODAL (generic) ===================
export function CmsModal({ open, onClose, title, schema, initial = {}, onSave, folder = 'gateplus/general' }) {
  const [form, setForm] = useState(initial)
  const [busy, setBusy] = useState(false)
  useEffect(() => { setForm(initial) }, [open])
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const save = async () => {
    setBusy(true)
    try {
      await onSave(form)
      onClose()
    } catch (e) { toast.error(e.message || 'Save failed') }
    setBusy(false)
  }
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle className="font-serif-display">{title}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {schema.map((field) => (
            <div key={field.name}>
              {field.type === 'text' && (
                <div>
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <Input className="mt-1" placeholder={field.placeholder} value={form[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} />
                </div>
              )}
              {field.type === 'number' && (
                <div>
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <Input type="number" className="mt-1" placeholder={field.placeholder} value={form[field.name] ?? ''} onChange={(e) => set(field.name, Number(e.target.value))} />
                </div>
              )}
              {field.type === 'textarea' && (
                <div>
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <textarea className="w-full mt-1 border border-[#FFE5D0] rounded-lg p-2 text-sm bg-white" rows={field.rows || 3} placeholder={field.placeholder} value={form[field.name] || ''} onChange={(e) => set(field.name, e.target.value)} />
                </div>
              )}
              {field.type === 'select' && (
                <div>
                  <Label className="text-xs font-semibold">{field.label}</Label>
                  <Select value={form[field.name] || ''} onValueChange={(v) => set(field.name, v)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder={field.placeholder} /></SelectTrigger>
                    <SelectContent>{field.options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              {field.type === 'switch' && (
                <label className="flex items-center gap-2 text-sm">
                  <Switch checked={!!form[field.name]} onCheckedChange={(v) => set(field.name, v)} />{field.label}
                </label>
              )}
              {field.type === 'upload' && (
                <UploadField label={field.label} value={form[field.name] || ''} onChange={(v) => set(field.name, v)} accept={field.accept} folder={folder} maxMB={field.maxMB} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={busy} className="btn-sunrise">{busy ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// =================== ADMIN CONTROLS WRAPPER ===================
export function AdminAddBtn({ onClick, label = 'Add' }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full sunrise-gradient text-white text-xs font-bold shadow-md hover:scale-105 transition">
      <Plus className="w-3.5 h-3.5" />{label}
    </button>
  )
}
export function AdminItemControls({ onEdit, onDelete }) {
  return (
    <div className="absolute top-2 right-2 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition">
      <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); onEdit() }} title="Edit" className="w-7 h-7 rounded-full bg-white shadow-md text-[#1A1A1A] hover:bg-[#FFE5D0] flex items-center justify-center">
        <Edit className="w-3.5 h-3.5" />
      </button>
      <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); if (confirm('Delete this item?')) onDelete() }} title="Delete" className="w-7 h-7 rounded-full bg-white shadow-md text-red-500 hover:bg-red-50 flex items-center justify-center">
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// =================== CMS SCHEMAS ===================
export const SCHEMAS = {
  books: {
    title: 'Book',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'title', type: 'text', label: 'Title', placeholder: 'GATE CS Made Easy 2027' },
      { name: 'author', type: 'text', label: 'Author / Publisher', placeholder: 'Made Easy' },
      { name: 'amazonUrl', type: 'text', label: 'Buy URL (Amazon)', placeholder: 'https://amazon.in/...' },
      { name: 'coverUrl', type: 'upload', label: 'Cover image', accept: 'image/*', maxMB: 5 },
    ],
    folder: 'gateplus/books',
  },
  pyqs: {
    title: 'PYQ Paper',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'year', type: 'number', label: 'Year', placeholder: '2026' },
      { name: 'shift', type: 'number', label: 'Shift', placeholder: '1' },
      { name: 'title', type: 'text', label: 'Title', placeholder: 'GATE CS 2026 Shift 1' },
      { name: 'paperUrl', type: 'upload', label: 'Paper PDF', accept: 'application/pdf', maxMB: 25 },
      { name: 'solutionUrl', type: 'upload', label: 'Solution PDF (optional)', accept: 'application/pdf', maxMB: 25 },
      { name: 'coverUrl', type: 'upload', label: 'Cover image (optional)', accept: 'image/*', maxMB: 5 },
    ],
    folder: 'gateplus/pyqs',
  },
  revision_sheets: {
    title: 'Revision Sheet',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'subject', type: 'text', label: 'Subject', placeholder: 'Operating Systems' },
      { name: 'topic', type: 'text', label: 'Topic (optional)', placeholder: 'Scheduling' },
      { name: 'title', type: 'text', label: 'Title', placeholder: 'OS Quick Revision Sheet' },
      { name: 'pdfUrl', type: 'upload', label: 'PDF', accept: 'application/pdf', maxMB: 25 },
      { name: 'coverUrl', type: 'upload', label: 'Cover image (optional)', accept: 'image/*', maxMB: 5 },
    ],
    folder: 'gateplus/sheets',
  },
  short_notes: {
    title: 'Short Notes',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'subject', type: 'text', label: 'Subject' },
      { name: 'topic', type: 'text', label: 'Topic (optional)' },
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'pdfUrl', type: 'upload', label: 'PDF', accept: 'application/pdf', maxMB: 25 },
      { name: 'coverUrl', type: 'upload', label: 'Cover image (optional)', accept: 'image/*', maxMB: 5 },
    ],
    folder: 'gateplus/notes',
  },
  videos: {
    title: 'Video',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'subject', type: 'text', label: 'Subject', placeholder: 'Algorithms' },
      { name: 'topic', type: 'text', label: 'Topic (optional)', placeholder: 'Dijkstra' },
      { name: 'title', type: 'text', label: 'Title', placeholder: 'Dijkstra explained in 20 min' },
      { name: 'youtubeUrl', type: 'text', label: 'YouTube URL', placeholder: 'https://youtube.com/watch?v=...' },
      { name: 'provider', type: 'select', label: 'Provider', options: [
        { value: 'GATE Wallah', label: 'GATE Wallah' },
        { value: 'Unacademy', label: 'Unacademy' },
        { value: 'Other', label: 'Other' },
      ] },
      { name: 'featured', type: 'switch', label: 'Featured' },
      { name: 'pinned', type: 'switch', label: 'Pinned' },
    ],
    folder: 'gateplus/videos',
  },
  mock_tests: {
    title: 'Mock Test',
    fields: [
      { name: 'branchCode', type: 'select', label: 'Branch', options: BRANCHES_LIST.map((b) => ({ value: b, label: b })) },
      { name: 'title', type: 'text', label: 'Title', placeholder: 'GATE CS Mock #1' },
      { name: 'durationMinutes', type: 'number', label: 'Duration (min)', placeholder: '180' },
      { name: 'questionCount', type: 'number', label: 'Questions', placeholder: '65' },
      { name: 'marks', type: 'number', label: 'Total marks', placeholder: '100' },
      { name: 'status', type: 'select', label: 'Status', options: [
        { value: 'live', label: 'Live (Start attempt)' },
        { value: 'coming_soon', label: 'Coming soon' },
      ] },
      { name: 'paperUrl', type: 'upload', label: 'Paper PDF (optional)', accept: 'application/pdf', maxMB: 25 },
      { name: 'coverUrl', type: 'upload', label: 'Cover image (optional)', accept: 'image/*', maxMB: 5 },
    ],
    folder: 'gateplus/mocks',
  },
}

// =================== CMS DRIVEN HOOKS ===================
export function useCmsList(collection, params = '') {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [v, setV] = useState(0)
  useEffect(() => {
    setLoading(true)
    fetch(`/api/cms/${collection}${params}`).then((r) => r.json()).then((d) => { setItems(d.items || []); setLoading(false) })
  }, [collection, params, v])
  return { items, loading, reload: () => setV((x) => x + 1) }
}
