'use client'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import { Shield, LogOut, Users, Quote, Megaphone, Youtube, BarChart3, Trash2, Star, Pin, Edit, Plus, KeyRound, Search } from 'lucide-react'

const ADMIN_KEY = 'gp_admin_token'

const adminFetch = async (path, opts = {}) => {
  const token = typeof window !== 'undefined' ? sessionStorage.getItem(ADMIN_KEY) : null
  const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) }
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`/api/admin${path}`, { ...opts, headers })
  if (res.status === 401) {
    if (typeof window !== 'undefined') sessionStorage.removeItem(ADMIN_KEY)
    return { error: 'Unauthorized' }
  }
  return res.json()
}

// ===== LOGIN =====
function AdminLogin({ onAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    setBusy(true)
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
      const data = await res.json()
      if (data.error) toast.error(data.error)
      else {
        sessionStorage.setItem(ADMIN_KEY, data.token)
        toast.success(`Welcome back, ${data.admin.name}`)
        onAuth(data.admin)
      }
    } catch { toast.error('Network error') }
    setBusy(false)
  }
  return (
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)' }}>
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full opacity-25" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 65%)' }} />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 65%)' }} />
      <Card className="relative w-full max-w-md p-8 card-luxe">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl sunrise-gradient flex items-center justify-center shadow-lg">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="text-xs font-bold tracking-widest text-[#A47148]">ADMIN PORTAL</div>
            <div className="font-serif-display text-xl font-bold text-[#1A1A1A]">GatePlus Console</div>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label className="text-xs font-bold tracking-wider text-[#2A2A2A]">EMAIL</Label>
            <Input className="mt-1 h-11" placeholder="admin@gateplus.local" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <Label className="text-xs font-bold tracking-wider text-[#2A2A2A]">PASSWORD</Label>
            <Input className="mt-1 h-11" placeholder="••••••••" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <Button type="submit" disabled={busy} className="btn-sunrise w-full h-11 rounded-xl font-semibold">{busy ? '...' : 'Sign in to Console'}</Button>
        </form>
        <div className="mt-5 p-3 rounded-lg bg-[#FFF8EE] border border-[#FFE5D0] text-xs text-[#6B5E52]">
          <b>Default credentials:</b> <code>admin@gateplus.local</code> / <code>admin123</code><br/>
          <span className="text-[#FF7A18] font-semibold">Change immediately after first login.</span>
        </div>
      </Card>
    </div>
  )
}

// ===== USERS =====
function UsersTab() {
  const [users, setUsers] = useState([])
  const [q, setQ] = useState('')
  const load = async () => { const r = await adminFetch(`/users?q=${encodeURIComponent(q)}`); setUsers(r.users || []) }
  useEffect(() => { load() }, [])
  const suspend = async (u, val) => {
    await adminFetch(`/users/${u.id}/suspend`, { method: 'POST', body: JSON.stringify({ suspended: val }) })
    toast.success(val ? 'User suspended' : 'User reactivated')
    load()
  }
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#A47148]" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && load()} placeholder="Search by email or username" className="pl-9 h-10" />
        </div>
        <Button onClick={load} className="btn-sunrise">Search</Button>
      </div>
      <Card className="card-luxe overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#FFF8EE]"><tr className="text-left text-[#A47148]">
            <th className="p-3 font-semibold">Username</th><th className="p-3 font-semibold">Email</th><th className="p-3 font-semibold">Branches</th><th className="p-3 font-semibold">Created</th><th className="p-3 font-semibold">Status</th><th className="p-3"></th>
          </tr></thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-[#FFE5D0]/70">
                <td className="p-3 font-medium text-[#1A1A1A]">{u.username}</td>
                <td className="p-3 text-[#6B5E52]">{u.email}</td>
                <td className="p-3"><div className="flex flex-wrap gap-1">{(u.branches || []).map((b) => <Badge key={b.branchCode} variant="outline" className="text-[10px]">{b.branchCode} '{String(b.targetYear).slice(-2)}</Badge>)}</div></td>
                <td className="p-3 text-xs text-[#6B5E52]">{new Date(u.createdAt).toLocaleDateString()}</td>
                <td className="p-3">{u.suspended ? <Badge className="bg-red-100 text-red-700">Suspended</Badge> : <Badge className="bg-emerald-100 text-emerald-700">Active</Badge>}</td>
                <td className="p-3 text-right">
                  <Button size="sm" variant={u.suspended ? 'default' : 'outline'} onClick={() => suspend(u, !u.suspended)}>
                    {u.suspended ? 'Reactivate' : 'Suspend'}
                  </Button>
                </td>
              </tr>
            ))}
            {users.length === 0 && <tr><td colSpan={6} className="p-8 text-center text-[#A47148]">No users found.</td></tr>}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// ===== QUOTES =====
function QuotesTab() {
  const [quotes, setQuotes] = useState([])
  const [text, setText] = useState('')
  const [author, setAuthor] = useState('')
  const [featured, setFeatured] = useState(false)
  const load = async () => { const r = await adminFetch('/quotes'); setQuotes(r.quotes || []) }
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!text.trim()) return toast.error('Add quote text')
    await adminFetch('/quotes', { method: 'POST', body: JSON.stringify({ text, author, featured }) })
    toast.success('Quote added')
    setText(''); setAuthor(''); setFeatured(false); load()
  }
  const patch = async (id, body) => { await adminFetch(`/quotes/${id}`, { method: 'PATCH', body: JSON.stringify(body) }); load() }
  const del = async (id) => { if (!confirm('Delete quote?')) return; await adminFetch(`/quotes/${id}`, { method: 'DELETE' }); toast.success('Deleted'); load() }
  return (
    <div className="space-y-4">
      <Card className="card-luxe p-5">
        <h3 className="font-bold text-[#1A1A1A] mb-3">Add quote</h3>
        <textarea className="w-full border border-[#FFE5D0] rounded-lg p-3 text-sm bg-white" rows={2} placeholder="Quote text" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="flex gap-3 mt-3 items-center">
          <Input placeholder="Author" value={author} onChange={(e) => setAuthor(e.target.value)} className="max-w-xs" />
          <label className="flex items-center gap-2 text-sm text-[#2A2A2A]"><Switch checked={featured} onCheckedChange={setFeatured} />Featured</label>
          <Button onClick={add} className="btn-sunrise ml-auto"><Plus className="w-4 h-4 mr-1" />Add quote</Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {quotes.map((q) => (
          <Card key={q.id} className="card-luxe p-4">
            <div className="flex items-start gap-2">
              <Quote className="w-5 h-5 text-[#FF7A18] shrink-0" />
              <div className="flex-1">
                <p className="text-sm text-[#1A1A1A]">"{q.text}"</p>
                <p className="text-xs text-[#6B5E52] mt-1">— {q.author}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <label className="flex items-center gap-1"><Switch checked={!!q.active} onCheckedChange={(v) => patch(q.id, { active: v })} /> Active</label>
              <label className="flex items-center gap-1"><Switch checked={!!q.featured} onCheckedChange={(v) => patch(q.id, { featured: v })} /> Featured</label>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => del(q.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </Card>
        ))}
        {quotes.length === 0 && <Card className="card-luxe p-8 text-center text-[#A47148] md:col-span-2">No quotes yet. Add one above.</Card>}
      </div>
    </div>
  )
}

// ===== ANNOUNCEMENTS =====
function AnnouncementsTab() {
  const [list, setList] = useState([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tone, setTone] = useState('info')
  const [pinned, setPinned] = useState(false)
  const load = async () => { const r = await adminFetch('/announcements'); setList(r.announcements || []) }
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!title.trim()) return toast.error('Title required')
    await adminFetch('/announcements', { method: 'POST', body: JSON.stringify({ title, body, tone, pinned }) })
    toast.success('Announcement created')
    setTitle(''); setBody(''); setTone('info'); setPinned(false); load()
  }
  const patch = async (id, b) => { await adminFetch(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(b) }); load() }
  const del = async (id) => { if (!confirm('Delete?')) return; await adminFetch(`/announcements/${id}`, { method: 'DELETE' }); load() }
  const toneColor = (t) => ({ info: 'bg-blue-100 text-blue-700', success: 'bg-emerald-100 text-emerald-700', warn: 'bg-amber-100 text-amber-700', critical: 'bg-red-100 text-red-700' })[t] || 'bg-slate-100'
  return (
    <div className="space-y-4">
      <Card className="card-luxe p-5">
        <h3 className="font-bold text-[#1A1A1A] mb-3">New announcement</h3>
        <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className="w-full border border-[#FFE5D0] rounded-lg p-3 text-sm bg-white mt-2" rows={3} placeholder="Body (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
        <div className="flex gap-3 mt-3 items-center flex-wrap">
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="info">Info</SelectItem><SelectItem value="success">Success</SelectItem><SelectItem value="warn">Warning</SelectItem><SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm"><Switch checked={pinned} onCheckedChange={setPinned} />Pinned</label>
          <Button onClick={add} className="btn-sunrise ml-auto"><Plus className="w-4 h-4 mr-1" />Publish</Button>
        </div>
      </Card>
      <div className="space-y-2">
        {list.map((a) => (
          <Card key={a.id} className="card-luxe p-4">
            <div className="flex items-start gap-3">
              <Megaphone className="w-5 h-5 text-[#FF7A18] shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#1A1A1A]">{a.title}</span>
                  <Badge className={`text-[10px] ${toneColor(a.tone)}`}>{a.tone}</Badge>
                  {a.pinned && <Badge variant="outline" className="text-[10px]"><Pin className="w-3 h-3 mr-0.5" />pinned</Badge>}
                </div>
                {a.body && <p className="text-sm text-[#6B5E52] mt-1">{a.body}</p>}
                <div className="text-[11px] text-[#A47148] mt-1">{new Date(a.createdAt).toLocaleString()}</div>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <label className="flex items-center gap-1"><Switch checked={!!a.active} onCheckedChange={(v) => patch(a.id, { active: v })} />Active</label>
                <label className="flex items-center gap-1"><Switch checked={!!a.pinned} onCheckedChange={(v) => patch(a.id, { pinned: v })} />Pin</label>
                <Button size="sm" variant="outline" onClick={() => del(a.id)}><Trash2 className="w-3 h-3" /></Button>
              </div>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="card-luxe p-8 text-center text-[#A47148]">No announcements yet.</Card>}
      </div>
    </div>
  )
}

// ===== YOUTUBE =====
function YoutubeTab() {
  const [list, setList] = useState([])
  const [title, setTitle] = useState('')
  const [urlV, setUrlV] = useState('')
  const [category, setCategory] = useState('')
  const [branchCode, setBranchCode] = useState('CS')
  const [pinned, setPinned] = useState(false)
  const [featured, setFeatured] = useState(false)
  const load = async () => { const r = await adminFetch('/youtube'); setList(r.videos || []) }
  useEffect(() => { load() }, [])
  const add = async () => {
    if (!title.trim() || !urlV.trim()) return toast.error('Title and URL required')
    await adminFetch('/youtube', { method: 'POST', body: JSON.stringify({ title, url: urlV, category, branchCode, pinned, featured }) })
    toast.success('Video added'); setTitle(''); setUrlV(''); setCategory(''); load()
  }
  const patch = async (id, b) => { await adminFetch(`/youtube/${id}`, { method: 'PATCH', body: JSON.stringify(b) }); load() }
  const del = async (id) => { if (!confirm('Delete?')) return; await adminFetch(`/youtube/${id}`, { method: 'DELETE' }); load() }
  return (
    <div className="space-y-4">
      <Card className="card-luxe p-5">
        <h3 className="font-bold text-[#1A1A1A] mb-3">Add YouTube video</h3>
        <div className="grid md:grid-cols-2 gap-3">
          <Input placeholder="Title (e.g. Dijkstra in 20 minutes)" value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input placeholder="https://youtube.com/watch?v=..." value={urlV} onChange={(e) => setUrlV(e.target.value)} />
          <Input placeholder="Category (Algorithms, OS, ...)" value={category} onChange={(e) => setCategory(e.target.value)} />
          <Select value={branchCode} onValueChange={setBranchCode}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{['CS', 'DA', 'ECE', 'EE', 'ME', 'CE'].map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex gap-4 mt-3 items-center">
          <label className="flex items-center gap-2 text-sm"><Switch checked={featured} onCheckedChange={setFeatured} />Featured</label>
          <label className="flex items-center gap-2 text-sm"><Switch checked={pinned} onCheckedChange={setPinned} />Pinned</label>
          <Button onClick={add} className="btn-sunrise ml-auto"><Plus className="w-4 h-4 mr-1" />Add</Button>
        </div>
      </Card>
      <div className="grid md:grid-cols-2 gap-3">
        {list.map((v) => (
          <Card key={v.id} className="card-luxe p-4">
            <div className="flex items-start gap-3">
              <Youtube className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="font-semibold text-[#1A1A1A]">{v.title}</div>
                <a href={v.url} target="_blank" rel="noreferrer" className="text-xs text-[#FF7A18] break-all">{v.url}</a>
                <div className="text-xs text-[#A47148] mt-1">{v.branchCode} · {v.category}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs">
              <label className="flex items-center gap-1"><Switch checked={!!v.featured} onCheckedChange={(va) => patch(v.id, { featured: va })} />Featured</label>
              <label className="flex items-center gap-1"><Switch checked={!!v.pinned} onCheckedChange={(va) => patch(v.id, { pinned: va })} />Pin</label>
              <Button size="sm" variant="outline" className="ml-auto" onClick={() => del(v.id)}><Trash2 className="w-3 h-3" /></Button>
            </div>
          </Card>
        ))}
        {list.length === 0 && <Card className="card-luxe p-8 text-center text-[#A47148] md:col-span-2">No videos yet.</Card>}
      </div>
    </div>
  )
}

// ===== ANALYTICS =====
function AnalyticsTab() {
  const [data, setData] = useState(null)
  useEffect(() => { adminFetch('/analytics').then(setData) }, [])
  if (!data || !data.totals) return <div className="text-[#A47148]">Loading…</div>
  const Tile = ({ label, value, sub }) => (
    <Card className="card-luxe p-5">
      <div className="text-[10px] font-bold tracking-widest text-[#A47148]">{label}</div>
      <div className="font-serif-display text-3xl font-bold text-[#1A1A1A] mt-2">{value}</div>
      {sub && <div className="text-xs text-[#6B5E52] mt-1">{sub}</div>}
    </Card>
  )
  const t = data.totals
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Tile label="TOTAL USERS" value={t.users} />
        <Tile label="ACTIVE 24H" value={t.activeUsers} />
        <Tile label="SESSIONS" value={t.sessions} />
        <Tile label="POSTS" value={t.posts} />
        <Tile label="TOTAL MINUTES" value={t.minutes.toLocaleString()} sub={`${Math.round(t.minutes/60)}h studied`} />
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="card-luxe p-5">
          <h3 className="font-bold text-[#1A1A1A] mb-3">Users by Branch</h3>
          <div className="space-y-2">
            {Object.entries(data.byBranch).map(([k, v]) => (
              <div key={k}>
                <div className="flex justify-between text-xs"><span>{k}</span><span className="font-semibold">{v}</span></div>
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full sunrise-gradient" style={{ width: `${Math.min(100, (v / Math.max(1, t.users)) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="card-luxe p-5">
          <h3 className="font-bold text-[#1A1A1A] mb-3">Recent admin activity</h3>
          <div className="space-y-1 max-h-72 overflow-y-auto">
            {data.auditLog.map((a) => (
              <div key={a.id} className="text-xs flex justify-between border-b border-[#FFE5D0]/70 py-1">
                <span className="text-[#2A2A2A]">{a.action}</span>
                <span className="text-[#A47148]">{new Date(a.createdAt).toLocaleTimeString()}</span>
              </div>
            ))}
            {data.auditLog.length === 0 && <div className="text-sm text-[#A47148]">No activity yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ===== PASSWORD CHANGE =====
function PasswordChange() {
  const [open, setOpen] = useState(false)
  const [pwd, setPwd] = useState('')
  const change = async () => {
    if (pwd.length < 6) return toast.error('At least 6 characters')
    const r = await adminFetch('/password', { method: 'PATCH', body: JSON.stringify({ newPassword: pwd }) })
    if (r.ok) { toast.success('Password changed'); setOpen(false); setPwd('') }
    else toast.error(r.error || 'Failed')
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm"><KeyRound className="w-4 h-4 mr-1" />Change password</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Change admin password</DialogTitle></DialogHeader>
        <Input type="password" placeholder="New password (min 6 chars)" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        <DialogFooter><Button onClick={change} className="btn-sunrise">Update</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== MAIN =====
function AdminApp() {
  const [admin, setAdmin] = useState(null)
  const [loaded, setLoaded] = useState(false)
  const [tab, setTab] = useState('analytics')
  useEffect(() => {
    const token = sessionStorage.getItem(ADMIN_KEY)
    if (!token) { setLoaded(true); return }
    adminFetch('/me').then((r) => { if (r.admin) setAdmin(r.admin); setLoaded(true) })
  }, [])
  const logout = () => { sessionStorage.removeItem(ADMIN_KEY); setAdmin(null) }
  if (!loaded) return <div className="min-h-screen flex items-center justify-center text-[#A47148]">Loading…</div>
  if (!admin) return (<><Toaster richColors /><AdminLogin onAuth={setAdmin} /></>)
  return (
    <div className="min-h-screen">
      <Toaster richColors position="top-right" />
      <div className="sticky top-0 z-30 px-3 pt-3">
        <div className="container mx-auto">
          <div className="glass rounded-2xl px-4 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl sunrise-gradient flex items-center justify-center shadow-md">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[10px] font-bold tracking-widest text-[#A47148]">ADMIN CONSOLE</div>
                <div className="font-serif-display text-lg font-bold text-[#1A1A1A]">Gate<span className="sunrise-text">Plus</span></div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#FFF8EE] border border-[#FFE5D0] text-xs">
                <span className="text-[#A47148]">{admin.email}</span>
                <Badge className="bg-[#FFE5D0] text-[#A47148] text-[10px]">{admin.role}</Badge>
              </div>
              <PasswordChange />
              <Button size="sm" variant="outline" onClick={logout}><LogOut className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      </div>
      <main className="container mx-auto px-3 py-6 fade-up">
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-white/70 border border-[#FFE5D0] shadow-sm">
            <TabsTrigger value="analytics"><BarChart3 className="w-4 h-4 mr-1.5" />Analytics</TabsTrigger>
            <TabsTrigger value="users"><Users className="w-4 h-4 mr-1.5" />Users</TabsTrigger>
            <TabsTrigger value="quotes"><Quote className="w-4 h-4 mr-1.5" />Quotes</TabsTrigger>
            <TabsTrigger value="announcements"><Megaphone className="w-4 h-4 mr-1.5" />Announcements</TabsTrigger>
            <TabsTrigger value="youtube"><Youtube className="w-4 h-4 mr-1.5" />YouTube</TabsTrigger>
          </TabsList>
          <div className="mt-5">
            <TabsContent value="analytics"><AnalyticsTab /></TabsContent>
            <TabsContent value="users"><UsersTab /></TabsContent>
            <TabsContent value="quotes"><QuotesTab /></TabsContent>
            <TabsContent value="announcements"><AnnouncementsTab /></TabsContent>
            <TabsContent value="youtube"><YoutubeTab /></TabsContent>
          </div>
        </Tabs>
      </main>
    </div>
  )
}

export default AdminApp
