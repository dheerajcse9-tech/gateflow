'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import {
  BookOpen, Calendar, Flame, Target, Clock, Eye, EyeOff, Mail, Lock,
  ChevronDown, Plus, Play, Pause, RotateCcw, Check, Trophy, Users, Sparkles,
  TrendingUp, BarChart3, Search, GraduationCap, Headphones, Settings as SettingsIcon,
  LogOut, ArrowUpRight, Star, MessageSquare, FileText, Youtube, Video,
  Quote, Megaphone,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'

const CHART_COLORS = ['#FF7A18', '#FFB547', '#FFC857', '#A47148', '#FF6B6B', '#2BBF7E', '#1A1A1A', '#FFE5D0', '#F6A65A', '#D97706', '#8B5CF6', '#06B6D4']

const BRANCHES = [
  { code: 'CS', name: 'Computer Science & IT', short: 'Computer Science' },
  { code: 'DA', name: 'Data Science & AI', short: 'Data Science & AI' },
  { code: 'ECE', name: 'Electronics & Communication', short: 'Electronics' },
  { code: 'EE', name: 'Electrical Engineering', short: 'Electrical' },
  { code: 'ME', name: 'Mechanical Engineering', short: 'Mechanical' },
  { code: 'CE', name: 'Civil Engineering', short: 'Civil' },
]
const TARGET_DATES = { 2026: '2026-02-07', 2027: '2027-02-06', 2028: '2028-02-05' }

const api = {
  signup: (d) => fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  login: (d) => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  me: (id) => fetch(`/api/user/me?userId=${id}`).then((r) => r.json()),
  topics: (branch = 'CS') => fetch(`/api/topics?branch=${branch}`).then((r) => r.json()),
  complete: (d) => fetch('/api/topics/complete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  uncomplete: (d) => fetch('/api/topics/complete', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  revise: (d) => fetch('/api/topics/revise', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  logSession: (d) => fetch('/api/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  snapshot: (id, branch) => fetch(`/api/stats/snapshot?userId=${id}&branch=${branch}`).then((r) => r.json()),
  heatmap: (id) => fetch(`/api/stats/heatmap?userId=${id}`).then((r) => r.json()),
  users: () => fetch('/api/stats/users').then((r) => r.json()),
  roi: (id, branch) => fetch(`/api/stats/roi?userId=${id}&branch=${branch}`).then((r) => r.json()),
  activity: () => fetch('/api/activity/recent').then((r) => r.json()),
  leaderboard: (branch) => fetch(`/api/community/leaderboard?branch=${branch}`).then((r) => r.json()),
  posts: () => fetch('/api/community/posts').then((r) => r.json()),
  newPost: (d) => fetch('/api/community/posts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  goal: (d) => fetch('/api/user/goal', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  switchBranch: (d) => fetch('/api/user/branch/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  addBranch: (d) => fetch('/api/user/branch/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
}

// =================== AUTH SCREEN ===================
function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [branch, setBranch] = useState('CS')
  const [year, setYear] = useState('2027')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!email || !password) return toast.error('Please fill all fields')
    if (password.length < 6) return toast.error('Password must be at least 6 characters')
    setLoading(true)
    try {
      const res = mode === 'signup'
        ? await api.signup({ email, password, branchCode: branch, targetYear: Number(year) })
        : await api.login({ email, password })
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success(mode === 'signup' ? `Welcome, ${res.user.username}!` : 'Signed in')
        onAuth(res.user)
      }
    } catch (err) {
      toast.error('Network error')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex">
      {/* Left brand panel */}
      <div className="hidden lg:flex flex-col justify-between w-3/5 p-12 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,#1A1A1A 0%,#2A2A2A 100%)', color: 'white' }}>
        <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 70%)' }} />
        <div className="absolute -bottom-40 -left-32 w-[500px] h-[500px] rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 70%)' }} />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center sunrise-gradient">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <span className="font-serif-display text-xl font-bold">GatePlus</span>
        </div>
        <div className="relative">
          <div className="w-28 h-28 rounded-2xl flex items-center justify-center mb-8 sunrise-gradient float-glow">
            <span className="font-serif-display text-5xl font-bold text-white">G+</span>
          </div>
          <h1 className="font-serif-display text-5xl font-bold leading-tight mb-3">Crack GATE with<br/><span className="sunrise-text">Consistency.</span></h1>
          <p className="text-lg" style={{ color: '#FFE5D0' }}>One platform. One goal. AIR.</p>
          <div className="mt-10 space-y-5">
            {[
              [BarChart3, 'Smart Study Tracking', 'Track study hours, topics, and progress in real time.'],
              [Calendar, 'Heatmaps & Analytics', 'Visualize your consistency and performance trends.'],
              [BookOpen, 'PYQs & Resources', 'Access chapter-wise PYQs, notes, and revision docs.'],
              [Users, 'Doubt Solving Community', 'Get your doubts solved by peers and experts.'],
              [Trophy, 'Leaderboards & Contests', 'Compete with aspirants across India.'],
            ].map(([Icon, title, sub], i) => (
              <div key={i} className="flex gap-3 items-start fade-up" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(255,181,71,0.12)', border: '1px solid rgba(255,181,71,0.25)' }}>
                  <Icon className="w-4 h-4" style={{ color: '#FFB547' }} />
                </div>
                <div>
                  <div className="font-semibold">{title}</div>
                  <div className="text-sm" style={{ color: '#B8A89A' }}>{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-sm" style={{ color: '#B8A89A' }}>© GatePlus — India's most elegant GATE prep experience</div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-[#FFFDF8]">
        <Card className="w-full max-w-md p-8 shadow-xl">
          <h2 className="font-serif-display text-2xl font-bold text-center text-[#1A1A1A]">
            {mode === 'signup' ? 'Create your GatePlus account' : 'Welcome back to GatePlus'}
          </h2>
          <p className="text-center text-sm text-slate-500 mt-1 mb-6">
            {mode === 'signup' ? "Let's personalize your preparation experience." : 'Sign in to continue your GATE preparation.'}
          </p>
          <form onSubmit={submit} className="space-y-4">
            <div>
              <Label className="text-xs font-semibold text-slate-700">EMAIL ADDRESS</Label>
              <div className="relative mt-1">
                <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9" placeholder="Enter your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-slate-700">PASSWORD</Label>
              <div className="relative mt-1">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input className="pl-9 pr-9" placeholder="Minimum 6 characters" type={showPwd ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {mode === 'signup' && (
              <>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">BRANCH</Label>
                  <Select value={branch} onValueChange={setBranch}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {BRANCHES.map((b) => <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs font-semibold text-slate-700">TARGET EXAM YEAR</Label>
                  <Select value={year} onValueChange={setYear}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">GATE 2026</SelectItem>
                      <SelectItem value="2027">GATE 2027</SelectItem>
                      <SelectItem value="2028">GATE 2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <Button type="submit" disabled={loading} className="w-full btn-sunrise h-12 text-base rounded-xl font-semibold">
              {loading ? '...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </Button>
          </form>
          <div className="my-5 border-t border-slate-200" />
          <p className="text-sm text-center text-slate-600">
            {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
            <button onClick={() => setMode(mode === 'signup' ? 'login' : 'signup')} className="font-bold text-[#1A1A1A] hover:underline">
              {mode === 'signup' ? 'Sign In' : 'Create an account'}
            </button>
          </p>
          <p className="text-xs text-center text-slate-400 mt-4">🛡 Your data is secure and encrypted</p>
        </Card>
      </div>
    </div>
  )
}

// =================== ANNOUNCEMENT BANNER ===================
function AnnouncementBanner() {
  const [items, setItems] = useState([])
  const [dismissed, setDismissed] = useState({})
  useEffect(() => {
    fetch('/api/content/announcements').then((r) => r.json()).then((d) => setItems(d.announcements || []))
    try {
      const d = JSON.parse(sessionStorage.getItem('gp_dismissed_ann') || '{}')
      setDismissed(d)
    } catch {}
  }, [])
  const visible = items.filter((a) => !dismissed[a.id])
  if (!visible.length) return null
  const tone = (t) => ({
    info: 'from-blue-500/90 to-indigo-500/90',
    success: 'from-emerald-500/90 to-teal-500/90',
    warn: 'from-amber-500/90 to-orange-500/90',
    critical: 'from-red-500/90 to-rose-500/90',
  })[t] || 'from-[#FF7A18] to-[#FFB547]'
  return (
    <div className="space-y-2 px-3 pt-3">
      {visible.map((a) => (
        <div key={a.id} className={`container mx-auto rounded-2xl p-4 text-white shadow-lg bg-gradient-to-r ${tone(a.tone)} flex items-start gap-3`}>
          <Megaphone className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold">{a.title}</div>
            {a.body && <div className="text-sm opacity-95 mt-0.5">{a.body}</div>}
          </div>
          <button onClick={() => { const d = { ...dismissed, [a.id]: 1 }; setDismissed(d); sessionStorage.setItem('gp_dismissed_ann', JSON.stringify(d)) }} className="text-white/90 hover:text-white text-xl leading-none px-2">×</button>
        </div>
      ))}
    </div>
  )
}

function DynamicQuote() {
  const [quote, setQuote] = useState(null)
  useEffect(() => { fetch('/api/content/quote').then((r) => r.json()).then((d) => setQuote(d.quote)) }, [])
  if (!quote) return null
  return (
    <section className="rounded-3xl p-8 card-luxe relative overflow-hidden">
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 65%)' }} />
      <div className="relative flex items-start gap-4">
        <div className="w-12 h-12 rounded-2xl sunrise-gradient flex items-center justify-center shadow-lg shrink-0">
          <Quote className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-serif-display text-2xl md:text-3xl font-bold text-[#1A1A1A] leading-snug">"{quote.text}"</p>
          <p className="text-sm text-[#A47148] mt-2 font-semibold tracking-wider uppercase">— {quote.author}</p>
        </div>
      </div>
    </section>
  )
}

// =================== TOP BAR (Countdown) ===================
function TopBar({ user, activeBranch }) {
  const target = TARGET_DATES[activeBranch?.targetYear || 2027]
  const [tick, setTick] = useState(Date.now())
  useEffect(() => { const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t) }, [])
  const diff = useMemo(() => {
    const ms = new Date(target).getTime() - tick
    const total = Math.max(0, ms)
    const days = Math.floor(total / 86400000)
    const hrs = Math.floor((total % 86400000) / 3600000)
    const min = Math.floor((total % 3600000) / 60000)
    const sec = Math.floor((total % 60000) / 1000)
    return { days, hrs, min, sec }
  }, [tick, target])
  const targetLabel = new Date(target).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return (
    <div className="w-full" style={{ background: '#1A1A1A', color: 'white' }}>
      <div className="container mx-auto px-4 py-2 flex items-center justify-center gap-3 text-sm flex-wrap">
        <Calendar className="w-4 h-4" style={{ color: '#FFB547' }} />
        <span className="text-slate-300">GATE {activeBranch?.branchCode || 'CS'} {activeBranch?.targetYear || 2027} IN</span>
        <span className="font-mono-digits font-bold" style={{ color: '#FFB547' }}>{diff.days}</span><span className="text-slate-400">DAYS</span>
        <span className="font-mono-digits font-bold" style={{ color: '#FFB547' }}>{String(diff.hrs).padStart(2, '0')}</span><span className="text-slate-400">HRS</span>
        <span className="font-mono-digits font-bold" style={{ color: '#FFB547' }}>{String(diff.min).padStart(2, '0')}</span><span className="text-slate-400">MIN</span>
        <span className="font-mono-digits font-bold" style={{ color: '#FFB547' }}>{String(diff.sec).padStart(2, '0')}</span><span className="text-slate-400">SEC</span>
        <span className="hidden md:inline text-slate-400 ml-3">Target: {targetLabel}</span>
      </div>
    </div>
  )
}

// =================== ACTIVITY TICKER ===================
function ActivityTicker() {
  const [events, setEvents] = useState([])
  const [stats, setStats] = useState({ total: 1317 })
  useEffect(() => {
    const load = async () => {
      const r = await api.activity().catch(() => ({ events: [] }))
      setEvents(r.events || [])
      const s = await api.users().catch(() => ({ total: 1317 }))
      setStats(s)
    }
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])
  const items = []
  events.forEach((e) => items.push({ type: 'evt', data: e }))
  items.push({ type: 'stat', data: stats })
  if (items.length < 5) {
    items.push({ type: 'evt', data: { username: 'ayushmodi.cse27_105', branchCode: 'cs', action: 'completed', subject: 'Computer Networks', topic: 'Sliding window — Go-Back-N', xpEarned: 20 } })
    items.push({ type: 'evt', data: { username: 'DavidRaj', branchCode: 'cs', action: 'revised', subject: 'Discrete Math', topic: 'Sets & relations', xpEarned: 20 } })
    items.push({ type: 'evt', data: { username: 'priya_ecewallah', branchCode: 'ece', action: 'completed', subject: 'Signals', topic: 'Convolution', xpEarned: 20 } })
  }
  const seq = [...items, ...items]
  return (
    <div className="w-full overflow-hidden border-y" style={{ background: '#2A2A2A', borderColor: '#1E3250' }}>
      <div className="animate-marquee py-2 text-[13px]" style={{ color: '#A0AEC0' }}>
        {seq.map((it, i) => (
          <span key={i} className="px-6 inline-flex items-center gap-2 shrink-0">
            {it.type === 'evt' ? (
              <>
                <Star className="w-3 h-3" style={{ color: '#FFB547' }} />
                <span className="text-white font-medium">{it.data.username}</span>
                <span className="text-slate-500 lowercase">{it.data.branchCode}</span>
                <span>{it.data.action}</span>
                <span className="text-white">{it.data.subject}::{it.data.topic}</span>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: '#EAB30822', color: '#EAB308' }}>+{it.data.xpEarned} XP</span>
                <span className="text-slate-600">|</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3 h-3" style={{ color: '#FF7A18' }} />
                <span>{(it.data.total || 1317).toLocaleString()} GATE aspirants are preparing on GatePlus across CS, DA, EC, EE, ME &amp; CE</span>
                <span className="text-slate-600">|</span>
              </>
            )}
          </span>
        ))}
      </div>
    </div>
  )
}

// =================== NAV BAR ===================
const NAV_ITEMS = [
  { name: 'Home', icon: Sparkles },
  { name: 'Weightage', icon: TrendingUp },
  { name: 'Progress', icon: Check },
  { name: 'Revision', icon: RotateCcw },
  { name: 'Dashboard', icon: BarChart3 },
  { name: 'Community', icon: Users },
  { name: 'Resources', icon: BookOpen },
  { name: 'PYQs', icon: FileText },
  { name: 'Mock Tests', icon: Trophy },
]

function NavBar({ user, page, setPage, activeBranch, onSwitchBranch, onLogout, onAddBranch }) {
  return (
    <div className="w-full sticky top-3 z-30 px-3">
      <div className="container mx-auto">
        <div className="glass rounded-2xl shadow-[0_10px_40px_-12px_rgba(255,122,24,0.18)] px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <button onClick={() => setPage('Home')} className="flex items-center gap-2 group">
              <div className="w-9 h-9 rounded-xl sunrise-gradient flex items-center justify-center shadow-md group-hover:scale-105 transition">
                <Headphones className="w-4 h-4 text-white" />
              </div>
              <span className="font-serif-display text-lg font-bold text-[#1A1A1A] hidden sm:block">Gate<span className="sunrise-text">Plus</span></span>
            </button>
            <Select value={activeBranch?.branchCode} onValueChange={onSwitchBranch}>
              <SelectTrigger className="h-9 w-auto border-[#FFE5D0] bg-[#FFF8EE] text-xs font-bold rounded-full px-3">
                <SelectValue>{activeBranch?.branchCode} '{String(activeBranch?.targetYear || 27).slice(-2)}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {user.branches.map((b) => (
                  <SelectItem key={b.branchCode} value={b.branchCode}>{b.branchCode} '{String(b.targetYear).slice(-2)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <nav className="hidden xl:flex items-center gap-1">
            {NAV_ITEMS.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setPage(name)} className={`px-3 py-1.5 rounded-xl text-sm font-medium transition flex items-center gap-1.5 ${page === name ? 'sunrise-gradient text-white shadow-md' : 'text-[#2A2A2A] hover:bg-[#FFE5D0]/60'}`}>
                <Icon className="w-3.5 h-3.5" />
                <span>{name}</span>
              </button>
            ))}
          </nav>
          <nav className="hidden lg:flex xl:hidden items-center gap-0.5">
            {NAV_ITEMS.map(({ name, icon: Icon }) => (
              <button key={name} onClick={() => setPage(name)} title={name} className={`w-9 h-9 rounded-xl transition flex items-center justify-center ${page === name ? 'sunrise-gradient text-white shadow-md' : 'text-[#2A2A2A] hover:bg-[#FFE5D0]/60'}`}>
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-[#FFF8EE] text-[#FF7A18] border border-[#FFE5D0]">
              <Flame className="w-3 h-3" />{activeBranch?.streak || 0}d
            </div>
            <button onClick={() => setPage('Settings')} className="w-9 h-9 rounded-full sunrise-gradient flex items-center justify-center text-xs font-bold text-white shadow-md">
              {user.username[0].toUpperCase()}
            </button>
            <button onClick={onLogout} className="hidden md:flex w-9 h-9 rounded-full hover:bg-[#FFE5D0]/60 items-center justify-center text-[#2A2A2A]" title="Sign out"><LogOut className="w-4 h-4" /></button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BottomNav({ page, setPage }) {
  const items = [
    { name: 'Home', icon: Sparkles },
    { name: 'Progress', icon: Check },
    { name: 'Dashboard', icon: BarChart3 },
    { name: 'Community', icon: Users },
    { name: 'Settings', icon: SettingsIcon },
  ]
  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
      <div className="glass rounded-2xl shadow-[0_10px_40px_-8px_rgba(255,122,24,0.25)] px-2 py-2 flex items-center justify-around">
        {items.map(({ name, icon: Icon }) => {
          const active = page === name
          return (
            <button key={name} onClick={() => setPage(name)} className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition ${active ? 'sunrise-gradient text-white shadow-md' : 'text-[#2A2A2A]'}`}>
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{name}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// =================== HOME PAGE ===================
function HomePage({ user, activeBranch, snapshot, heatmap, onTopicComplete, onRefresh, setPage }) {
  const goal = user.dailyGoalMinutes || 360
  const studied = snapshot.totalMinutes || 0
  const pct = Math.min(100, Math.round((studied / goal) * 100))
  const remain = Math.max(0, goal - studied)
  const today = new Date()
  const dateLabel = today.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      {/* Hero */}
      <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden card-luxe">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 65%)' }} />
        <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 65%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 bg-white/70 border border-[#FFE5D0] text-[#A47148]">
            <Trophy className="w-3 h-3 text-[#FF7A18]" /> Target: AIR &lt; 500 · GATE {activeBranch.branchCode} {activeBranch.targetYear}
          </div>
          <h1 className="font-serif-display text-5xl md:text-6xl font-bold leading-[1.05] text-[#1A1A1A]">
            GatePlus — <br className="hidden md:block" /><span className="italic sunrise-text">Discipline Se AIR Tak</span>
          </h1>
          <p className="mt-5 text-lg font-medium text-[#2A2A2A]">One platform. One goal. AIR.</p>
          <p className="mt-2 max-w-2xl text-[#6B5E52]">
            Countdown, study timer, streaks, XP rewards, progress analytics, priority topics, leaderboards, and a doubt-solving community — everything you need to stay consistent until exam day.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button onClick={() => setPage('Progress')} className="btn-sunrise px-5 py-2.5 rounded-xl font-semibold text-sm">Start tracking →</button>
            <button onClick={() => setPage('Weightage')} className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/80 border border-[#FFE5D0] text-[#2A2A2A] hover:bg-white">See ROI engine</button>
          </div>
        </div>
      </div>

      {/* Today's snapshot */}
      <section>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Today&apos;s Snapshot</h2>
          <span className="text-sm text-slate-500">{dateLabel}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={<Clock className="w-4 h-4" />} label="STUDIED TODAY" value={`${Math.floor(studied/60)}h ${studied%60}m`} sub={`${snapshot.sessions || 0} sessions`} />
          <StatCard icon={<BookOpen className="w-4 h-4" />} label="SUBJECTS TOUCHED" value={String(snapshot.subjectsTouched || 0)} sub="across today's sessions" />
          <StatCard icon={<Target className="w-4 h-4" />} label="DAILY GOAL" value={`${Math.floor(goal/60)}h`} sub={`Remaining: ${Math.floor(remain/60)}h ${remain%60}m`} />
          <StatCard icon={<Flame className="w-4 h-4" />} label="STREAK" value={`${snapshot.streak || 0} days`} sub="Keep showing up." />
        </div>
        <div className="mt-5">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-slate-600">Goal progress</span>
            <span className="text-slate-900 font-medium">{Math.floor(studied/60)}h {studied%60}m / {Math.floor(goal/60)}h · {pct}%</span>
          </div>
          <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#FF7A18' }} />
          </div>
        </div>
      </section>

      {/* Explore branches */}
      <section>
        <h3 className="font-serif-display text-2xl font-bold text-[#1A1A1A] mb-4">Explore branches</h3>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
          {BRANCHES.map((b) => {
            const isActive = activeBranch.branchCode === b.code
            return (
              <button key={b.code} className={`min-w-[200px] p-5 rounded-2xl text-left transition shrink-0 ${isActive ? 'sunrise-gradient text-white shadow-[0_12px_40px_-8px_rgba(255,122,24,0.45)]' : 'card-luxe hover:translate-y-[-2px]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`font-serif-display font-bold text-xl ${isActive ? 'text-white' : 'text-[#1A1A1A]'}`}>{b.code}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-white pulse-dot" />}
                </div>
                <div className={`text-sm ${isActive ? 'text-white/90' : 'text-[#2A2A2A]'}`}>{b.short}</div>
                <div className={`text-xs mt-2 ${isActive ? 'text-white/70' : 'text-[#A47148]'}`}>12 subjects · {120 + Math.floor(Math.random() * 250)} aspirants</div>
              </button>
            )
          })}
        </div>
      </section>

      {/* Streak banner */}
      <section className="rounded-3xl p-8 text-center relative overflow-hidden sunrise-gradient text-white shadow-[0_20px_60px_-10px_rgba(255,122,24,0.45)]">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
        <div className="relative">
          <div className="text-xs font-bold tracking-[0.2em] opacity-90">🔥 COMPLETION STREAK</div>
          <div className="font-serif-display text-5xl font-bold mt-2">{snapshot.streak || 0} <span className="text-2xl font-normal">Days</span></div>
          <p className="text-sm mt-2 opacity-90 max-w-md mx-auto">Consistency is key — complete a topic, revise, or log time today to keep it alive.</p>
        </div>
      </section>

      <DynamicQuote />

      {/* Quick actions */}
      <section>
        <h3 className="font-serif-display text-2xl font-bold text-[#1A1A1A] mb-4">Quick actions</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: Check, color: '#FF7A18', label: 'Mark topics complete', sub: 'Earn +20 XP each & grow your streak.', page: 'Progress' },
            { icon: Clock, color: '#FFB547', label: 'Start study timer', sub: 'Log every minute — even 1m counts.', page: 'Progress' },
            { icon: TrendingUp, color: '#A47148', label: 'See ROI engine', sub: 'Highest-return subjects right now.', page: 'Weightage' },
          ].map(({ icon: Icon, color, label, sub, page }) => (
            <button key={label} onClick={() => setPage(page)} className="card-luxe p-6 text-left hover:translate-y-[-2px] transition group">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-3" style={{ background: `${color}22` }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
              <div className="font-bold text-[#1A1A1A]">{label}</div>
              <p className="text-sm text-[#6B5E52] mt-1">{sub}</p>
              <span className="inline-flex items-center text-xs font-semibold mt-3 text-[#FF7A18] group-hover:gap-2 gap-1 transition-all">Open <ArrowUpRight className="w-3 h-3" /></span>
            </button>
          ))}
        </div>
      </section>

      {/* Heatmap */}
      <section>
        <div className="text-xs font-bold tracking-wider text-slate-500 mb-1">📅 MONTHLY STREAKS</div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Your Month-by-Month Consistency</h2>
        <p className="text-sm text-slate-500 mt-1">Color depth reflects activity that day. Even one topic or one minute lights it up.</p>
        <Card className="p-6 mt-4 overflow-x-auto">
          <Heatmap heatmap={heatmap} />
          <div className="flex flex-wrap gap-4 text-xs text-slate-500 mt-4 items-center justify-between">
            <div>Total active days: <b className="text-[#1A1A1A]">{user.totalActiveDays || 0}</b> · Max streak: <b className="text-[#1A1A1A]">{snapshot.maxStreak || 0}</b> · Current: <b className="text-[#1A1A1A]">{snapshot.streak || 0}</b> 🔥</div>
            <div className="flex items-center gap-2">
              <span>none</span>
              <div className="heatmap-cell" />
              <div className="heatmap-cell heatmap-l1" />
              <div className="heatmap-cell heatmap-l2" />
              <div className="heatmap-cell heatmap-l3" />
              <div className="heatmap-cell heatmap-l4" />
              <span>heavy day</span>
            </div>
          </div>
        </Card>
      </section>

      <div className="text-center pt-4 pb-2">
        <p className="font-serif-display text-xl font-bold text-[#1A1A1A]">All the best for GATE {activeBranch.branchCode} {activeBranch.targetYear} 🎯</p>
        <p className="text-sm text-slate-500 mt-1">Built with 15-year data analysis · Smart prep beats hard prep.</p>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }) {
  return (
    <div className="card-luxe p-5 hover:translate-y-[-2px] transition">
      <div className="flex items-center gap-2 text-[10px] font-bold text-[#A47148] uppercase tracking-[0.12em]">
        <span className="w-7 h-7 rounded-lg flex items-center justify-center bg-[#FFE5D0] text-[#FF7A18]">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="font-serif-display text-3xl font-bold text-[#1A1A1A] mt-3">{value}</div>
      <div className="text-xs text-[#6B5E52] mt-1">{sub}</div>
    </div>
  )
}

function Heatmap({ heatmap }) {
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 30) // ~7 months
  // align to sunday
  start.setDate(start.getDate() - start.getDay())
  const weeks = []
  for (let w = 0; w < 31; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      days.push(day)
    }
    weeks.push(days)
  }
  const level = (mins, topics) => {
    if (!mins && !topics) return 0
    if (mins > 240 || topics >= 6) return 4
    if (mins > 120 || topics >= 4) return 3
    if (mins > 30 || topics >= 2) return 2
    return 1
  }
  const todayStr = today.toISOString().split('T')[0]
  return (
    <div className="flex gap-1 min-w-max">
      <div className="flex flex-col gap-1 mr-1 text-[10px] text-slate-400 mt-3">
        <div className="h-[11px]">Mon</div>
        <div className="h-[11px]"></div>
        <div className="h-[11px]">Wed</div>
        <div className="h-[11px]"></div>
        <div className="h-[11px]">Fri</div>
        <div className="h-[11px]"></div>
        <div className="h-[11px]"></div>
      </div>
      <div className="flex gap-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day, di) => {
              const ds = day.toISOString().split('T')[0]
              const h = heatmap[ds] || { minutes: 0, topics: 0 }
              const lv = level(h.minutes, h.topics)
              const isToday = ds === todayStr
              return (
                <div key={di} title={`${ds} — ${h.minutes} min, ${h.topics} topics`} className={`heatmap-cell ${['','heatmap-l1','heatmap-l2','heatmap-l3','heatmap-l4'][lv]} ${isToday ? 'heatmap-today' : ''}`} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// =================== WEIGHTAGE PAGE ===================
function WeightagePage({ user, activeBranch }) {
  const [roi, setRoi] = useState([])
  const [subjects, setSubjects] = useState([])
  useEffect(() => {
    api.topics(activeBranch.branchCode).then((r) => setSubjects(r.subjects || []))
    api.roi(user.id, activeBranch.branchCode).then((r) => setRoi(r.roi || []))
  }, [user.id, activeBranch.branchCode])
  const diffColor = (d) => d === 'Easy' ? 'bg-green-100 text-green-700' : d === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
  const tierColor = (t) => t === 'Extremely High' ? 'bg-green-100 text-green-700' : t === 'High' ? 'bg-blue-100 text-blue-700' : t === 'Medium' ? 'bg-slate-200 text-slate-700' : 'bg-slate-100 text-slate-500'

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <section>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📈 15-YEAR ANALYSIS (2010–2024)</div>
        <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Subject Weightage — {activeBranch.branchCode} — High to Low</h1>
        <p className="text-slate-500 mt-1">Average marks expected per subject based on past 15 GATE {activeBranch.branchCode} papers. Sorted by weightage. Target: GATE {activeBranch.targetYear}.</p>
        <Card className="mt-5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1A] text-white text-left">
              <tr><th className="p-3 w-10">#</th><th className="p-3">Subject</th><th className="p-3">Avg Marks</th><th className="p-3">Range</th><th className="p-3">Weightage</th><th className="p-3">Difficulty</th></tr>
            </thead>
            <tbody>
              {subjects.map((s, i) => (
                <tr key={s.key} className="border-b last:border-0">
                  <td className="p-3 font-mono text-slate-400">{String(i+1).padStart(2,'0')}</td>
                  <td className="p-3 font-medium">{s.name}</td>
                  <td className="p-3"><span className="font-bold text-[#1A1A1A] text-lg">{s.avgMarks}</span> <span className="text-xs text-slate-400">marks</span></td>
                  <td className="p-3 text-slate-500">{s.range}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded bg-slate-200 w-24 overflow-hidden"><div className="h-full" style={{ width: `${s.weightage * 5}%`, background: '#1A1A1A' }} /></div>
                      <span className="font-semibold">{s.weightage}%</span>
                    </div>
                  </td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${diffColor(s.difficulty)}`}>{s.difficulty}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Subject ROI Engine</h2>
        <p className="text-slate-500 mt-1">Pending marks vs syllabus size — what gives the highest return on your effort right now.</p>
        <Card className="mt-5 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1A] text-white text-left">
              <tr><th className="p-3">Subject</th><th className="p-3">Pending</th><th className="p-3">ROI Score</th><th className="p-3">Tier</th></tr>
            </thead>
            <tbody>
              {roi.map((r) => (
                <tr key={r.key} className="border-b last:border-0">
                  <td className="p-3 font-medium">{r.name}</td>
                  <td className="p-3">{r.pendingMarks} / {r.avgMarks}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 rounded bg-slate-200 w-24 overflow-hidden"><div className="h-full" style={{ width: `${Math.min(100, r.score)}%`, background: '#FF7A18' }} /></div>
                      <span className="font-semibold">{r.score}</span>
                    </div>
                  </td>
                  <td className="p-3"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${tierColor(r.tier)}`}>{r.tier}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>

      <section>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📖 SOURCE OF TRUTH</div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Official GATE Syllabus</h2>
        <p className="text-slate-500 mt-1">Official sections for your branch. Tap to expand.</p>
        <Card className="mt-5 p-2">
          <Accordion type="single" collapsible>
            {subjects.map((s) => (
              <AccordionItem key={s.key} value={s.key}>
                <AccordionTrigger className="px-3 hover:no-underline">{s.name}</AccordionTrigger>
                <AccordionContent className="px-3 text-slate-600 text-sm">Official GATE {activeBranch.branchCode} sub-topics under {s.name}. {s.avgMarks} avg marks · {s.weightage}% weightage. Click Progress to track topics.</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </Card>
      </section>
    </div>
  )
}

// =================== PROGRESS PAGE ===================
function ProgressPage({ user, activeBranch, onRefresh }) {
  const [data, setData] = useState({ subjects: [], topics: [] })
  const [tab, setTab] = useState('subject')
  const [busy, setBusy] = useState(null)
  useEffect(() => { api.topics(activeBranch.branchCode).then(setData) }, [activeBranch.branchCode])
  const branch = activeBranch
  const completed = new Set(branch.completedTopics || [])
  const total = data.topics.length
  const done = data.topics.filter((t) => completed.has(t.id)).length
  const pct = total ? Math.round((done / total) * 100) : 0

  const toggle = async (t) => {
    if (busy) return
    setBusy(t.id)
    if (completed.has(t.id)) {
      await api.uncomplete({ userId: user.id, topicId: t.id, branchCode: branch.branchCode })
      toast('Unmarked')
    } else {
      const r = await api.complete({ userId: user.id, topicId: t.id, subject: t.subject, topicName: t.name, branchCode: branch.branchCode })
      if (!r.alreadyCompleted) toast.success(`+20 XP — ${t.name}`, { description: 'Streak alive 🔥' })
    }
    await onRefresh()
    setBusy(null)
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <StudyTimer user={user} branch={branch} subjects={data.subjects} topics={data.topics} onLogged={onRefresh} />

      <section>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-500 bg-slate-100 mb-2">⇅ YOUR PROGRESS</div>
        <h2 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Track Topics. Watch Completion Rise.</h2>
        <p className="text-slate-500 mt-1">Tick off topics as you finish them. Each topic = +20 XP.</p>
        <Card className="p-5 mt-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overall Completion</div>
              <div className="font-serif-display text-3xl font-bold text-[#1A1A1A] mt-1">{pct}% <span className="text-base font-medium text-slate-500">· {done}/{total} topics</span></div>
            </div>
            <Badge variant="outline" className="text-[#1A1A1A]">XP: {branch.xp || 0}</Badge>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden">
            <div className="h-full" style={{ width: `${pct}%`, background: '#FF7A18' }} />
          </div>
        </Card>

        <Tabs value={tab} onValueChange={setTab} className="mt-6">
          <TabsList>
            <TabsTrigger value="subject">By Subject</TabsTrigger>
            <TabsTrigger value="priority">By Priority</TabsTrigger>
            <TabsTrigger value="phase">By Phase</TabsTrigger>
          </TabsList>
          <TabsContent value="subject" className="mt-4">
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.subjects.map((s) => {
                const subTopics = data.topics.filter((t) => t.subjectKey === s.key)
                const sdone = subTopics.filter((t) => completed.has(t.id)).length
                const spct = subTopics.length ? Math.round((sdone / subTopics.length) * 100) : 0
                return (
                  <Card key={s.key} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <div className="font-semibold text-[#1A1A1A] text-sm">{s.name}</div>
                      <Badge variant="secondary">{spct}%</Badge>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{sdone}/{subTopics.length} topics · {s.avgMarks} avg marks</div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
                      <div className="h-full" style={{ width: `${spct}%`, background: '#FF7A18' }} />
                    </div>
                    <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                      {subTopics.map((t) => {
                        const ck = completed.has(t.id)
                        return (
                          <button key={t.id} onClick={() => toggle(t)} disabled={busy === t.id} className="w-full flex items-center gap-2 text-left text-sm group p-1 rounded hover:bg-slate-50">
                            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300'}`}>
                              {ck && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <span className={`flex-1 ${ck ? 'line-through text-slate-400' : ''}`}>{t.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${t.priority === 'HIGH' ? 'border-green-300 text-green-700' : 'border-slate-300 text-slate-500'}`}>{t.priority}</Badge>
                          </button>
                        )
                      })}
                    </div>
                  </Card>
                )
              })}
            </div>
          </TabsContent>
          <TabsContent value="priority" className="mt-4 space-y-4">
            {['HIGH', 'LOW'].map((pri) => (
              <Card key={pri} className="p-4">
                <div className="font-semibold text-[#1A1A1A] mb-2">{pri} priority</div>
                <div className="grid md:grid-cols-2 gap-1.5">
                  {data.topics.filter((t) => t.priority === pri).map((t) => {
                    const ck = completed.has(t.id)
                    return (
                      <button key={t.id} onClick={() => toggle(t)} className="flex items-center gap-2 text-left text-sm p-1 hover:bg-slate-50 rounded">
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300'}`}>{ck && <Check className="w-3 h-3 text-white" />}</div>
                        <span className={ck ? 'line-through text-slate-400' : ''}>{t.subject.split(' & ')[0]} · {t.name}</span>
                      </button>
                    )
                  })}
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="phase" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ['Phase 1 (Month 1–3): Foundations', ['math','discrete','algorithms']],
                ['Phase 2 (Month 4–6): Core', ['ds','os','dbms','cn']],
                ['Phase 3 (Month 7–9): Advanced', ['toc','cd','coa','dl']],
                ['Phase 4 (Month 10–12): Revision + Aptitude', ['aptitude']],
              ].map(([label, keys]) => (
                <Card key={label} className="p-4">
                  <div className="font-semibold text-[#1A1A1A] mb-2">{label}</div>
                  <div className="space-y-1.5 max-h-80 overflow-y-auto scrollbar-thin">
                    {data.topics.filter((t) => keys.includes(t.subjectKey)).map((t) => {
                      const ck = completed.has(t.id)
                      return (
                        <button key={t.id} onClick={() => toggle(t)} className="w-full flex items-center gap-2 text-left text-sm p-1 hover:bg-slate-50 rounded">
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300'}`}>{ck && <Check className="w-3 h-3 text-white" />}</div>
                          <span className={ck ? 'line-through text-slate-400' : ''}>{t.subject.split(' & ')[0]} · {t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </section>
    </div>
  )
}

// =================== STUDY TIMER ===================
function StudyTimer({ user, branch, subjects, topics, onLogged }) {
  const [subj, setSubj] = useState('')
  const [topic, setTopic] = useState('')
  const [secs, setSecs] = useState(0)
  const [running, setRunning] = useState(false)
  const ref = useRef(null)
  const [manual, setManual] = useState('')
  useEffect(() => { if (running) ref.current = setInterval(() => setSecs((s) => s + 1), 1000); return () => clearInterval(ref.current) }, [running])
  const subjTopics = topics.filter((t) => subjects.find((s) => s.name === subj && s.key === t.subjectKey))
  const subjObj = subjects.find((s) => s.name === subj)
  const filteredTopics = subjObj ? topics.filter((t) => t.subjectKey === subjObj.key) : []

  const stop = async () => {
    setRunning(false)
    const mins = Math.max(1, Math.round(secs / 60))
    if (mins < 1) return
    await api.logSession({ userId: user.id, branchCode: branch.branchCode, subject: subj || 'General', topic: topic || 'Study', durationMinutes: mins, type: 'study', source: 'timer' })
    toast.success(`Logged ${mins} min`)
    setSecs(0)
    onLogged()
  }
  const logManual = async () => {
    const m = Number(manual)
    if (!m || m < 1) return toast.error('Enter minutes')
    await api.logSession({ userId: user.id, branchCode: branch.branchCode, subject: subj || 'General', topic: topic || 'Manual log', durationMinutes: m, type: 'study', source: 'manual' })
    toast.success(`+${m} min logged`)
    setManual('')
    onLogged()
  }
  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-[#1A1A1A]" />
        <h3 className="font-bold text-[#1A1A1A]">Study Timer</h3>
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">SUBJECT</Label>
          <Select value={subj} onValueChange={setSubj}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose subject" /></SelectTrigger>
            <SelectContent>{subjects.map((s) => <SelectItem key={s.key} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">TOPIC</Label>
          <Select value={topic} onValueChange={setTopic} disabled={!subjObj}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Choose topic" /></SelectTrigger>
            <SelectContent>{filteredTopics.map((t) => <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="text-center my-5">
        <div className="font-mono-digits text-5xl font-bold text-[#1A1A1A]">{fmt(secs)}</div>
        <div className="mt-3 flex justify-center gap-2">
          {!running ? (
            <Button onClick={() => setRunning(true)} className="bg-[#1A1A1A] hover:bg-[#2A2A2A]"><Play className="w-4 h-4 mr-1" />Start</Button>
          ) : (
            <Button onClick={() => setRunning(false)} variant="outline"><Pause className="w-4 h-4 mr-1" />Pause</Button>
          )}
          {(secs > 0 || running) && <Button onClick={stop} variant="outline">Stop &amp; Log</Button>}
        </div>
      </div>
      <div className="border-t pt-3">
        <Label className="text-xs">ADD MINUTES MANUALLY</Label>
        <div className="flex gap-2 mt-1">
          <Input placeholder="e.g. 45" value={manual} onChange={(e) => setManual(e.target.value)} className="w-32" />
          <Button onClick={logManual} className="bg-[#1A1A1A] hover:bg-[#2A2A2A]"><Plus className="w-4 h-4 mr-1" />Log</Button>
        </div>
      </div>
    </Card>
  )
}

// =================== REVISION PAGE ===================
function RevisionPage({ user, activeBranch, onRefresh }) {
  const [data, setData] = useState({ subjects: [], topics: [] })
  useEffect(() => { api.topics(activeBranch.branchCode).then(setData) }, [activeBranch.branchCode])
  const completed = new Set(activeBranch.completedTopics || [])
  const list = data.topics.filter((t) => completed.has(t.id))
  const revise = async (t) => {
    await api.revise({ userId: user.id, topicId: t.id, subject: t.subject, topicName: t.name, branchCode: activeBranch.branchCode })
    toast.success(`+20 XP — Revised ${t.name}`)
    onRefresh()
  }
  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-500 bg-slate-100 mb-2">↺ REVISION</div>
        <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Revise Completed Topics</h1>
        <p className="text-slate-500 mt-1">Pick from topics you&apos;ve already finished and log revision (+20 XP, no double-counting as fresh study).</p>
      </div>
      {list.length === 0 ? (
        <Card className="p-8 text-center text-slate-500">You haven&apos;t completed any topics yet. Head to Progress and tick a few off.</Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {list.map((t) => (
            <Card key={t.id} className="p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#1A1A1A]">{t.name}</div>
                <div className="text-xs text-slate-500">{t.subject}</div>
              </div>
              <Button onClick={() => revise(t)} variant="outline" size="sm"><RotateCcw className="w-3 h-3 mr-1" />Revise</Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

// =================== DASHBOARD ===================

function DashboardPage({ user, activeBranch, snapshot }) {
  const xp = activeBranch.xp || 0
  const level = Math.floor(xp / 100) + 1
  const [weekSessions, setWeekSessions] = useState([])
  const [prevSessions, setPrevSessions] = useState([])
  const [topicData, setTopicData] = useState({ subjects: [], topics: [] })

  useEffect(() => {
    fetch(`/api/sessions?userId=${user.id}&range=week`).then((r) => r.json()).then((d) => setWeekSessions(d.sessions || []))
    fetch(`/api/sessions?userId=${user.id}&range=prevweek`).then((r) => r.json()).then((d) => setPrevSessions(d.sessions || []))
    api.topics(activeBranch.branchCode).then(setTopicData)
  }, [user.id, activeBranch.branchCode])

  // Subjects focused (donut) — share of study time per subject this week
  const subjShare = useMemo(() => {
    const map = {}
    weekSessions.forEach((s) => { map[s.subject] = (map[s.subject] || 0) + (s.durationMinutes || 0) })
    return Object.entries(map).map(([name, value]) => ({ name, value }))
  }, [weekSessions])

  // Time per subject (bar)
  const timePerSubject = useMemo(() => {
    return [...subjShare].sort((a, b) => b.value - a.value)
  }, [subjShare])

  // Impression trend (line) - daily minutes current vs prev week
  const trendData = useMemo(() => {
    const lab = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
    const cur = [0, 0, 0, 0, 0, 0, 0]
    const prv = [0, 0, 0, 0, 0, 0, 0]
    const today = new Date()
    weekSessions.forEach((s) => {
      const d = new Date(s.date)
      const diff = Math.floor((today - d) / 86400000)
      const idx = 6 - diff
      if (idx >= 0 && idx < 7) cur[idx] += s.durationMinutes || 0
    })
    prevSessions.forEach((s) => {
      const d = new Date(s.date)
      const diff = Math.floor((today - d) / 86400000) - 7
      const idx = 6 - diff
      if (idx >= 0 && idx < 7) prv[idx] += s.durationMinutes || 0
    })
    return lab.map((l, i) => ({ day: l, current: cur[i], previous: prv[i] }))
  }, [weekSessions, prevSessions])

  // Overall % completion per subject
  const completion = useMemo(() => {
    const completed = new Set(activeBranch.completedTopics || [])
    return topicData.subjects.map((s) => {
      const ts = topicData.topics.filter((t) => t.subjectKey === s.key)
      const done = ts.filter((t) => completed.has(t.id)).length
      const pct = ts.length ? Math.round((done / ts.length) * 100) : 0
      return { name: s.name.split(' ')[0].slice(0, 8), full: s.name, pct }
    })
  }, [topicData, activeBranch.completedTopics])

  // Resonance: blend of completion + revision + study time per subject (0-100)
  const resonance = useMemo(() => {
    const completed = new Set(activeBranch.completedTopics || [])
    const revised = new Set(activeBranch.revisedTopics || [])
    const timeBySubj = {}
    weekSessions.forEach((s) => { timeBySubj[s.subject] = (timeBySubj[s.subject] || 0) + (s.durationMinutes || 0) })
    return topicData.subjects.map((s) => {
      const ts = topicData.topics.filter((t) => t.subjectKey === s.key)
      const cp = ts.length ? ts.filter((t) => completed.has(t.id)).length / ts.length : 0
      const rp = ts.length ? ts.filter((t) => revised.has(t.id)).length / ts.length : 0
      const tp = Math.min(1, (timeBySubj[s.name] || 0) / 300)
      const score = Math.round((cp * 50 + rp * 30 + tp * 20))
      return { subject: s.name.split(' ')[0].slice(0, 6), score }
    })
  }, [topicData, activeBranch, weekSessions])

  const totalWeekMin = weekSessions.reduce((a, s) => a + (s.durationMinutes || 0), 0)

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-500 bg-slate-100 mb-2">📊 {activeBranch.branchCode} ANALYTICS</div>
        <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Your Personal Dashboard</h1>
        <p className="text-slate-500 mt-1">Every visual is computed from your real activity. Switch tabs on cards below to time-travel.</p>
      </div>

      <div className="grid md:grid-cols-4 gap-4">
        <StatCard icon={<Flame className="w-4 h-4 text-blue-600" />} label="STREAK DAYS" value={String(snapshot.streak || 0)} sub="current streak" />
        <StatCard icon={<Clock className="w-4 h-4 text-purple-600" />} label="WEEK STUDY TIME" value={`${Math.floor(totalWeekMin/60)}h ${totalWeekMin%60}m`} sub="last 7 days" />
        <StatCard icon={<Check className="w-4 h-4 text-green-600" />} label="TOPICS COMPLETED" value={String((activeBranch.completedTopics || []).length)} sub="all time" />
        <StatCard icon={<Trophy className="w-4 h-4 text-pink-600" />} label="LEVEL" value={`L${level}`} sub={`${xp} XP · ${100 - (xp % 100)} to next`} />
      </div>

      {/* XP Clubs */}
      <Card className="p-5">
        <h3 className="font-bold mb-2">XP Progress</h3>
        <p className="text-sm text-slate-500 mb-3">{xp} XP toward Level {level + 1}</p>
        <div className="h-3 bg-slate-200 rounded-full overflow-hidden"><div className="h-full" style={{ width: `${xp % 100}%`, background: '#EAB308' }} /></div>
        <div className="mt-4 grid grid-cols-5 gap-2 text-xs">
          {[500, 1000, 2000, 5000, 10000].map((th) => (
            <div key={th} className={`p-2 rounded text-center ${xp >= th ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-400'}`}>
              {th >= 1000 ? `${th/1000}K` : th} Club
            </div>
          ))}
        </div>
      </Card>

      {/* Row: 3 charts */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="p-5">
          <h3 className="font-bold">Subjects Focused</h3>
          <p className="text-xs text-slate-500 mb-2">Share of study time · last 7 days</p>
          {subjShare.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-slate-400">No sessions this week. Log time to fill this in.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={subjShare} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {subjShare.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <RTooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold">Time per Subject</h3>
          <p className="text-xs text-slate-500 mb-2">Minutes per subject · last 7 days</p>
          {timePerSubject.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-sm text-slate-400">No data yet.</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={timePerSubject} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                <RTooltip />
                <Bar dataKey="value" fill="#FF7A18" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold">Impression Trend</h3>
          <p className="text-xs text-slate-500 mb-2">Daily minutes — current vs previous week</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="current" stroke="#EC4899" strokeWidth={2} name="This week" />
              <Line type="monotone" dataKey="previous" stroke="#94A3B8" strokeWidth={2} strokeDasharray="4 4" name="Prev week" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Row: 2 charts */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-bold">Overall % Completion</h3>
          <p className="text-xs text-slate-500 mb-2">Per-subject syllabus coverage</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={completion} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
              <RTooltip formatter={(v) => `${v}%`} labelFormatter={(l, p) => p?.[0]?.payload?.full || l} />
              <Bar dataKey="pct" fill="#FF7A18" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <h3 className="font-bold">Resonance Score</h3>
          <p className="text-xs text-slate-500 mb-2">Completion + revision + study-time blend per subject</p>
          {resonance.every((r) => r.score === 0) ? (
            <div className="h-72 flex items-center justify-center text-sm text-slate-400">Start studying to see your resonance.</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={resonance}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar dataKey="score" stroke="#1A1A1A" fill="#FF7A18" fillOpacity={0.5} />
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>
    </div>
  )
}

// =================== COMMUNITY ===================
function CommunityPage({ user, activeBranch }) {
  const [posts, setPosts] = useState([])
  const [board, setBoard] = useState([])
  const [tab, setTab] = useState('feed')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [open, setOpen] = useState(false)
  const refresh = () => { api.posts().then((r) => setPosts(r.posts || [])); api.leaderboard(activeBranch.branchCode).then((r) => setBoard(r.leaderboard || [])) }
  useEffect(refresh, [activeBranch.branchCode])
  const submit = async () => {
    if (!title.trim()) return toast.error('Add a title')
    await api.newPost({ userId: user.id, username: user.username, branchCode: activeBranch.branchCode, type: 'Doubt', title, content })
    toast.success('Posted')
    setTitle(''); setContent(''); setOpen(false); refresh()
  }
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-500 bg-slate-100 mb-2">👥 COMPETE · LEARN · GROW</div>
      <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">{activeBranch.branchCode} Community</h1>
      <p className="text-slate-500 mt-1">Ask doubts, answer peers, climb the leaderboard.</p>

      <Tabs value={tab} onValueChange={setTab} className="mt-5">
        <TabsList>
          <TabsTrigger value="feed">Feed</TabsTrigger>
          <TabsTrigger value="leaderboard">Leaderboard</TabsTrigger>
        </TabsList>
        <TabsContent value="feed" className="mt-4">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-3">
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild><Button className="bg-[#1A1A1A] hover:bg-[#2A2A2A]"><Plus className="w-4 h-4 mr-1" />Ask a doubt</Button></DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Ask a doubt</DialogTitle></DialogHeader>
                  <Input placeholder="Title (e.g. Why does Dijkstra fail with negative edges?)" value={title} onChange={(e) => setTitle(e.target.value)} />
                  <textarea className="w-full border rounded p-2 text-sm" rows={4} placeholder="Describe your question..." value={content} onChange={(e) => setContent(e.target.value)} />
                  <DialogFooter><Button onClick={submit} className="bg-[#1A1A1A]">Post</Button></DialogFooter>
                </DialogContent>
              </Dialog>
              {posts.length === 0 && <Card className="p-6 text-center text-slate-500">No posts yet. Be the first to ask!</Card>}
              {posts.map((p) => (
                <Card key={p.id} className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-[#1A1A1A]">{p.branchCode}</Badge>
                    <Badge variant="outline">{p.type}</Badge>
                  </div>
                  <div className="font-semibold text-[#1A1A1A]">{p.title}</div>
                  {p.body && <p className="text-sm text-slate-600 mt-1 line-clamp-3">{p.body}</p>}
                  <div className="text-xs text-slate-500 mt-2">{p.username} · {new Date(p.createdAt).toLocaleString()}</div>
                </Card>
              ))}
            </div>
            <div className="space-y-3">
              <Card className="p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your stats</div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Total XP</span><b>{activeBranch.xp || 0}</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">Streak</span><b>{activeBranch.streak || 0}d</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">Topics done</span><b>{(activeBranch.completedTopics || []).length}</b></div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🏆 Top this week</div>
                {board.slice(0, 5).map((u, i) => (
                  <div key={u.username} className="flex items-center justify-between text-sm py-1">
                    <span className={u.username === user.username ? 'font-bold text-[#1A1A1A]' : 'text-slate-700'}>#{i+1} {u.username}</span>
                    <span className="text-slate-500">{u.xp} XP</span>
                  </div>
                ))}
              </Card>
            </div>
          </div>
        </TabsContent>
        <TabsContent value="leaderboard" className="mt-4">
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-[#1A1A1A] text-white text-left">
                <tr><th className="p-3">Rank</th><th className="p-3">Username</th><th className="p-3">XP</th><th className="p-3">Topics</th><th className="p-3">Streak</th><th className="p-3">Level</th></tr>
              </thead>
              <tbody>
                {board.map((u, i) => (
                  <tr key={u.username} className={`border-b ${u.username === user.username ? 'bg-amber-50' : ''}`}>
                    <td className="p-3">#{i+1}</td><td className="p-3 font-medium">{u.username}</td><td className="p-3">{u.xp}</td><td className="p-3">{u.completed}</td><td className="p-3">{u.streak}</td><td className="p-3">L{u.level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// =================== RESOURCES / PYQS / MOCKS placeholders ===================
function ResourcesPage({ activeBranch }) {
  const sheets = ['General Aptitude Formula Sheet', 'Engineering Mathematics', 'Digital Logic', 'Computer Organization', 'Programming & DS', 'Compiler Design', 'Operating Systems', 'Databases', 'Computer Networks', 'Algorithms', 'Discrete Mathematics', 'Theory of Computation']
  const books = ['Oswaal GATE General Aptitude & Engineering Mathematics', 'MadeEasy Last 17yrs PYQs — Reasoning & Aptitude', 'MadeEasy Last 24yrs PYQs — Engineering Mathematics', 'ACE Engineering Mathematics — Last 33 Yrs PYQs', 'GKP GATE Study Guide — CS & IT', 'MadeEasy CS — Last 30Yrs PYQs', 'ACE CS — Last 39Yrs PYQs', 'ACE Handbook — CS/IT']
  const gradients = ['from-orange-400 to-pink-500', 'from-blue-500 to-cyan-400', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-600', 'from-rose-500 to-red-500', 'from-amber-500 to-orange-600']
  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📚 CURATED BOOKS</div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Best Handpicked Books ({activeBranch.branchCode})</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {books.map((b, i) => (
            <Card key={i} className="p-4">
              <div className={`h-32 rounded-md bg-gradient-to-br ${gradients[i % 6]} flex items-center justify-center text-white text-center text-xs font-bold p-2`}>📖 {b.split(' — ')[0]}</div>
              <div className="text-sm font-medium mt-2 line-clamp-2 text-[#1A1A1A]">{b}</div>
              <a href="#" className="text-xs text-[#FFB547] font-semibold mt-1 inline-flex items-center gap-1">Buy on Amazon <ArrowUpRight className="w-3 h-3" /></a>
            </Card>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">📄 Quick Revision Sheets</h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {sheets.map((s, i) => (
            <a key={s} href="#" className={`rounded-xl p-4 bg-gradient-to-br ${gradients[i % 6]} text-white block hover:scale-[1.02] transition`}>
              <div className="text-[10px] font-bold opacity-80">📄 QUICK REVISION</div>
              <div className="font-bold mt-6">{s}</div>
              <div className="text-xs opacity-80 mt-2 flex items-center gap-1">Open <ArrowUpRight className="w-3 h-3" /></div>
            </a>
          ))}
        </div>
      </div>
      <div>
        <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">▷ Video Playlists</h2>
        <Card className="mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#1A1A1A] text-white text-left"><tr><th className="p-3">Subject</th><th className="p-3">GATE Wallah</th><th className="p-3">Unacademy</th></tr></thead>
            <tbody>
              {sheets.map((s) => (
                <tr key={s} className="border-b last:border-0">
                  <td className="p-3 font-medium">{s}</td>
                  <td className="p-3"><a href="#" className="text-[#FFB547] inline-flex items-center gap-1">GATE Wallah <ArrowUpRight className="w-3 h-3" /></a></td>
                  <td className="p-3"><a href="#" className="text-[#FFB547] inline-flex items-center gap-1">Unacademy <ArrowUpRight className="w-3 h-3" /></a></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

function PYQsPage({ activeBranch }) {
  const papers = []
  for (let y = 2026; y >= 2010; y--) {
    papers.push({ year: y, shift: 1 })
    if (y >= 2022) papers.push({ year: y, shift: 2 })
  }
  const gradients = ['from-orange-400 to-pink-500', 'from-blue-500 to-cyan-400', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-600', 'from-rose-500 to-red-500', 'from-amber-500 to-orange-600']
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📄 PYQS</div>
      <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">GATE {activeBranch.branchCode} — Previous Year Papers</h1>
      <p className="text-slate-500 mt-1">Official GATE {activeBranch.branchCode} papers. Tap a cover to open the PDF.</p>
      <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3 mt-5">
        {papers.map((p, i) => (
          <Card key={`${p.year}-${p.shift}`} className="overflow-hidden">
            <div className={`p-5 bg-gradient-to-br ${gradients[i % 6]} text-white relative`}>
              <div className="flex justify-between text-[10px] font-bold"><span>📄 OFFICIAL PDF</span><span>{activeBranch.branchCode}</span></div>
              <div className="font-bold text-xl mt-10">GATE {p.year}</div>
              <div className="text-sm opacity-80">Shift {p.shift}</div>
            </div>
            <div className="p-3 text-xs flex items-center justify-between">
              <a href="#" className="text-[#FFB547] font-semibold inline-flex items-center gap-1">Open PDF <ArrowUpRight className="w-3 h-3" /></a>
              <span className="text-slate-400">{p.year === 2026 && p.shift === 1 ? '▷ Attempt in-app' : 'Attempt — coming soon'}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function MockTestsPage({ activeBranch }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📝 MOCK TESTS</div>
      <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">{activeBranch.branchCode} Full-Length Mocks</h1>
      <p className="text-slate-500 mt-1">Real exam-style mocks — 65 questions, 180 min, MCQ + MSQ + NAT.</p>
      <div className="grid md:grid-cols-3 gap-4 mt-5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Card key={i} className="p-5">
            <div className="font-bold">GATE {activeBranch.branchCode} 2026 — Mock {i}</div>
            <div className="text-xs text-slate-500 mt-1">180 min · 65 Qs · 100 marks</div>
            <Button variant="outline" className="mt-3 w-full" disabled>Coming soon</Button>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SettingsPage({ user, activeBranch, onSwitchBranch, onAddBranch, onLogout }) {
  const [open, setOpen] = useState(false)
  const [newBranch, setNewBranch] = useState('DA')
  const [newYear, setNewYear] = useState('2027')
  const avail = BRANCHES.filter((b) => !user.branches.find((ub) => ub.branchCode === b.code))
  const add = async () => {
    await onAddBranch(newBranch, newYear)
    setOpen(false)
    toast.success(`Added ${newBranch} '${String(newYear).slice(-2)}`)
  }
  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-3xl">
      <div>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-500 bg-slate-100 mb-2">⚙️ ACCOUNT</div>
        <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Settings &amp; Branches</h1>
      </div>
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">USERNAME</div>
        <div className="font-serif-display text-2xl font-bold text-[#1A1A1A] mt-1">{user.username}</div>
        <div className="text-sm text-slate-500 mt-1">Shared across all your branches.</div>
      </Card>
      <Card className="p-5">
        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">YOUR BRANCHES</div>
        <div className="grid sm:grid-cols-2 gap-3">
          {user.branches.map((b) => (
            <button key={b.branchCode} onClick={() => onSwitchBranch(b.branchCode)} className={`text-left p-4 rounded-xl border-2 transition ${b.branchCode === activeBranch.branchCode ? 'border-[#FF7A18] bg-[#F0FDFA]' : 'border-slate-200 hover:border-slate-300'}`}>
              <div className="font-bold text-[#1A1A1A]">{b.branchCode}</div>
              <div className="text-xs text-slate-500">{BRANCHES.find((x) => x.code === b.branchCode)?.short} · GATE {b.targetYear}</div>
              {b.branchCode === activeBranch.branchCode && <Badge className="mt-2 bg-green-100 text-green-700">✓ Active</Badge>}
              <div className="mt-2 text-xs text-slate-400">XP: {b.xp || 0} · Streak: {b.streak || 0}d · {(b.completedTopics || []).length} topics</div>
            </button>
          ))}
          {avail.length > 0 && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <button className="text-left p-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-slate-400">
                  <Plus className="w-5 h-5 text-slate-500" />
                  <div className="font-bold text-slate-700 mt-1">Add another branch</div>
                  <div className="text-xs text-slate-500 mt-1">Each branch keeps its own progress, XP, level and streaks.</div>
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Add a branch</DialogTitle></DialogHeader>
                <div className="space-y-3">
                  <Select value={newBranch} onValueChange={setNewBranch}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{avail.map((b) => <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newYear} onValueChange={setNewYear}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2026">GATE 2026</SelectItem><SelectItem value="2027">GATE 2027</SelectItem><SelectItem value="2028">GATE 2028</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter><Button onClick={add} className="bg-[#1A1A1A]">Add</Button></DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-[#1A1A1A]">Sign out</div>
            <div className="text-sm text-slate-500">End this session.</div>
          </div>
          <Button onClick={onLogout} variant="outline"><LogOut className="w-4 h-4 mr-1" />Sign out</Button>
        </div>
      </Card>
    </div>
  )
}

// =================== MAIN APP ===================
function App() {
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('Home')
  const [snapshot, setSnapshot] = useState({})
  const [heatmap, setHeatmap] = useState({})
  const [loaded, setLoaded] = useState(false)

  const activeBranch = useMemo(() => user?.branches?.find((b) => b.isActive) || user?.branches?.[0], [user])

  const refresh = async () => {
    if (!user) return
    const u = await api.me(user.id)
    if (u.user) setUser(u.user)
    if (activeBranch) {
      const snap = await api.snapshot(user.id, activeBranch.branchCode)
      setSnapshot(snap)
      const hm = await api.heatmap(user.id)
      setHeatmap(hm.heatmap || {})
    }
  }

  useEffect(() => {
    const id = typeof window !== 'undefined' ? localStorage.getItem('gp_user_id') : null
    if (id) {
      api.me(id).then((r) => { if (r.user) setUser(r.user); setLoaded(true) }).catch(() => setLoaded(true))
    } else {
      setLoaded(true)
    }
  }, [])

  useEffect(() => {
    if (user && activeBranch) {
      api.snapshot(user.id, activeBranch.branchCode).then(setSnapshot)
      api.heatmap(user.id).then((r) => setHeatmap(r.heatmap || {}))
    }
  }, [user?.id, activeBranch?.branchCode])

  const handleAuth = (u) => {
    localStorage.setItem('gp_user_id', u.id)
    setUser(u)
  }
  const logout = () => { localStorage.removeItem('gp_user_id'); setUser(null) }
  const switchBranch = async (code) => {
    await api.switchBranch({ userId: user.id, branchCode: code })
    await refresh()
  }
  const addBranch = async (code, year) => {
    await api.addBranch({ userId: user.id, branchCode: code, targetYear: year })
    await refresh()
  }

  if (!loaded) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  if (!user) return (<><Toaster richColors /><AuthScreen onAuth={handleAuth} /></>)

  return (
    <div className="min-h-screen pb-bottom-nav">
      <Toaster richColors position="top-right" />
      <TopBar user={user} activeBranch={activeBranch} />
      <ActivityTicker />
      <NavBar user={user} page={page} setPage={setPage} activeBranch={activeBranch} onSwitchBranch={switchBranch} onLogout={logout} onAddBranch={addBranch} />
      <AnnouncementBanner />
      <main className="fade-up">
      {page === 'Home' && <HomePage user={user} activeBranch={activeBranch} snapshot={snapshot} heatmap={heatmap} onRefresh={refresh} setPage={setPage} />}
      {page === 'Weightage' && <WeightagePage user={user} activeBranch={activeBranch} />}
      {page === 'Progress' && <ProgressPage user={user} activeBranch={activeBranch} onRefresh={refresh} />}
      {page === 'Revision' && <RevisionPage user={user} activeBranch={activeBranch} onRefresh={refresh} />}
      {page === 'Dashboard' && <DashboardPage user={user} activeBranch={activeBranch} snapshot={snapshot} />}
      {page === 'Community' && <CommunityPage user={user} activeBranch={activeBranch} />}
      {page === 'Resources' && <ResourcesPage activeBranch={activeBranch} />}
      {page === 'PYQs' && <PYQsPage activeBranch={activeBranch} />}
      {page === 'Mock Tests' && <MockTestsPage activeBranch={activeBranch} />}
      {page === 'Settings' && <SettingsPage user={user} activeBranch={activeBranch} onSwitchBranch={switchBranch} onAddBranch={addBranch} onLogout={logout} />}
      </main>

      <footer className="text-center py-8 text-xs text-[#6B5E52] mt-12">
        © GatePlus — <span className="sunrise-text font-semibold">Discipline Se AIR Tak</span> · Crafted with elegance
      </footer>
      <BottomNav page={page} setPage={setPage} />
    </div>
  )
}

export default App
