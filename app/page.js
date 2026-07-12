'use client'

import { useEffect, useMemo, useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Toaster, toast } from 'sonner'
import {
  BookOpen, Calendar, Flame, Target, Clock, Eye, EyeOff, Mail, Lock,
  ChevronDown, ChevronRight, Plus, Play, Pause, RotateCcw, Check, Trophy, Users, Sparkles,
  TrendingUp, BarChart3, Search, GraduationCap, Headphones, Settings as SettingsIcon,
  LogOut, ArrowUpRight, Star, MessageSquare, FileText, Youtube, Video,
  Quote, Megaphone, Bookmark, Folder, Bell, Shield, Trash2, Edit, Download, Cloud, ChevronUp, Menu,
} from 'lucide-react'
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, ResponsiveContainer, LineChart, Line, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts'
import {
  AdminAddBtn, AdminItemControls, CmsModal,
  SCHEMAS, adminApi, useCmsList,
} from '@/components/AdminCMS'

const CHART_COLORS = ['#FF7A18', '#FFB547', '#FFC857', '#A47148', '#FF6B6B', '#2BBF7E', '#1A1A1A', '#FFE5D0', '#F6A65A', '#D97706', '#8B5CF6', '#06B6D4']

const BRANCHES = [
  { code: 'CS', name: 'Computer Science & IT', short: 'Computer Science' },
]
const TARGET_DATES = { 2026: '2026-02-07', 2027: '2027-02-06', 2028: '2028-02-05' }

// ---- Auth token helpers ----
const TOKEN_KEY = 'gp_token'
function getToken() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TOKEN_KEY)
}
export function setToken(t) {
  if (typeof window === 'undefined') return
  if (t) localStorage.setItem(TOKEN_KEY, t); else localStorage.removeItem(TOKEN_KEY)
}
// Every request carries the Bearer token; identity is enforced server-side.
function authHeaders(extra = {}) {
  const t = getToken()
  return { ...(t ? { Authorization: `Bearer ${t}` } : {}), ...extra }
}
const jsonHeaders = () => authHeaders({ 'Content-Type': 'application/json' })

const api = {
  signup: (d) => fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  login: (d) => fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).then((r) => r.json()),
  me: () => fetch(`/api/user/me`, { headers: authHeaders() }).then((r) => r.json()),
  topics: (branch = 'CS') => fetch(`/api/topics?branch=${branch}`).then((r) => r.json()),
  complete: (d) => fetch('/api/topics/complete', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  uncomplete: (d) => fetch('/api/topics/complete', { method: 'DELETE', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  revise: (d) => fetch('/api/topics/revise', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  logSession: (d) => fetch('/api/sessions', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  snapshot: (id, branch) => fetch(`/api/stats/snapshot?branch=${branch}`, { headers: authHeaders() }).then((r) => r.json()),
  heatmap: (id) => fetch(`/api/stats/heatmap`, { headers: authHeaders() }).then((r) => r.json()),
  users: () => fetch('/api/stats/users').then((r) => r.json()),
  roi: (id, branch) => fetch(`/api/stats/roi?branch=${branch}`, { headers: authHeaders() }).then((r) => r.json()),
  activity: () => fetch('/api/activity/recent').then((r) => r.json()),
  leaderboard: (branch) => fetch(`/api/community/leaderboard?branch=${branch}`).then((r) => r.json()),
  posts: () => fetch('/api/community/posts').then((r) => r.json()),
  newPost: (d) => fetch('/api/community/posts', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  goal: (d) => fetch('/api/user/goal', { method: 'PATCH', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  switchBranch: (d) => fetch('/api/user/branch/switch', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
  addBranch: (d) => fetch('/api/user/branch/add', { method: 'POST', headers: jsonHeaders(), body: JSON.stringify(d) }).then((r) => r.json()),
}

// =================== AUTH SCREEN ===================
function AuthScreen({ onAuth }) {
  const [loading, setLoading] = useState(false)

  const handleGoogleCredentialResponse = async (response) => {
    setLoading(true)
    try {
      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      }).then(r => r.json())

      if (res.error) {
        toast.error(res.error)
      } else {
        setToken(res.token)
        toast.success(`Welcome back, ${res.user.username}!`)
        onAuth(res.user)
      }
    } catch (err) {
      toast.error('Google Sign In failed. Network error.')
    }
    setLoading(false)
  }

  useEffect(() => {
    const initGoogle = () => {
      if (window.google) {
        const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
        if (!clientId) { console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID is not configured'); return }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleGoogleCredentialResponse,
        })
        const btnContainer = document.getElementById('google-signin-btn')
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { 
              theme: 'outline', 
              size: 'large', 
              width: '280', 
              shape: 'pill',
              text: 'continue_with'
            }
          )
        }
      }
    }

    if (window.google) {
      initGoogle()
    } else {
      const script = document.createElement('script')
      script.src = 'https://accounts.google.com/gsi/client'
      script.async = true
      script.defer = true
      script.onload = initGoogle
      document.body.appendChild(script)
      return () => {
        if (document.body.contains(script)) {
          document.body.removeChild(script)
        }
      }
    }
  }, [])

  return (
    <div className="min-h-screen bg-[#FAF8F5] flex flex-col justify-between py-8 px-4 relative overflow-hidden" style={{ fontFamily: 'var(--font-inter), sans-serif' }}>
      
      {/* Tactical Grain Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none mix-blend-overlay z-0" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />

      {/* Warm cinematic light blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#FF7A18]/8 blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-[#FFB547]/12 blur-[150px] pointer-events-none z-0" />
      <div className="absolute top-[30%] right-[10%] w-[40%] h-[40%] rounded-full bg-[#FFE5D0]/25 blur-[130px] pointer-events-none z-0" />

      {/* Main split-screen container */}
      <div className="container mx-auto max-w-6xl my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch relative z-10">
        
        {/* LEFT PANEL — Cozy study workspace scene (60% width) */}
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 rounded-[32px] p-8 lg:p-12 relative overflow-hidden flex flex-col justify-between border border-[#FFE5D0]/60 shadow-[0_24px_50px_-12px_rgba(26,26,26,0.03)] min-h-[520px] lg:min-h-[700px]"
        >
          {/* Background Image filling container entirely */}
          <div className="absolute inset-0 z-0 select-none pointer-events-none">
            <img 
              src="/workspace.png" 
              alt="GateFlow Cozy Workspace" 
              className="w-full h-full object-cover object-left md:object-center"
            />
            {/* Warm cinematic overlays for lighting & shadows */}
            <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-transparent mix-blend-normal" />
            <div className="absolute inset-0 bg-gradient-to-tr from-[#FAF8F5]/25 via-transparent to-[#FF7A18]/5 mix-blend-color-burn" />
            {/* Subtle window shadow overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-[#1A1A1A]/5 via-transparent to-[#1A1A1A]/10 mix-blend-multiply" />
          </div>

          {/* Tiny Floating Sparks/Particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-10">
            {[...Array(6)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 rounded-full bg-[#FFB547]/80 blur-[0.5px]"
                style={{
                  top: `${20 + Math.random() * 60}%`,
                  left: `${10 + Math.random() * 80}%`,
                }}
                animate={{
                  y: [0, -40, 0],
                  x: [0, Math.random() * 20 - 10, 0],
                  opacity: [0.1, 0.7, 0.1],
                }}
                transition={{
                  duration: 8 + Math.random() * 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            ))}
          </div>

          {/* Branding Header over Workspace */}
          <div className="flex items-center gap-3 relative z-20">
            <div className="w-9 h-9 rounded-full overflow-hidden shadow-[0_4px_12px_rgba(255,122,24,0.15)] border border-[#FFB547] bg-white flex items-center justify-center">
              <img src="/gateflow-logo.png" alt="GateFlow Logo" className="w-full h-full object-cover" />
            </div>
            <span className="font-serif-display text-xl font-extrabold tracking-tight text-[#1A1A1A]">
              Gate<span className="text-[#FF7A18]">Flow</span>
            </span>
          </div>

          {/* Hero Editorial Text Section */}
          <div className="my-auto py-12 relative z-20 max-w-sm">
            <motion.h1 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              className="font-serif-display text-5xl lg:text-[72px] font-black leading-[1.08] text-[#1A1A1A] tracking-tight"
            >
              Focus.<br />
              Prepare.<br />
              <span className="text-[#FF7A18] drop-shadow-sm">Succeed.</span>
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.8 }}
              className="text-base font-semibold text-[#544637] mt-6 leading-relaxed max-w-xs"
              style={{ textShadow: '0 1px 0 rgba(255,255,255,0.4)' }}
            >
              A focused mind today builds your dream rank tomorrow.
            </motion.p>
          </div>

          <div className="relative z-20 mt-auto flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest font-bold text-[#A47148]/60">Gate CS Preparation System</span>
          </div>
        </motion.div>

        {/* RIGHT PANEL — Premium Glassmorphic Authentication Card (40% width) */}
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 rounded-[32px] p-8 lg:p-12 relative overflow-hidden flex flex-col justify-between border border-white/60 bg-white/45 backdrop-blur-2xl shadow-[0_24px_50px_-15px_rgba(26,26,26,0.06)] min-h-[500px]"
        >
          {/* Warm Ambient Glow behind / inside the glass card */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[240px] rounded-full bg-gradient-to-tr from-[#FF7A18]/10 to-[#FFB547]/10 blur-3xl pointer-events-none -z-10" />

          {/* Top Right Secure Portal indicator */}
          <div className="flex justify-end relative z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-white/70 border border-[#FFE5D0] text-[#A47148] shadow-sm select-none">
              <Shield className="w-3 h-3 text-[#FF7A18]" /> SECURE ACCESS
            </span>
          </div>

          {/* Center Authentication Form Content */}
          <div className="my-auto py-8 flex flex-col items-center justify-center text-center space-y-7 relative z-10">
            
            {/* Floating Graduation Cap Badge */}
            <motion.div 
              whileHover={{ scale: 1.03 }}
              className="w-20 h-20 rounded-full bg-gradient-to-b from-white/95 to-white/75 border border-[#FFE5D0] shadow-[0_8px_30px_-4px_rgba(255,122,24,0.08)] flex items-center justify-center relative group"
            >
              <div className="absolute inset-0 rounded-full bg-[#FF7A18]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <GraduationCap className="w-9 h-9 text-[#FF7A18]" />
              <Sparkles className="w-3.5 h-3.5 text-[#FFB547] absolute -top-0.5 -right-0.5 animate-pulse" />
            </motion.div>

            {/* Headings */}
            <div className="space-y-2">
              <h2 className="font-serif-display text-3xl font-extrabold text-[#1A1A1A] tracking-tight">
                Welcome to GateFlow
              </h2>
              <p className="text-sm text-[#6B5E52] leading-relaxed max-w-[240px] mx-auto font-medium">
                Let's continue your preparation journey.
              </p>
            </div>

            {/* Single Authentication Action Button (Google) */}
            <div className="w-full max-w-[280px] flex flex-col items-center pt-3">
              <motion.div 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full relative group"
              >
                {/* Subtle button glow halo */}
                <div className="absolute -inset-[1px] bg-gradient-to-r from-[#FF7A18]/40 to-[#FFB547]/40 rounded-full blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                
                <div className="relative bg-white border border-[#FFE5D0] rounded-full p-0.5 flex justify-center items-center shadow-[0_2px_8px_rgba(26,26,26,0.02)] transition-colors hover:border-[#FF7A18]/45">
                  <div id="google-signin-btn" className="w-full flex justify-center" style={{ minHeight: '44px' }} />
                </div>
              </motion.div>
              
              {loading && (
                <motion.span 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[11px] text-[#A47148] font-semibold animate-pulse mt-4"
                >
                  Connecting to Google Secure Server...
                </motion.span>
              )}
            </div>

          </div>

          {/* Bottom security assurance message */}
          <div className="pt-6 border-t border-[#FFE5D0]/30 text-center relative z-10 flex flex-col items-center gap-1">
            <div className="flex items-center justify-center gap-1.5 text-xs text-[#A47148] font-bold">
              <span>🔒</span>
              <span>Your data is secure.</span>
            </div>
            <p className="text-[10px] text-[#8C7E72] font-semibold">We never share your information.</p>
          </div>

        </motion.div>

      </div>

      {/* Footer Branding credits */}
      <div className="text-center text-xs text-[#8C7E72]/70 mt-6 relative z-10 font-medium tracking-wide">
        © 2026 GateFlow • Your Journey. Your Rank. Your Glory.
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
    } catch { }
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
          <button aria-label="Dismiss announcement" onClick={() => { const d = { ...dismissed, [a.id]: 1 }; setDismissed(d); sessionStorage.setItem('gp_dismissed_ann', JSON.stringify(d)) }} className="text-white/90 hover:text-white text-xl leading-none px-2">×</button>
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
  const [stats, setStats] = useState({ total: 0 })
  useEffect(() => {
    const load = async () => {
      const r = await api.activity().catch(() => ({ events: [] }))
      setEvents(r.events || [])
      const s = await api.users().catch(() => ({ total: 0 }))
      setStats(s)
    }
    load()
    const t = setInterval(load, 8000)
    return () => clearInterval(t)
  }, [])
  const items = []
  events.forEach((e) => items.push({ type: 'evt', data: e }))
  if (stats.total > 0) items.push({ type: 'stat', data: stats })
  if (items.length === 0) return null
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
                <span className="text-slate-600">|</span>
              </>
            ) : (
              <>
                <GraduationCap className="w-3 h-3" style={{ color: '#FF7A18' }} />
                <span>{(it.data.total || 0).toLocaleString()} GATE aspirants are preparing on GateFlow across CS, DA, EC, EE, ME &amp; CE</span>
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
  { name: 'Syllabus', icon: BookOpen },
  { name: 'Tracker', icon: Check },
  { name: 'Revision', icon: RotateCcw },
  { name: 'Dashboard', icon: BarChart3 },
  { name: 'Resources', icon: FileText },
  { name: 'PYQs', icon: FileText },
  { name: 'Mock Tests', icon: Trophy },
]

function NavBar({ user, page, setPage, activeBranch, onSwitchBranch, onLogout, onAddBranch }) {
  const [logoExpanded, setLogoExpanded] = useState(false)

  return (
    <>
      {/* ── Fullscreen logo overlay ── */}
      {logoExpanded && (
        <div
          onClick={() => setLogoExpanded(false)}
          className="fixed inset-0 z-[9999] flex items-center justify-center cursor-zoom-out"
          style={{
            background: 'rgba(0,0,0,0.85)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            animation: 'fadeInOverlay 0.25s ease',
          }}
        >
          <div
            style={{ animation: 'popInLogo 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}
            onClick={e => e.stopPropagation()}
          >
            <img
              src="/gateflow-logo.png"
              alt="GateFlow Logo"
              style={{
                width: 'min(80vw, 80vh)',
                height: 'min(80vw, 80vh)',
                borderRadius: '50%',
                objectFit: 'cover',
                boxShadow: '0 0 80px rgba(255,122,24,0.5), 0 0 160px rgba(255,181,71,0.25)',
                border: '4px solid #FFB547',
              }}
            />
          </div>
          {/* Tap anywhere hint */}
          <div
            style={{
              position: 'absolute',
              bottom: '2rem',
              left: '50%',
              transform: 'translateX(-50%)',
              color: 'rgba(255,255,255,0.55)',
              fontSize: '13px',
              fontWeight: 500,
              letterSpacing: '0.04em',
              pointerEvents: 'none',
            }}
          >
            Tap anywhere to close
          </div>
        </div>
      )}

      {/* Keyframe injection */}
      <style>{`
        @keyframes fadeInOverlay {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popInLogo {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>

      <div className="w-full sticky top-3 z-30 px-3">
        <div className="container mx-auto">
          <div className="glass rounded-2xl shadow-[0_10px_40px_-12px_rgba(255,122,24,0.18)] px-4 h-16 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <button onClick={() => setPage('Home')} className="flex items-center gap-2 group">
                <div
                  onClick={e => { e.stopPropagation(); setLogoExpanded(true) }}
                  className="w-10 h-10 rounded-full overflow-hidden shadow-lg border-2 border-[#FFB547] group-hover:scale-110 transition-transform cursor-zoom-in shrink-0"
                  title="Click to expand logo"
                >
                  <img src="/gateflow-logo.png" alt="GateFlow Logo" className="w-full h-full object-cover" />
                </div>
                <span className="font-serif-display text-lg font-bold text-[#1A1A1A] hidden sm:block">Gate<span className="sunrise-text">Flow</span></span>
              </button>
              <div className="hidden md:flex items-center px-3 py-1 rounded-full bg-[#FFF8EE] border border-[#FFE5D0] text-[11px] font-bold text-[#A47148]">GATE CS '{String(activeBranch?.targetYear || 27).slice(-2)}</div>
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
              <button aria-label="Open settings" onClick={() => setPage('Settings')} className="w-9 h-9 rounded-full sunrise-gradient flex items-center justify-center text-xs font-bold text-white shadow-md">
                {user.username[0].toUpperCase()}
              </button>
              <button aria-label="Sign out" onClick={onLogout} className="hidden md:flex w-9 h-9 rounded-full hover:bg-[#FFE5D0]/60 items-center justify-center text-[#2A2A2A]" title="Sign out"><LogOut className="w-4 h-4" /></button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}


function BottomNav({ page, setPage }) {
  const [isMoreOpen, setIsMoreOpen] = useState(false)

  const mainItems = [
    { name: 'Home', icon: Sparkles },
    { name: 'Syllabus', icon: BookOpen },
    { name: 'Tracker', icon: Check },
    { name: 'Dashboard', icon: BarChart3 },
  ]

  const moreItems = [
    { 
      name: 'Revision', 
      icon: RotateCcw, 
      desc: 'Quick syllabus revision',
      activeClass: 'bg-purple-500/10 border-purple-200 text-purple-700 font-bold',
      inactiveClass: 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/80 text-slate-700',
      iconClass: 'bg-purple-100 text-purple-600 border border-purple-200/50'
    },
    { 
      name: 'Resources', 
      icon: FileText, 
      desc: 'Reference notes & books',
      activeClass: 'bg-emerald-500/10 border-emerald-200 text-emerald-700 font-bold',
      inactiveClass: 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/80 text-slate-700',
      iconClass: 'bg-emerald-100 text-emerald-600 border border-emerald-200/50'
    },
    { 
      name: 'PYQs', 
      icon: FileText, 
      desc: 'GATE previous year papers',
      activeClass: 'bg-blue-500/10 border-blue-200 text-blue-700 font-bold',
      inactiveClass: 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/80 text-slate-700',
      iconClass: 'bg-blue-100 text-blue-600 border border-blue-200/50'
    },
    { 
      name: 'Mock Tests', 
      icon: Trophy, 
      desc: 'Exam mock sessions & results',
      activeClass: 'bg-rose-500/10 border-rose-200 text-rose-700 font-bold',
      inactiveClass: 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/80 text-slate-700',
      iconClass: 'bg-rose-100 text-rose-600 border border-rose-200/50'
    },
    { 
      name: 'Settings', 
      icon: SettingsIcon, 
      desc: 'Manage your settings',
      activeClass: 'bg-amber-500/10 border-amber-200 text-amber-800 font-bold',
      inactiveClass: 'bg-slate-50/50 hover:bg-slate-50 border-slate-100/80 text-slate-700',
      iconClass: 'bg-amber-100 text-amber-700 border border-amber-200/50'
    },
  ]

  const isMoreActive = moreItems.some(item => item.name === page)

  return (
    <div className="lg:hidden fixed bottom-3 left-3 right-3 z-40">
      <div className="glass rounded-2xl shadow-[0_10px_40px_-8px_rgba(255,122,24,0.25)] px-2 py-2 flex items-center justify-around">
        {mainItems.map(({ name, icon: Icon }) => {
          const active = page === name
          return (
            <button 
              key={name} 
              onClick={() => {
                setPage(name)
                setIsMoreOpen(false)
              }} 
              className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition ${active ? 'sunrise-gradient text-white shadow-md' : 'text-[#2A2A2A]'}`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] font-semibold">{name}</span>
            </button>
          )
        })}

        {/* More Tab */}
        <button 
          onClick={() => setIsMoreOpen(true)}
          className={`flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-xl transition ${isMoreActive ? 'sunrise-gradient text-white shadow-md' : 'text-[#2A2A2A]'}`}
        >
          <ChevronUp className="w-4 h-4" />
          <span className="text-[10px] font-semibold">More</span>
        </button>
      </div>

      {/* Centered Dialog overlay for mobile/narrow screen secondary tabs */}
      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="max-w-xs rounded-3xl p-5 border-t-4 border-t-[#FF7A18] border-x border-b border-slate-100 shadow-2xl bg-[#FFFDF9]">
          <DialogHeader className="text-left pb-1">
            <DialogTitle className="text-sm font-black text-[#1A1A1A]">
              Gate<span className="sunrise-text">Flow</span> Sections
            </DialogTitle>
          </DialogHeader>
          
          <div className="grid grid-cols-1 gap-2.5 mt-2 py-1 text-xs">
            {moreItems.map(({ name, icon: Icon, desc, activeClass, inactiveClass, iconClass }) => {
              const active = page === name
              return (
                <button
                  key={name}
                  onClick={() => {
                    setPage(name)
                    setIsMoreOpen(false)
                  }}
                  className={`flex items-center gap-3.5 p-2.5 rounded-2xl transition border text-left ${active ? activeClass : inactiveClass}`}
                >
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${active ? 'sunrise-gradient text-white' : iconClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs">{name}</div>
                    <div className="text-[9px] text-slate-400 mt-0.5 truncate">{desc}</div>
                  </div>
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// =================== HOME PAGE ===================
function HomePage({ user, activeBranch, snapshot, heatmap, onTopicComplete, onRefresh, setPage }) {

  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      {/* Hero */}
      <div className="rounded-3xl p-8 md:p-12 relative overflow-hidden card-luxe">
        <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full opacity-40" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 65%)' }} />
        <div className="absolute -bottom-32 -left-20 w-[400px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 65%)' }} />
        <div className="relative flex flex-col md:flex-row md:items-stretch md:justify-between gap-6">
          {/* Left: text content */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6 bg-white/70 border border-[#FFE5D0] text-[#A47148] self-start">
              <Trophy className="w-3 h-3 text-[#FF7A18]" /> GATE CS {activeBranch.targetYear} preparation system
            </div>
            <h1 className="font-serif-display text-5xl md:text-6xl font-bold leading-[1.05] text-[#1A1A1A]">
              Gate<span className="sunrise-text">Flow</span>
            </h1>
            <p className="mt-5 font-serif-display text-2xl md:text-3xl font-semibold text-[#2A2A2A]">Your Complete GATE CS Preparation System</p>
            <p className="mt-3 max-w-2xl text-[#6B5E52]">
              Resources, PYQs, Revision Notes, Mock Tests, and Progress Tracking — all in one place.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <button onClick={() => setPage('Syllabus')} className="btn-sunrise px-5 py-2.5 rounded-xl font-semibold text-sm">Start studying →</button>
              <button onClick={() => setPage('Resources')} className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-white/80 border border-[#FFE5D0] text-[#2A2A2A] hover:bg-white">Browse resources</button>
            </div>
          </div>

          {/* Right: QR codes — stretch full hero height, clickable, no empty space */}
          <div className="hidden md:flex flex-row gap-4 shrink-0 self-stretch">
            {/* Instagram QR */}
            <a
              href="https://www.instagram.com/gateflow_official"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-2xl overflow-hidden shadow-xl border-2 border-[#FFE5D0] bg-white hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 cursor-pointer"
              style={{ width: 195 }}
              title="Follow on Instagram @gateflow_official"
            >
              <div className="flex-1 w-full overflow-hidden">
                <img src="/qr-instagram.jpg" alt="Instagram QR - @GATEFLOW_OFFICIAL" className="w-full h-full object-fill" />
              </div>
              <div className="flex items-center justify-center gap-1.5 py-2 bg-white border-t border-[#FFE5D0]" style={{ fontSize: 11, fontWeight: 700, color: '#A47148', letterSpacing: '0.05em' }}>
                <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: '#E1306C', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>@gateflow_official</span>
              </div>
            </a>

            {/* YouTube QR */}
            <a
              href="https://youtube.com/@gateflow-i5g?si=8yU31PzpH1BomV12"
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col rounded-2xl overflow-hidden shadow-xl border-2 border-[#FFE5D0] bg-white hover:scale-[1.02] hover:shadow-2xl transition-all duration-200 cursor-pointer"
              style={{ width: 195 }}
              title="Subscribe on YouTube @gateflow"
            >
              <div className="flex-1 w-full overflow-hidden">
                <img src="/qr-youtube.jpg" alt="YouTube QR - GateFlow" className="w-full h-full object-fill" />
              </div>
              <div className="flex items-center justify-center gap-1.5 py-2 bg-white border-t border-[#FFE5D0]" style={{ fontSize: 11, fontWeight: 700, color: '#A47148', letterSpacing: '0.05em' }}>
                <svg viewBox="0 0 24 24" style={{ width: 13, height: 13, fill: '#FF0000', flexShrink: 0 }} xmlns="http://www.w3.org/2000/svg">
                  <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                </svg>
                <span>@gateflow</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      {/* Action Center */}
      <section>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-1 h-8 rounded-full sunrise-gradient" />
          <div>
            <h3 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Action Center</h3>
            <p className="text-sm text-[#6B5E52] mt-0.5">Learn. Practice. Revise. Repeat.</p>
          </div>
        </div>

        {/* Primary row: Tracker + PYQs */}
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <button onClick={() => setPage('Tracker')} className="card-luxe p-6 text-left hover:translate-y-[-2px] transition group relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 70%)' }} />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 sunrise-gradient shadow-md">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[#1A1A1A] text-lg">Progress Tracker</div>
                <p className="text-sm text-[#6B5E52] mt-1">Track every topic you complete. Mark done and grow your streak daily.</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden">
                    <div className="h-full rounded-full sunrise-gradient" style={{ width: `${Math.min(100, Math.round(((activeBranch.completedTopics || []).length / 120) * 100))}%` }} />
                  </div>
                  <span className="text-xs font-semibold text-[#FF7A18]">{(activeBranch.completedTopics || []).length} done</span>
                </div>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-semibold mt-4 text-[#FF7A18] group-hover:gap-2 gap-1 transition-all">Open Tracker <ArrowUpRight className="w-3 h-3" /></span>
          </button>

          <button onClick={() => setPage('PYQs')} className="card-luxe p-6 text-left hover:translate-y-[-2px] transition group relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #FFB547 0%, transparent 70%)' }} />
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, #FFB547, #FF7A18)' }}>
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <div className="font-bold text-[#1A1A1A] text-lg">Previous Year Questions</div>
                <p className="text-sm text-[#6B5E52] mt-1">Chapter-wise PYQs from GATE 2010–2024. Solve the most important questions first.</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {['DSA', 'OS', 'DBMS', 'Algo', 'CN'].map(t => (
                    <span key={t} className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE5D0] text-[#A47148]">{t}</span>
                  ))}
                </div>
              </div>
            </div>
            <span className="inline-flex items-center text-xs font-semibold mt-4 text-[#FF7A18] group-hover:gap-2 gap-1 transition-all">Solve PYQs <ArrowUpRight className="w-3 h-3" /></span>
          </button>
        </div>

        {/* Secondary row: Mock Tests + Syllabus Revision + Resources */}
        <div className="grid md:grid-cols-3 gap-4">
          <button onClick={() => setPage('Mock Tests')} className="card-luxe p-5 text-left hover:translate-y-[-2px] transition group relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #8B5CF6 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
              <Trophy className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-[#1A1A1A]">Mock Tests</div>
            <p className="text-sm text-[#6B5E52] mt-1">Full-length & subject-wise mocks. Simulate the real GATE exam environment.</p>
            <span className="inline-flex items-center text-xs font-semibold mt-3 text-[#8B5CF6] group-hover:gap-2 gap-1 transition-all">Take a test <ArrowUpRight className="w-3 h-3" /></span>
          </button>

          <button onClick={() => setPage('Revision')} className="card-luxe p-5 text-left hover:translate-y-[-2px] transition group relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #06B6D4 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #06B6D4, #0284C7)' }}>
              <RotateCcw className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-[#1A1A1A]">Syllabus Revision</div>
            <p className="text-sm text-[#6B5E52] mt-1">Quick-revision mode for topics you&apos;ve already studied. Stay sharp before the exam.</p>
            <span className="inline-flex items-center text-xs font-semibold mt-3 text-[#06B6D4] group-hover:gap-2 gap-1 transition-all">Start revision <ArrowUpRight className="w-3 h-3" /></span>
          </button>

          <button onClick={() => setPage('Resources')} className="card-luxe p-5 text-left hover:translate-y-[-2px] transition group relative overflow-hidden">
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10" style={{ background: 'radial-gradient(circle, #2BBF7E 0%, transparent 70%)' }} />
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: 'linear-gradient(135deg, #2BBF7E, #059669)' }}>
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div className="font-bold text-[#1A1A1A]">Study Resources</div>
            <p className="text-sm text-[#6B5E52] mt-1">PDFs, notes, handwritten sheets and reference material for every subject.</p>
            <span className="inline-flex items-center text-xs font-semibold mt-3 text-[#2BBF7E] group-hover:gap-2 gap-1 transition-all">Browse all <ArrowUpRight className="w-3 h-3" /></span>
          </button>
        </div>
      </section>

      {/* Daily Momentum */}
      <section>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full sunrise-gradient" />
          <div>
            <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Daily Momentum</h2>
          </div>
        </div>
        <p className="text-sm text-[#A47148] italic font-medium mb-5 ml-4">&ldquo;Consistency beats intensity. Show up every day, and success will follow.&rdquo;</p>
        <Card className="card-luxe p-6">
          {/* 3 stat cards */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-5 rounded-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FF7A18 0%, #FFB547 100%)' }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 bg-white" />
              <div className="text-[10px] font-bold tracking-widest text-white/80 mb-1">CURRENT STREAK</div>
              <div className="font-serif-display text-4xl font-bold text-white flex items-baseline gap-1">{snapshot.streak || 0}<span className="text-base font-normal text-white/70">days</span></div>
              <div className="text-xs text-white/70 mt-1">🔥 Keep it up</div>
            </div>
            <div className="p-5 rounded-2xl relative overflow-hidden bg-[#1A1A1A]">
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-[#FFB547]" />
              <div className="text-[10px] font-bold tracking-widest text-[#FFB547]/80 mb-1">MAX STREAK</div>
              <div className="font-serif-display text-4xl font-bold text-white flex items-baseline gap-1">{snapshot.maxStreak || 0}<span className="text-base font-normal text-white/50">days</span></div>
              <div className="text-xs text-white/50 mt-1">🏆 Personal best</div>
            </div>
            <div className="p-5 rounded-2xl relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2A2A2A 0%, #1A1A1A 100%)', border: '1px solid rgba(255,181,71,0.2)' }}>
              <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-10 bg-[#FF7A18]" />
              <div className="text-[10px] font-bold tracking-widest text-[#FFB547]/80 mb-1">ACTIVE DAYS</div>
              <div className="font-serif-display text-4xl font-bold text-white">{user.totalActiveDays || 0}</div>
              <div className="text-xs text-white/50 mt-1">📅 Total study days</div>
            </div>
          </div>
          {/* LeetCode-style heatmap */}
          <div className="overflow-x-auto">
            <EnhancedHeatmap heatmap={heatmap} />
          </div>
          <div className="flex items-center justify-end gap-2 mt-4 text-xs text-slate-400">
            <span>Less</span>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#F1E9DF' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#FFE5D0' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#FFC857' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#FFB547' }} />
            <div style={{ width: 14, height: 14, borderRadius: 3, background: '#FF7A18' }} />
            <span>More</span>
          </div>
        </Card>
      </section>

      <div className="text-center pt-4 pb-2">
        <p className="font-serif-display text-xl font-bold text-[#1A1A1A]">GATE CSE {activeBranch.targetYear || 2027} 🎯</p>
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
                <div key={di} title={`${ds} — ${h.minutes} min, ${h.topics} topics`} className={`heatmap-cell ${['', 'heatmap-l1', 'heatmap-l2', 'heatmap-l3', 'heatmap-l4'][lv]} ${isToday ? 'heatmap-today' : ''}`} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// LeetCode-style big heatmap with month labels and orange colors
function EnhancedHeatmap({ heatmap }) {
  const CELL = 16
  const GAP = 3
  const today = new Date()
  const start = new Date(today)
  start.setDate(start.getDate() - 7 * 26) // ~6 months
  start.setDate(start.getDate() - start.getDay()) // align to Sunday

  const weeks = []
  for (let w = 0; w < 27; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + w * 7 + d)
      days.push(day)
    }
    weeks.push(days)
  }

  const ORANGE = ['#F1E9DF', '#FFE5D0', '#FFC857', '#FFB547', '#FF7A18']
  const level = (mins, topics) => {
    if (!mins && !topics) return 0
    if (mins > 240 || topics >= 6) return 4
    if (mins > 120 || topics >= 4) return 3
    if (mins > 30 || topics >= 2) return 2
    return 1
  }

  const todayStr = today.toISOString().split('T')[0]
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Build month label positions
  const monthLabels = []
  weeks.forEach((week, wi) => {
    const firstDay = week.find(d => d.getDate() <= 7)
    if (firstDay) {
      const m = firstDay.getMonth()
      const lastLabel = monthLabels[monthLabels.length - 1]
      if (!lastLabel || lastLabel.month !== m) {
        monthLabels.push({ month: m, weekIndex: wi })
      }
    }
  })

  const totalW = weeks.length * (CELL + GAP)
  const totalH = 7 * (CELL + GAP) + 24 // +24 for month labels

  return (
    <div className="min-w-max">
      {/* Month labels */}
      <div className="flex mb-1" style={{ paddingLeft: 28 }}>
        {weeks.map((week, wi) => {
          const label = monthLabels.find(l => l.weekIndex === wi)
          return (
            <div key={wi} style={{ width: CELL + GAP, flexShrink: 0, fontSize: 11, color: '#A47148', fontWeight: 600 }}>
              {label ? MONTHS[label.month] : ''}
            </div>
          )
        })}
      </div>
      {/* Grid */}
      <div className="flex gap-0" style={{ gap: GAP }}>
        {/* Day labels */}
        <div className="flex flex-col mr-1" style={{ gap: GAP }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
            <div key={d} style={{ width: 24, height: CELL, fontSize: 10, color: '#A47148', display: 'flex', alignItems: 'center', fontWeight: 500 }}>
              {i % 2 === 1 ? d : ''}
            </div>
          ))}
        </div>
        {/* Cells */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col" style={{ gap: GAP }}>
            {week.map((day, di) => {
              const ds = day.toISOString().split('T')[0]
              const h = heatmap[ds] || { minutes: 0, topics: 0 }
              const lv = level(h.minutes, h.topics)
              const isToday = ds === todayStr
              return (
                <div
                  key={di}
                  title={`${ds} — ${h.minutes} min, ${h.topics} topics`}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    background: ORANGE[lv],
                    boxShadow: isToday ? '0 0 0 2px #1A1A1A' : undefined,
                    transition: 'transform 0.1s',
                    cursor: 'default',
                  }}
                />
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
                  <td className="p-3 font-mono text-slate-400">{String(i + 1).padStart(2, '0')}</td>
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

// =================== YOUTUBE LINKS MAP ===================
// Key format: 'subjectKey:index' matching seedData.js CS_TOPICS order
const YOUTUBE_LINKS = {
  // Engineering Mathematics
  'math:0': 'https://www.youtube.com/watch?v=2mJ4nSqTFPU',  // Probability & Bayes
  'math:1': 'https://www.youtube.com/watch?v=_1zmK9YMboo',  // Probability distributions
  'math:2': 'https://www.youtube.com/watch?v=PFDu9oVAE-g',  // Eigenvalues & eigenvectors
  'math:3': 'https://www.youtube.com/watch?v=uQhTuRlWMxw',  // Rank & systems
  'math:4': 'https://www.youtube.com/watch?v=riXcZT2ICjA',  // Limits & continuity
  'math:5': 'https://www.youtube.com/watch?v=5yfh5cf4-0Y',  // Maxima & minima
  'math:6': 'https://www.youtube.com/watch?v=rfG8ce4nNh0',  // Integration
  'math:7': 'https://www.youtube.com/watch?v=iJ8EHZ5JMkk',  // Combinatorics
  'math:8': 'https://www.youtube.com/watch?v=LFKZLXVO-Dg',  // Graph Theory degree
  'math:9': 'https://www.youtube.com/watch?v=YRZoAcJDREw',  // Graph Theory trees
  // Discrete Mathematics
  'discrete:0': 'https://www.youtube.com/watch?v=Rm5Mv2DFNpE', // Mathematical logic
  'discrete:1': 'https://www.youtube.com/watch?v=gyoqX0W-NH4', // Predicate logic
  'discrete:2': 'https://www.youtube.com/watch?v=eirxi7i9hk4', // Sets & relations
  'discrete:3': 'https://www.youtube.com/watch?v=dJUEkjxylBw', // Functions
  'discrete:4': 'https://www.youtube.com/watch?v=oBt53YbR9Kk', // Euler & Hamiltonian
  'discrete:5': 'https://www.youtube.com/watch?v=h9wxtqoa1jY', // Graph coloring
  'discrete:6': 'https://www.youtube.com/watch?v=yuMnHAkIJnI', // Combinatorics PIE
  'discrete:7': 'https://www.youtube.com/watch?v=eAaP4XaB8hM', // Recurrence relations
  'discrete:8': 'https://www.youtube.com/watch?v=bOXCLR3Wric', // Generating functions
  // Algorithms
  'algorithms:0': 'https://www.youtube.com/watch?v=A03oI0znAoc', // Asymptotic analysis
  'algorithms:1': 'https://www.youtube.com/watch?v=OynWkEj0S-s', // Master theorem
  'algorithms:2': 'https://www.youtube.com/watch?v=sn0DWI-JdNA', // Huffman coding
  'algorithms:3': 'https://www.youtube.com/watch?v=cplfcGZmX7I', // Prim's MST
  'algorithms:4': 'https://www.youtube.com/watch?v=4ZlRH0eK-qQ', // Kruskal's MST
  'algorithms:5': 'https://www.youtube.com/watch?v=10WnvBk9sZc', // LCS
  'algorithms:6': 'https://www.youtube.com/watch?v=vRVfmbCFW7Y', // Matrix Chain
  'algorithms:7': 'https://www.youtube.com/watch?v=8LusJS5-AGo', // 0/1 Knapsack
  'algorithms:8': 'https://www.youtube.com/watch?v=4VqmGXwpLqc', // Divide & conquer sort
  'algorithms:9': 'https://www.youtube.com/watch?v=MFEc-WHnTRo', // Divide & conquer search
  'algorithms:10': 'https://www.youtube.com/watch?v=oDqjPvD54Ss', // BFS
  'algorithms:11': 'https://www.youtube.com/watch?v=7fujbpJ0LB4', // DFS
  'algorithms:12': 'https://www.youtube.com/watch?v=GazC3A4OQTE', // Dijkstra
  'algorithms:13': 'https://www.youtube.com/watch?v=obWXjtg0L64', // Bellman-Ford
  'algorithms:14': 'https://www.youtube.com/watch?v=4NQ3HnhyNfQ', // Floyd-Warshall
  'algorithms:15': 'https://www.youtube.com/watch?v=kPRA0W1kECg', // Sorting
  // Data Structures
  'ds:0': 'https://www.youtube.com/watch?v=VFZNvHFMQDY',  // Arrays
  'ds:1': 'https://www.youtube.com/watch?v=njTh_OwMljA',  // Linked lists
  'ds:2': 'https://www.youtube.com/watch?v=F1Zzwzvwg4w',  // Stacks & queues
  'ds:3': 'https://www.youtube.com/watch?v=pYT9F8_LFTM',  // BST, AVL
  'ds:4': 'https://www.youtube.com/watch?v=aZjYr87r1b8',  // B-trees
  'ds:5': 'https://www.youtube.com/watch?v=t0Cq6tVNRBA',  // Heaps
  'ds:6': 'https://www.youtube.com/watch?v=KyUTuwz_b7Q',  // Hashing
  'ds:7': 'https://www.youtube.com/watch?v=AfYqcyke5Rs',  // Graph representation
  'ds:8': 'https://www.youtube.com/watch?v=zOjov-2OZ0E',  // C basics
  'ds:9': 'https://www.youtube.com/watch?v=zuegQmMdy8M',  // C pointers
  'ds:12': 'https://www.youtube.com/watch?v=IJDJ0kBx2LM', // Recursion
  'ds:13': 'https://www.youtube.com/watch?v=kgBjXUE_Nwc', // Sorting in DS
  // Operating Systems
  'os:0': 'https://www.youtube.com/watch?v=26QPDBe-NB8',  // Process management
  'os:1': 'https://www.youtube.com/watch?v=eynMpRMbUKk',  // FCFS scheduling
  'os:2': 'https://www.youtube.com/watch?v=Q8WLVFKrBGo',  // SJF scheduling
  'os:3': 'https://www.youtube.com/watch?v=aWlQYllBZDs',  // Round Robin
  'os:4': 'https://www.youtube.com/watch?v=EWkQl0n0w5M',  // Priority scheduling
  'os:5': 'https://www.youtube.com/watch?v=XDIOC-FzvwI',  // Semaphores
  'os:6': 'https://www.youtube.com/watch?v=jlH5qjknxTg',  // Monitors
  'os:7': 'https://www.youtube.com/watch?v=xoJ1OLNzDXs',  // Deadlock detection
  'os:8': 'https://www.youtube.com/watch?v=4gQAC45KA9s',  // Deadlock prevention
  'os:9': 'https://www.youtube.com/watch?v=pPzVV2kkGHc',  // Paging
  'os:10': 'https://www.youtube.com/watch?v=aYnwFBOnSRs', // Segmentation
  'os:11': 'https://www.youtube.com/watch?v=2quKyPnUShQ', // Page replacement
  'os:12': 'https://www.youtube.com/watch?v=KiBW9MDM7do', // File systems
  // DBMS
  'dbms:0': 'https://www.youtube.com/watch?v=Hj-7A2XKkRk', // ER model
  'dbms:1': 'https://www.youtube.com/watch?v=H5NjUDIaAks', // Relational algebra
  'dbms:2': 'https://www.youtube.com/watch?v=HXV3zeQKqGY', // SQL basics
  'dbms:3': 'https://www.youtube.com/watch?v=9yeOJ0ZMUYw', // SQL joins
  'dbms:4': 'https://www.youtube.com/watch?v=GFQaEYEc8_8', // Normalization
  'dbms:5': 'https://www.youtube.com/watch?v=eYQwKi7P8MM', // ACID
  'dbms:6': 'https://www.youtube.com/watch?v=pWU0rHMkxJ0', // Concurrency control
  'dbms:7': 'https://www.youtube.com/watch?v=aZjYr87r1b8', // Indexing B+ trees
  'dbms:8': 'https://www.youtube.com/watch?v=sTwMSNKFAMU', // Query optimization
  // Computer Networks
  'cn:0': 'https://www.youtube.com/watch?v=vv4y_uOneC0',  // OSI & TCP/IP
  'cn:1': 'https://www.youtube.com/watch?v=hExRDVZHhig',  // Data link
  'cn:2': 'https://www.youtube.com/watch?v=E5bSumTAHZE',  // MAC protocols
  'cn:3': 'https://www.youtube.com/watch?v=QD3oCelHJ20',  // Go-Back-N
  'cn:4': 'https://www.youtube.com/watch?v=WfIhQ46W8xA',  // Selective Repeat
  'cn:5': 'https://www.youtube.com/watch?v=ecCuyq-Wprc',  // IP addressing
  'cn:6': 'https://www.youtube.com/watch?v=tN8a0ZTQTCQ',  // Routing protocols
  'cn:7': 'https://www.youtube.com/watch?v=uwoD5YsGACg',  // TCP vs UDP
  // Theory of Computation
  'toc:0': 'https://www.youtube.com/watch?v=58N2N7zJGrQ', // DFA & NFA
  'toc:1': 'https://www.youtube.com/watch?v=shMnI5GvtgA', // Regular expressions
  'toc:2': 'https://www.youtube.com/watch?v=Dy9j7RDXqPk', // CFG
  'toc:3': 'https://www.youtube.com/watch?v=jMxuL4Xzi_A', // PDA
  'toc:4': 'https://www.youtube.com/watch?v=gJQTFhkhwPA', // Turing machines
  'toc:5': 'https://www.youtube.com/watch?v=HeQX2HjkcNo', // Decidability
  'toc:6': 'https://www.youtube.com/watch?v=YX40hbAHx3s', // Complexity classes
  // Compiler Design
  'cd:0': 'https://www.youtube.com/watch?v=4ME7KT-1_kA',  // Lexical analysis
  'cd:1': 'https://www.youtube.com/watch?v=HKJMDJ5wvhw',  // LL(1) parsing
  'cd:2': 'https://www.youtube.com/watch?v=Ws41HvRDgDo',  // LR parsing
  'cd:3': 'https://www.youtube.com/watch?v=YyM_PJDLHdo',  // SDD
  'cd:4': 'https://www.youtube.com/watch?v=sOfa4BVSQ2U',  // Intermediate code
  // Digital Logic
  'dl:0': 'https://www.youtube.com/watch?v=ep3D_LC2UzU',  // Boolean algebra
  'dl:1': 'https://www.youtube.com/watch?v=XERNrKAvAGI',  // Combinational circuits
  'dl:2': 'https://www.youtube.com/watch?v=UMb2fOBjWjE',  // Sequential / flip-flops
  'dl:3': 'https://www.youtube.com/watch?v=kRlMKVkNFug',  // Counters & registers
  'dl:4': 'https://www.youtube.com/watch?v=M9OALV2KUEY',  // Number systems
  // COA
  'coa:0': 'https://www.youtube.com/watch?v=FZGugFqdr60', // Instructions & addressing
  'coa:1': 'https://www.youtube.com/watch?v=1OjUA4-pMyY', // ALU design
  'coa:2': 'https://www.youtube.com/watch?v=jPKBWJkYOaI', // Control unit
  'coa:3': 'https://www.youtube.com/watch?v=dkhZdGMPmNk', // Pipelining
  'coa:4': 'https://www.youtube.com/watch?v=yi0FhRqDJfo', // Cache memory
  'coa:5': 'https://www.youtube.com/watch?v=ql3Wd7G1DvQ', // Memory hierarchy
  // Aptitude
  'aptitude:0': 'https://www.youtube.com/watch?v=7nCqvf4BPFU', // Ratios & percentages
  'aptitude:1': 'https://www.youtube.com/watch?v=wvHKgFIhsPw', // Time speed distance
  'aptitude:2': 'https://www.youtube.com/watch?v=_2J7PVfLxXg', // Work & time
  'aptitude:3': 'https://www.youtube.com/watch?v=N1T3seiRUbw', // Profit & loss
  'aptitude:5': 'https://www.youtube.com/watch?v=OobLb5TFJt0', // P&C
  'aptitude:6': 'https://www.youtube.com/watch?v=uzkc-qNVoOk', // Probability
  'aptitude:8': 'https://www.youtube.com/watch?v=yTGRhLjBiG0', // Sentence completion
  'aptitude:9': 'https://www.youtube.com/watch?v=YDjkBgIJp_M', // Reading comprehension
  'aptitude:11': 'https://www.youtube.com/watch?v=6bK5IkSnI8s', // Syllogisms
  'aptitude:14': 'https://www.youtube.com/watch?v=3jCXDeP1RJ4', // Data interpretation
}

// YouTube icon button component
function YTButton({ topicId }) {
  const url = YOUTUBE_LINKS[topicId]
  if (!url) return null
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title="Watch on YouTube"
      className="shrink-0 w-5 h-5 flex items-center justify-center rounded opacity-60 hover:opacity-100 transition-opacity"
      style={{ color: '#FF0000' }}
    >
      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
        <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .6 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8zM9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
      </svg>
    </a>
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
      if (!r.alreadyCompleted) toast.success(`✅ ${t.name}`, { description: 'Streak alive 🔥' })
    }
    await onRefresh()
    setBusy(null)
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">

      <section>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-1 h-8 rounded-full sunrise-gradient" />
          <div>
            <h2 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Preparation Hub</h2>
            <p className="text-slate-500 text-sm mt-0.5">Great results come from consistent preparation.</p>
          </div>
        </div>

        <Card className="p-5 mt-4 card-luxe">
          <div className="mb-3">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Overall Completion</div>
            <div className="font-serif-display text-3xl font-bold text-[#1A1A1A]">{pct}% <span className="text-base font-medium text-slate-500">· {done}/{total} topics done</span></div>
          </div>
          <div className="h-3 rounded-full bg-slate-200 overflow-hidden mb-3">
            <div className="h-full sunrise-gradient rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
            {data.subjects.map(s => {
              const subDone = data.topics.filter(t => t.subjectKey === s.key && completed.has(t.id)).length
              const subTotal = data.topics.filter(t => t.subjectKey === s.key).length
              const subPct = subTotal ? Math.round((subDone / subTotal) * 100) : 0
              const isComplete = subDone === subTotal && subTotal > 0
              return (
                <div key={s.key} className={`p-2 rounded-lg border ${isComplete ? 'border-[#FF7A18]/40 bg-[#FFF8EE]' : 'border-slate-100 bg-slate-50'}`}>
                  <div className="font-semibold text-[#1A1A1A] truncate text-[10px]">{s.name.split(' ')[0]}</div>
                  <div className="text-slate-400 text-[9px]">{subDone}/{subTotal}</div>
                  <div className="h-1 rounded-full bg-slate-200 mt-1 overflow-hidden">
                    <div className="h-full sunrise-gradient rounded-full" style={{ width: `${subPct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-slate-500">
            <span>✅ {done} topics completed</span>
            <span>⏳ {total - done} remaining</span>
            <span>🔥 {branch.streak || 0} day streak</span>
            <span>📚 {data.subjects.filter(s => data.topics.filter(t => t.subjectKey === s.key).length > 0 && data.topics.filter(t => t.subjectKey === s.key).every(t => completed.has(t.id))).length}/{data.subjects.length} subjects done</span>
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
                  <Card key={s.key} className="p-4 card-luxe">
                    <div className="flex items-start justify-between mb-1">
                      <div className="font-semibold text-[#1A1A1A] text-sm leading-snug flex-1 pr-2">{s.name}</div>
                      <div className="text-right shrink-0">
                        <div className="text-[10px] font-bold text-[#A47148]">{s.avgMarks} marks</div>
                        <div className="text-[10px] text-slate-400">{spct}% done</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mb-2">{sdone}/{subTopics.length} topics completed</div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden mb-3">
                      <div className="h-full sunrise-gradient rounded-full" style={{ width: `${spct}%` }} />
                    </div>
                    <div className="space-y-1 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                      {subTopics.map((t, idx) => {
                        const ck = completed.has(t.id)
                        const isHigh = t.priority === 'HIGH'
                        return (
                          <div key={t.id} className="flex items-center gap-1.5 group">
                            <button onClick={() => toggle(t)} disabled={busy === t.id} className="flex-1 flex items-center gap-2 text-left p-1.5 rounded-lg hover:bg-[#FFF8EE] transition-colors">
                              <div className={`w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-colors ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300 hover:border-[#FF7A18]'
                                }`}>
                                {ck && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                              <span className={`flex-1 text-xs leading-snug ${ck ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>{t.name}</span>
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${isHigh ? 'bg-[#FF7A18]/15 text-[#FF7A18]' : 'bg-slate-100 text-slate-400'
                                }`}>{isHigh ? 'HIGH' : 'LOW'}</span>
                            </button>
                          </div>
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
              <Card key={pri} className="p-4 card-luxe">
                <div className="flex items-center gap-2 mb-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${pri === 'HIGH' ? 'bg-[#FF7A18]/15 text-[#FF7A18]' : 'bg-slate-100 text-slate-500'
                    }`}>{pri} PRIORITY</span>
                  <span className="text-xs text-slate-400">{data.topics.filter(t => t.priority === pri && completed.has(t.id)).length}/{data.topics.filter(t => t.priority === pri).length} done</span>
                </div>
                <div className="grid md:grid-cols-2 gap-1">
                  {data.topics.filter((t) => t.priority === pri).map((t) => {
                    const ck = completed.has(t.id)
                    return (
                      <div key={t.id} className="flex items-center gap-1">
                        <button onClick={() => toggle(t)} className="flex-1 flex items-center gap-2 text-left text-sm p-1.5 hover:bg-[#FFF8EE] rounded-lg transition-colors">
                          <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300'}`}>{ck && <Check className="w-3 h-3 text-white" />}</div>
                          <span className={`text-xs leading-snug ${ck ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>{t.subject.split(' & ')[0]} · {t.name}</span>
                        </button>
                      </div>
                    )
                  })}
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="phase" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {[
                ['Phase 1 (Month 1–3): Foundations', ['math', 'discrete', 'algorithms']],
                ['Phase 2 (Month 4–6): Core', ['ds', 'os', 'dbms', 'cn']],
                ['Phase 3 (Month 7–9): Advanced', ['toc', 'cd', 'coa', 'dl']],
                ['Phase 4 (Month 10–12): Revision + Aptitude', ['aptitude']],
              ].map(([label, keys]) => (
                <Card key={label} className="p-4 card-luxe">
                  <div className="font-semibold text-[#1A1A1A] mb-1">{label}</div>
                  <div className="text-xs text-slate-400 mb-3">
                    {data.topics.filter(t => keys.includes(t.subjectKey) && completed.has(t.id)).length}/
                    {data.topics.filter(t => keys.includes(t.subjectKey)).length} topics done
                  </div>
                  <div className="space-y-1 max-h-80 overflow-y-auto scrollbar-thin">
                    {data.topics.filter((t) => keys.includes(t.subjectKey)).map((t) => {
                      const ck = completed.has(t.id)
                      return (
                        <div key={t.id} className="flex items-center gap-1">
                          <button onClick={() => toggle(t)} className="flex-1 flex items-center gap-2 text-left text-sm p-1.5 hover:bg-[#FFF8EE] rounded-lg transition-colors">
                            <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${ck ? 'bg-[#FF7A18] border-[#FF7A18]' : 'border-slate-300'}`}>{ck && <Check className="w-3 h-3 text-white" />}</div>
                            <span className={`text-xs leading-snug flex-1 ${ck ? 'line-through text-slate-400' : 'text-[#1A1A1A]'}`}>{t.subject.split(' & ')[0]} · {t.name}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${t.priority === 'HIGH' ? 'bg-[#FF7A18]/15 text-[#FF7A18]' : 'bg-slate-100 text-slate-400'
                              }`}>{t.priority}</span>
                          </button>
                        </div>
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


// =================== REVISION PAGE ===================
function RevisionPage({ user, activeBranch, onRefresh }) {
  const [data, setData] = useState({ subjects: [], topics: [] })
  const [open, setOpen] = useState({})
  useEffect(() => { api.topics(activeBranch.branchCode).then(setData) }, [activeBranch.branchCode])
  const completed = new Set(activeBranch.completedTopics || [])
  const totalCompleted = data.topics.filter(t => completed.has(t.id)).length

  const revise = async (t) => {
    await api.revise({ userId: user.id, topicId: t.id, subject: t.subject, topicName: t.name, branchCode: activeBranch.branchCode })
    toast.success(`↺ Revised: ${t.name}`)
    onRefresh()
  }

  const toggleOpen = (key) => setOpen(o => ({ ...o, [key]: !o[key] }))

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-1 h-8 rounded-full sunrise-gradient" />
        <div>
          <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Syllabus Revision</h1>
          <p className="text-slate-500 mt-0.5 text-sm">Topics you&apos;ve completed — grouped by subject. Click Revise to log a session.</p>
        </div>
      </div>

      {/* Summary bar */}
      <Card className="card-luxe p-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl sunrise-gradient flex items-center justify-center shrink-0">
          <RotateCcw className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1">
          <div className="text-xs font-bold text-[#A47148] uppercase tracking-wider">Ready for revision</div>
          <div className="font-serif-display text-2xl font-bold text-[#1A1A1A]">
            {totalCompleted} <span className="text-sm font-normal text-slate-500">of {data.topics.length} topics completed</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">Subjects started</div>
          <div className="font-bold text-[#1A1A1A]">
            {data.subjects.filter(s => data.topics.some(t => t.subjectKey === s.key && completed.has(t.id))).length}
            <span className="text-slate-400 font-normal">/{data.subjects.length}</span>
          </div>
        </div>
      </Card>

      {totalCompleted === 0 ? (
        <Card className="p-10 text-center card-luxe">
          <div className="text-4xl mb-3">📚</div>
          <div className="font-semibold text-[#1A1A1A] mb-1">Nothing to revise yet</div>
          <p className="text-sm text-slate-500">Go to the <b>Preparation Hub</b> and tick off some topics first.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.subjects.map(s => {
            const allSubTopics = data.topics.filter(t => t.subjectKey === s.key)
            const doneTopics = allSubTopics.filter(t => completed.has(t.id))
            const totalSub = allSubTopics.length
            const doneSub = doneTopics.length
            const pct = totalSub ? Math.round((doneSub / totalSub) * 100) : 0
            const isOpen = open[s.key] ?? true

            return (
              <Card key={s.key} className="card-luxe overflow-hidden">
                {/* Subject header — always visible */}
                <button
                  onClick={() => toggleOpen(s.key)}
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-[#FFF8EE] transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[#1A1A1A] text-sm">{s.name}</span>
                      {doneSub === 0 && (
                        <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded-full bg-slate-100">No topics done yet</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden max-w-[200px]">
                        <div className="h-full sunrise-gradient rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-[#A47148] font-bold shrink-0">
                        {doneSub}/{totalSub} completed
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-[#A47148]">{s.avgMarks} marks</span>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-transform ${isOpen ? 'rotate-90' : ''}`} style={{ color: '#A47148' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Topic list — shown when open and has completed topics */}
                {isOpen && doneSub > 0 && (
                  <div className="border-t border-slate-100 divide-y divide-slate-50">
                    {doneTopics.map((t, idx) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FFF8EE] transition-colors group">
                        <span className="text-[10px] font-bold text-slate-300 w-5 shrink-0">{String(idx + 1).padStart(2, '0')}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-[#1A1A1A] leading-snug">{t.name}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${t.priority === 'HIGH' ? 'bg-[#FF7A18]/15 text-[#FF7A18]' : 'bg-slate-100 text-slate-400'
                          }`}>{t.priority}</span>
                        <button
                          onClick={() => revise(t)}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-[#FFE5D0] text-[#A47148] hover:bg-[#FF7A18] hover:text-white hover:border-[#FF7A18] transition-all"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Revise
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}

// =================== DASHBOARD ===================

function DashboardPage({ user, activeBranch, snapshot, setPage }) {
  const xp = activeBranch.xp || 0
  const [weekSessions, setWeekSessions] = useState([])
  const [topicData, setTopicData] = useState({ subjects: [], topics: [] })

  // Todays Plan state
  const [planItems, setPlanItems] = useState([])

  // Dynamic user tracking counts
  const [notesCount, setNotesCount] = useState(0)
  const [ytCount, setYtCount] = useState(0)
  const [activityList, setActivityList] = useState([])
  const [allActivities, setAllActivities] = useState([])
  const [isAllActivityOpen, setIsAllActivityOpen] = useState(false)
  const [historyCount, setHistoryCount] = useState(0)

  // Edit Plan state
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false)
  const [selectedSubjectKey, setSelectedSubjectKey] = useState('')
  const [selectedTopicText, setSelectedTopicText] = useState('')
  const [customPlanText, setCustomPlanText] = useState('')
  const [editingPlanItems, setEditingPlanItems] = useState([])

  useEffect(() => {
    fetch(`/api/sessions?userId=${user.id}&range=week`).then((r) => r.json()).then((d) => setWeekSessions(d.sessions || []))
    api.topics(activeBranch.branchCode).then(setTopicData)

    // Read mock attempts count
    try {
      const records = JSON.parse(localStorage.getItem(`gateflow_${user.id}_mock_history`) || '[]')
      setHistoryCount(records.length)
    } catch { }
  }, [user.id, activeBranch.branchCode])

  // Load plan from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`gateflow_${user.id}_todays_plan`)
      if (stored) {
        setPlanItems(JSON.parse(stored))
      } else {
        const defaultPlan = [
          { id: 1, text: 'Operating Systems - Process Management', checked: false },
          { id: 2, text: 'Data Structures - Linked List', checked: false },
          { id: 3, text: 'Complete one mock test', checked: false },
          { id: 4, text: '30 mins revision', checked: false }
        ]
        setPlanItems(defaultPlan)
        localStorage.setItem(`gateflow_${user.id}_todays_plan`, JSON.stringify(defaultPlan))
      }
    } catch { }
  }, [user.id])

  // Calculate live counts and recent activities
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setNotesCount(parseInt(localStorage.getItem(`gateflow_${user.id}_notes_opened_count`) || '0'))
      setYtCount(parseInt(localStorage.getItem(`gateflow_${user.id}_yt_watched_count`) || '0'))

      try {
        const localLogs = JSON.parse(localStorage.getItem(`gateflow_${user.id}_activity_log`) || '[]')
        if (localLogs.length > 0) {
          const formatted = localLogs.map(log => {
            let bg = 'bg-slate-50 text-slate-600'
            let icon = <FileText className="w-3.5 h-3.5" />
            if (log.type === 'yt') {
              bg = 'bg-red-50 text-red-600'
              icon = <Play className="w-3.5 h-3.5" />
            } else if (log.type === 'note') {
              bg = 'bg-green-50 text-green-600'
              icon = <FileText className="w-3.5 h-3.5" />
            } else if (log.type === 'mock') {
              bg = 'bg-blue-50 text-blue-600'
              icon = <Trophy className="w-3.5 h-3.5" />
            } else if (log.type === 'track') {
              bg = 'bg-orange-50 text-[#FF7A18]'
              icon = <BookOpen className="w-3.5 h-3.5" />
            }

            const hrsAgo = Math.round((new Date().getTime() - new Date(log.time).getTime()) / 3600000)
            let timeMeta = log.meta || 'Activity'
            if (!isNaN(hrsAgo)) {
              if (hrsAgo < 1) timeMeta += ' · Just now'
              else if (hrsAgo < 24) timeMeta += ` · ${hrsAgo}h ago`
              else timeMeta += ` · ${Math.round(hrsAgo / 24)}d ago`
            }

            return {
              type: log.type,
              title: log.title,
              meta: timeMeta,
              url: log.url || '#',
              bg,
              icon
            }
          })
          setActivityList(formatted.slice(0, 5))
          setAllActivities(formatted)
        } else {
          // Fallback to real week study sessions
          const fallback = weekSessions.map(s => ({
            type: 'track',
            title: `Tracked: ${s.topic}`,
            meta: `${s.subject} · ${s.durationMinutes}m`,
            url: '#',
            bg: 'bg-orange-50 text-[#FF7A18]',
            icon: <BookOpen className="w-3.5 h-3.5" />
          }))
          setActivityList(fallback.slice(0, 5))
          setAllActivities(fallback)
        }
      } catch { }
    }
  }, [weekSessions, user.id])

  // Dynamic greeting based on hours
  const greeting = useMemo(() => {
    const hrs = new Date().getHours()
    if (hrs < 12) return 'Good Morning'
    if (hrs < 17) return 'Good Afternoon'
    return 'Good Evening'
  }, [])

  // Dynamic database values
  const completedCount = (activeBranch.completedTopics || []).length
  const revisedCount = (activeBranch.revisedTopics || []).length
  const topicsTotal = topicData.topics.length || 141

  // Overall % completion per subject (Live Subject Overview)
  const completion = useMemo(() => {
    const completed = new Set(activeBranch.completedTopics || [])
    return topicData.subjects.map((s) => {
      const ts = topicData.topics.filter((t) => t.subjectKey === s.key)
      const done = ts.filter((t) => completed.has(t.id)).length
      const pct = ts.length ? Math.round((done / ts.length) * 100) : 0
      return { name: s.name, pct }
    })
  }, [topicData, activeBranch.completedTopics])

  // Subject completion values sliced for overview
  const displayedCompletion = completion.slice(0, 5)

  // Filter topics based on subject key chosen in plan editor
  const filteredTopicsForSelect = useMemo(() => {
    if (!selectedSubjectKey) return []
    return topicData.topics.filter(t => t.subjectKey === selectedSubjectKey)
  }, [selectedSubjectKey, topicData.topics])

  // Add selected topic to plan
  const handleAddPlanItem = () => {
    if (!selectedSubjectKey) return toast.error('Please select a subject first')
    if (!selectedTopicText) return toast.error('Please select a subtopic first')

    const subjectName = topicData.subjects.find(s => s.key === selectedSubjectKey)?.name?.split(' ')[0] || ''
    const text = `${subjectName} - ${selectedTopicText}`

    if (editingPlanItems.some(p => p.text === text)) {
      return toast.error('This topic is already added to the plan list')
    }

    setEditingPlanItems(prev => [
      ...prev,
      { id: Date.now() + Math.random(), text, checked: false }
    ])
    setSelectedTopicText('')
  }

  // Add custom plan item
  const handleAddCustomPlanItem = () => {
    if (!customPlanText.trim()) return toast.error('Please type a plan item')

    setEditingPlanItems(prev => [
      ...prev,
      { id: Date.now() + Math.random(), text: customPlanText.trim(), checked: false }
    ])
    setCustomPlanText('')
  }

  // Save Today's Plan checklist
  const handleSavePlan = () => {
    if (editingPlanItems.length === 0) return toast.error('Please add at least one topic to the list')
    setPlanItems(editingPlanItems)
    localStorage.setItem(`gateflow_${user.id}_todays_plan`, JSON.stringify(editingPlanItems))
    setIsEditPlanOpen(false)
    toast.success("Today's Plan updated successfully!")
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6 max-w-6xl">

      {/* 1. Welcome Card Header */}
      <div className="relative rounded-3xl p-6 md:p-8 overflow-hidden bg-white border border-[#FFE5D0] shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-100/50 to-transparent rounded-full -mr-16 -mt-16 pointer-events-none" />
        <div className="space-y-2 z-10">
          <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">
            {greeting}, {user.username || 'Dheeraj'}! <span className="inline-block animate-bounce">🌟</span>
          </h1>
          <p className="text-sm font-semibold text-[#FF7A18]">Focus on progress, not perfection.</p>
          <p className="text-xs text-slate-500 max-w-md">Every topic you finish is a step closer to your dream rank.</p>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-orange-50 border border-orange-200 text-[#FF7A18] mt-3">
            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7A18] animate-pulse" />
            GATE CS {activeBranch.targetYear || 2027}
          </div>
        </div>

        {/* Laptop/Mockup Illustration */}
        <div className="relative shrink-0 w-full md:w-56 h-36 flex items-end justify-center md:justify-end z-10">
          <div className="relative w-44 h-28 bg-[#2A2A2A] rounded-t-xl border-4 border-slate-300 shadow-md flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[#0F0F0F] flex flex-col items-center justify-center p-2 text-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">PREPARING FOR</span>
              <span className="text-xl font-black text-white tracking-widest font-serif-display mt-0.5">GATE</span>
              <div className="w-8 h-1 bg-[#FF7A18] rounded-full mt-1.5" />
            </div>
            {/* Keyboard base */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-400" />
          </div>
          {/* Stack of books */}
          <div className="absolute bottom-0 left-0 flex flex-col gap-0.5 shadow-sm transform translate-y-2 translate-x-2 md:translate-x-0">
            <div className="w-16 h-3.5 bg-[#FF7A18] rounded-md text-[8px] font-bold text-white flex items-center justify-center uppercase tracking-wide border-b border-orange-600">Revision</div>
            <div className="w-16 h-3.5 bg-purple-600 rounded-md text-[8px] font-bold text-white flex items-center justify-center uppercase tracking-wide border-b border-purple-700">Mock Tests</div>
          </div>
          {/* Mug */}
          <div className="absolute bottom-0 right-0 w-6 h-7 bg-[#1A1A1A] rounded-md shadow-sm translate-x-3 transform flex items-center justify-center">
            <span className="text-[6px] font-bold text-[#FF7A18]">GF</span>
          </div>
        </div>
      </div>

      {/* 2. Stat Cards Grid (5 Columns) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">

        {/* Topics Tracked (Live database completed count) */}
        <Card className="p-4 flex flex-col justify-between border border-[#FFE5D0] shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500">Topics Tracked</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-1">{completedCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">of {topicsTotal} topics</div>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-orange-500 rounded-full" style={{ width: `${(completedCount / topicsTotal) * 100}%` }} />
          </div>
        </Card>

        {/* Revision Done (Live database revision count) */}
        <Card className="p-4 flex flex-col justify-between border border-purple-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
              <Bookmark className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500">Revision Done</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-1">{revisedCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">topics revised</div>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full" style={{ width: `${topicsTotal ? (revisedCount / topicsTotal) * 100 : 0}%` }} />
          </div>
        </Card>

        {/* Notes Accessed (Live count from clicked note resource logs) */}
        <Card className="p-4 flex flex-col justify-between border border-green-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center text-green-600">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500">Notes Accessed</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-1">{notesCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">notes opened</div>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(100, (notesCount / 30) * 100)}%` }} />
          </div>
        </Card>

        {/* YT Videos Opened (Live count from clicked playlists) */}
        <Card className="p-4 flex flex-col justify-between border border-red-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center text-red-600">
              <Play className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500">YT Videos Opened</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-1">{ytCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">videos watched</div>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-red-500 rounded-full" style={{ width: `${Math.min(100, (ytCount / 20) * 100)}%` }} />
          </div>
        </Card>

        {/* Mock Tests Return (Live exam attempts history logs) */}
        <Card className="p-4 flex flex-col justify-between border border-blue-100 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
              <Trophy className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-xs font-bold text-slate-500">Mock Tests Return</div>
            <div className="text-2xl font-black text-[#1A1A1A] mt-1">{historyCount}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">tests revisited</div>
          </div>
          <div className="h-1 w-full bg-slate-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (historyCount / 10) * 100)}%` }} />
          </div>
        </Card>

      </div>

      {/* 3. Middle Row: Today's Plan (60%) vs Study Streak (40%) */}
      <div className="grid md:grid-cols-5 gap-4">

        {/* Today's Plan (With plan items dialog customizer) */}
        <Card className="p-5 md:col-span-3 border border-[#FFE5D0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF7A18]">
                  <Calendar className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-serif-display text-lg font-bold text-[#1A1A1A]">Today's Plan</h3>
                  <p className="text-[11px] text-slate-500">Focus on what matters today.</p>
                </div>
              </div>

              {/* Edit Plan Option Dialog button */}
              <Dialog open={isEditPlanOpen} onOpenChange={(open) => {
                setIsEditPlanOpen(open)
                if (open) {
                  setEditingPlanItems([...planItems])
                }
              }}>
                <DialogTrigger asChild>
                  <button className="px-2.5 py-1 text-[10px] font-bold border border-[#FFE5D0] rounded-lg text-[#FF7A18] hover:bg-orange-50 transition">
                    ✎ Edit Plan
                  </button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Edit Today's Plan</DialogTitle>
                    <p className="text-xs text-slate-500 mt-1">Select topics from your GATE CS subjects, or write custom preparation items to plan your day.</p>
                  </DialogHeader>

                  <div className="space-y-4 py-3">
                    {/* Choose Subject */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">Select Subject</label>
                      <select
                        value={selectedSubjectKey}
                        onChange={(e) => {
                          setSelectedSubjectKey(e.target.value)
                          setSelectedTopicText('')
                        }}
                        className="w-full border rounded-xl p-2.5 text-xs bg-white focus:border-[#FF7A18] outline-none"
                      >
                        <option value="">-- Choose a Subject --</option>
                        {topicData.subjects.map(s => (
                          <option key={s.key} value={s.key}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Choose subtopic */}
                    {selectedSubjectKey && (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-600">Select Subtopic</label>
                        <select
                          value={selectedTopicText}
                          onChange={(e) => setSelectedTopicText(e.target.value)}
                          className="w-full border rounded-xl p-2.5 text-xs bg-white focus:border-[#FF7A18] outline-none"
                        >
                          <option value="">-- Choose a Topic --</option>
                          {filteredTopicsForSelect.map(t => (
                            <option key={t.id} value={t.name}>{t.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Add topic button */}
                    <Button onClick={handleAddPlanItem} className="w-full bg-[#1A1A1A] hover:bg-[#2A2A2A] text-xs h-9">
                      + Add Subject Topic
                    </Button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-slate-200"></div>
                      <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold">OR CUSTOM ITEM</span>
                      <div className="flex-grow border-t border-slate-200"></div>
                    </div>

                    {/* Custom plan items */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="e.g. Complete one mock test or 30m revision"
                        value={customPlanText}
                        onChange={(e) => setCustomPlanText(e.target.value)}
                        className="text-xs h-9"
                      />
                      <Button onClick={handleAddCustomPlanItem} className="bg-[#FF7A18] hover:bg-[#E06010] text-xs h-9 px-4">
                        Add
                      </Button>
                    </div>

                    {/* Display plan draft list */}
                    <div className="mt-4 space-y-2">
                      <h4 className="text-xs font-bold text-slate-700">Planned Checklist Tasks ({editingPlanItems.length})</h4>
                      {editingPlanItems.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic">No checklist items selected yet.</p>
                      ) : (
                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                          {editingPlanItems.map((item) => (
                            <div key={item.id} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <span className="text-[11px] font-medium text-slate-700">{item.text}</span>
                              <button
                                onClick={() => setEditingPlanItems(prev => prev.filter(p => p.id !== item.id))}
                                className="text-red-500 hover:text-red-700 font-bold px-1.5 text-xs"
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <DialogFooter>
                    <Button onClick={handleSavePlan} className="bg-[#FF7A18] hover:bg-[#E06010] text-xs">
                      Save & Update Plan
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {/* Checklist items list */}
            <div className="mt-5 space-y-3">
              {planItems.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">Your plan checklist is empty. Click "Edit Plan" to map tasks!</div>
              ) : (
                planItems.map(item => (
                  <label key={item.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-100 transition cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {
                        const updated = planItems.map(p => p.id === item.id ? { ...p, checked: !p.checked } : p)
                        setPlanItems(updated)
                        localStorage.setItem(`gateflow_${user.id}_todays_plan`, JSON.stringify(updated))
                      }}
                      className="w-4.5 h-4.5 text-[#FF7A18] focus:ring-[#FF7A18] rounded border-slate-300"
                    />
                    <span className={`${item.checked ? 'line-through text-slate-400' : 'text-[#2A2A2A]'} font-medium`}>
                      {item.text}
                    </span>
                  </label>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => setPage('Syllabus')}
              className="px-4 py-2 bg-[#FF7A18] hover:bg-[#E06010] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition"
            >
              Start Now →
            </button>
            <button
              onClick={() => setPage('Tracker')}
              className="text-[#FF7A18] font-bold text-xs hover:underline"
            >
              View Full Plan
            </button>
          </div>
        </Card>

        {/* Study Streak (Uses live streak state) */}
        <Card className="p-5 md:col-span-2 border border-[#FFE5D0] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-lg bg-orange-50 border border-orange-200 flex items-center justify-center text-[#FF7A18]">
                <Flame className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-serif-display text-lg font-bold text-[#1A1A1A]">Study Streak</h3>
                <p className="text-[11px] text-slate-500">Keep the chain alive!</p>
              </div>
            </div>

            {/* Circular chart */}
            <div className="flex items-center justify-center py-4">
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-95" viewBox="0 0 36 36">
                  <path
                    className="text-slate-100"
                    strokeWidth="2.8"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-[#FF7A18]"
                    strokeDasharray={`${Math.min(100, (snapshot.streak || 1) * 14.28)}, 100`}
                    strokeWidth="2.8"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-[#1A1A1A] leading-none">{snapshot.streak || 0}</span>
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Days</span>
                </div>
              </div>
            </div>
          </div>

          {/* Week Checklist */}
          <div className="flex justify-between items-center gap-1 mt-4 pt-4 border-t border-slate-100">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => {
              const active = idx < (snapshot.streak || 0)
              return (
                <div key={idx} className="flex flex-col items-center gap-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">{day}</span>
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center border transition ${active
                      ? 'bg-orange-500 border-orange-500 text-white font-bold text-xs'
                      : 'bg-slate-50 border-slate-200 text-slate-300'
                    }`}>
                    {active ? '✓' : ''}
                  </div>
                </div>
              )
            })}
          </div>
        </Card>

      </div>

      {/* 4. Bottom Grid (3 Columns) */}
      <div className="grid md:grid-cols-3 gap-4">

        {/* Subject Overview (Live database completed topics progress ratio) */}
        <Card className="p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif-display text-base font-bold text-[#1A1A1A]">Subject Overview</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Overall progress across all subjects.</p>

            <div className="mt-5 space-y-4">
              {displayedCompletion.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-4">No subjects found for this branch.</p>
              ) : (
                displayedCompletion.map((sub, idx) => {
                  const colors = ['#FF7A18', '#8B5CF6', '#10B981', '#3B82F6', '#EF4444']
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[#3A3A3A] truncate max-w-[80%]">{sub.name}</span>
                        <span className="text-[#1A1A1A]">{sub.pct}%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${sub.pct}%`, backgroundColor: colors[idx % colors.length] }} />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <button
            onClick={() => setPage('Syllabus')}
            className="text-[#FF7A18] font-bold text-xs hover:underline mt-6 text-left flex items-center gap-1"
          >
            View Details →
          </button>
        </Card>

        {/* Recent Activity (Live logs tracked from clicked notes, videos, mocks, etc) */}
        <Card className="p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif-display text-base font-bold text-[#1A1A1A]">Recent Activity</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Your last actions on GateFlow.</p>

            <div className="mt-5 space-y-3 text-xs">
              {activityList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-6 text-center">No recent actions recorded. Click resources on Resources or Mock Tests tab to log activity!</p>
              ) : (
                activityList.map((act, idx) => {
                  const isClickable = act.url && act.url !== '#'
                  const handleActClick = () => {
                    if (!isClickable) return
                    if (act.url.startsWith('page:')) {
                      setPage(act.url.split(':')[1])
                    } else {
                      window.open(act.url, '_blank')
                    }
                  }

                  return (
                    <div
                      key={idx}
                      onClick={handleActClick}
                      className={`flex gap-2.5 items-start p-1.5 rounded-xl transition ${isClickable ? 'cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-100/50' : ''}`}
                    >
                      <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${act.bg}`}>
                        {act.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className={`font-semibold text-[#2A2A2A] truncate ${isClickable ? 'hover:text-[#FF7A18] transition-colors' : ''}`}>
                          {act.title}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">{act.meta}</div>
                      </div>
                      {isClickable && (
                        <ArrowUpRight className="w-3 h-3 text-slate-400 shrink-0 self-center" />
                      )}
                    </div>
                  )
                })
              )}
            </div>
          </div>

          <Dialog open={isAllActivityOpen} onOpenChange={setIsAllActivityOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Recent Activity Log</DialogTitle>
                <p className="text-xs text-slate-500 mt-1">Scroll through all your actions logged during your preparation on GateFlow. Click clickable items to reopen them.</p>
              </DialogHeader>
              <div className="max-h-80 overflow-y-auto space-y-2 pr-1 mt-4 divide-y divide-slate-100">
                {allActivities.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-8">No logged activity yet.</p>
                ) : (
                  allActivities.map((act, idx) => {
                    const isClickable = act.url && act.url !== '#'
                    const handleActClick = () => {
                      if (!isClickable) return
                      if (act.url.startsWith('page:')) {
                        setPage(act.url.split(':')[1])
                        setIsAllActivityOpen(false)
                      } else {
                        window.open(act.url, '_blank')
                      }
                    }

                    return (
                      <div
                        key={idx}
                        onClick={handleActClick}
                        className={`flex gap-2.5 items-start p-2 rounded-xl transition pt-3 first:pt-0 ${isClickable ? 'cursor-pointer hover:bg-slate-50 border border-transparent hover:border-slate-100' : ''}`}
                      >
                        <div className={`w-7 h-7 rounded-lg shrink-0 flex items-center justify-center ${act.bg}`}>
                          {act.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className={`font-semibold text-[#2A2A2A] text-xs truncate ${isClickable ? 'hover:text-[#FF7A18]' : ''}`}>{act.title}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{act.meta}</div>
                        </div>
                        {isClickable && (
                          <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 shrink-0 self-center" />
                        )}
                      </div>
                    )
                  })
                )}
              </div>
            </DialogContent>
          </Dialog>

          <button
            onClick={() => setIsAllActivityOpen(true)}
            className="text-[#FF7A18] font-bold text-xs hover:underline mt-6 text-left flex items-center gap-1"
          >
            View All Activity →
          </button>
        </Card>

        {/* Quick Access Grid */}
        <Card className="p-5 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-serif-display text-base font-bold text-[#1A1A1A]">Quick Access</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Jump into what you need.</p>

            <div className="grid grid-cols-2 gap-2 mt-5">
              {[
                { name: 'Tracker', page: 'Tracker', bg: 'bg-orange-50/50 hover:bg-orange-50 text-orange-600 border border-orange-100', icon: <BookOpen className="w-4 h-4" /> },
                { name: 'Revision', page: 'Revision', bg: 'bg-purple-50/50 hover:bg-purple-50 text-purple-600 border border-purple-100', icon: <Bookmark className="w-4 h-4" /> },
                { name: 'Notes', page: 'Resources', bg: 'bg-green-50/50 hover:bg-green-50 text-green-600 border border-green-100', icon: <FileText className="w-4 h-4" /> },
                { name: 'PYQs', page: 'PYQs', bg: 'bg-blue-50/50 hover:bg-blue-50 text-blue-600 border border-blue-100', icon: <FileText className="w-4 h-4" /> },
                { name: 'Mock Tests', page: 'Mock Tests', bg: 'bg-red-50/50 hover:bg-red-50 text-red-600 border border-red-100', icon: <Trophy className="w-4 h-4" /> },
                { name: 'Resources', page: 'Resources', bg: 'bg-yellow-50/50 hover:bg-yellow-50 text-yellow-600 border border-yellow-100', icon: <Folder className="w-4 h-4" /> }
              ].map(q => (
                <button
                  key={q.name}
                  onClick={() => setPage(q.page)}
                  className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center gap-1.5 transition ${q.bg}`}
                >
                  {q.icon}
                  <span className="text-[11px] font-bold">{q.name}</span>
                </button>
              ))}
            </div>
          </div>
        </Card>

      </div>

      {/* 5. bottom Quote Banner */}
      <div className="rounded-3xl p-5 border border-[#FFE5D0] bg-[#FFFDF8] flex flex-col md:flex-row justify-between items-center gap-4 text-center md:text-left">
        <div className="flex flex-col md:flex-row items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 shrink-0">
            <Flame className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-500">Small steps every day.</div>
            <div className="text-lg font-black text-[#FF7A18]">Big results one day.</div>
          </div>
        </div>
        <div className="text-xs text-[#A47148] font-bold max-w-sm md:text-right">
          You're doing great, {user.username || 'Dheeraj'}! <br />
          <span className="text-slate-400 font-semibold">Stay consistent and trust the process.</span>
        </div>
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
                  <div className="flex justify-between"><span className="text-slate-500">Streak</span><b>{activeBranch.streak || 0}d</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">XP</span><b>{activeBranch.xp || 0}</b></div>
                  <div className="flex justify-between"><span className="text-slate-500">Topics done</span><b>{(activeBranch.completedTopics || []).length}</b></div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">🏆 Top this week</div>
                {board.slice(0, 5).map((u, i) => (
                  <div key={u.username} className="flex items-center justify-between text-sm py-1">
                    <span className={u.username === user.username ? 'font-bold text-[#1A1A1A]' : 'text-slate-700'}>#{i + 1} {u.username}</span>
                    <span className="text-slate-500">{u.completed || 0} topics</span>
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
                    <td className="p-3">#{i + 1}</td><td className="p-3 font-medium">{u.username}</td><td className="p-3">{u.xp}</td><td className="p-3">{u.completed}</td><td className="p-3">{u.streak}</td><td className="p-3">L{u.level}</td>
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

// =================== RESOURCES / PYQS / MOCKS (CMS-driven) ===================
function gradientFor(i) {
  const g = ['from-orange-400 to-pink-500', 'from-blue-500 to-cyan-400', 'from-emerald-500 to-teal-500', 'from-violet-500 to-purple-600', 'from-rose-500 to-red-500', 'from-amber-500 to-orange-600']
  return g[i % g.length]
}

function CmsCardGrid({ items, type, isAdmin, onEdit, onDelete, kind }) {
  return (
    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {items.map((it, i) => (
        <div key={it.id} className="card-luxe overflow-hidden relative group">
          {isAdmin && <AdminItemControls onEdit={() => onEdit(it)} onDelete={() => onDelete(it.id)} />}
          {it.coverUrl ? (
            <img src={it.coverUrl} alt={it.title} className="w-full h-36 object-cover" />
          ) : (
            <div className={`h-36 bg-gradient-to-br ${gradientFor(i)} flex items-center justify-center text-white text-center text-xs font-bold p-2`}>
              {kind === 'pyq' ? '📄' : kind === 'sheet' ? '📝' : kind === 'note' ? '📖' : kind === 'mock' ? '🧪' : '📚'} {it.title}
            </div>
          )}
          <div className="p-3">
            <div className="font-semibold text-sm text-[#1A1A1A] line-clamp-2">{it.title}</div>
            {kind === 'pyq' && <div className="text-[11px] text-[#6B5E52] mt-1">GATE {it.year} · Shift {it.shift} · {it.branchCode}</div>}
            {(kind === 'book') && it.author && <div className="text-[11px] text-[#6B5E52] mt-1">{it.author}</div>}
            {(kind === 'sheet' || kind === 'note') && <div className="text-[11px] text-[#6B5E52] mt-1">{it.subject}{it.topic ? ` · ${it.topic}` : ''}</div>}
            {kind === 'mock' && <div className="text-[11px] text-[#6B5E52] mt-1">{it.durationMinutes || 0} min · {it.questionCount || 0} Qs · {it.marks || 0} marks</div>}
            <div className="flex gap-2 mt-2">
              {it.amazonUrl && <a href={it.amazonUrl} target="_blank" rel="noreferrer" className="text-xs text-[#FF7A18] font-semibold">Buy ↗</a>}
              {it.paperUrl && <a href={it.paperUrl} target="_blank" rel="noreferrer" className="text-xs text-[#FF7A18] font-semibold">Open PDF ↗</a>}
              {it.solutionUrl && <a href={it.solutionUrl} target="_blank" rel="noreferrer" className="text-xs text-[#1A1A1A] font-semibold">Solution ↗</a>}
              {it.pdfUrl && <a href={it.pdfUrl} target="_blank" rel="noreferrer" className="text-xs text-[#FF7A18] font-semibold">Open ↗</a>}
              {kind === 'mock' && (it.status === 'live' ? <a href={it.paperUrl || '#'} className="text-xs text-[#FF7A18] font-semibold">▷ Start</a> : <span className="text-xs text-slate-400">Coming soon</span>)}
            </div>
          </div>
        </div>
      ))}
      {items.length === 0 && <div className="col-span-full p-8 text-center text-[#A47148]">No items yet. {isAdmin && 'Click "+ Add" to create one.'}</div>}
    </div>
  )
}

function CmsSection({ title, badge, collection, kind, schema, activeBranch, isAdmin, filterByBranch = true }) {
  const params = filterByBranch ? `?branchCode=${activeBranch.branchCode}` : ''
  const { items, reload } = useCmsList(collection, params)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const save = async (form) => {
    const body = { ...form, branchCode: form.branchCode || activeBranch.branchCode }
    const r = editing ? await adminApi.cms(collection, 'PATCH', body, editing.id) : await adminApi.cms(collection, 'POST', body)
    if (r.error) { toast.error(r.error); return }
    toast.success(editing ? 'Updated' : 'Added')
    setEditing(null); reload()
  }
  const del = async (id) => { const r = await adminApi.cms(collection, 'DELETE', null, id); if (r.error) toast.error(r.error); else { toast.success('Deleted'); reload() } }
  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          {badge && <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-1">{badge}</div>}
          <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">{title}</h2>
        </div>
        {isAdmin && <AdminAddBtn onClick={() => { setEditing(null); setOpen(true) }} label="Add" />}
      </div>
      <CmsCardGrid items={items} isAdmin={isAdmin} kind={kind} onEdit={(it) => { setEditing(it); setOpen(true) }} onDelete={del} />
      {isAdmin && (
        <CmsModal open={open} onClose={() => { setOpen(false); setEditing(null) }} title={editing ? `Edit ${schema.title}` : `New ${schema.title}`} schema={schema.fields} initial={editing || { branchCode: activeBranch.branchCode }} onSave={save} folder={schema.folder} />
      )}
    </section>
  )
}

// ====== RECOMMENDED BOOKS DATA ======
const GATE_BOOKS = [
  {
    subject: 'Engineering Mathematics',
    title: 'Higher Engineering Mathematics',
    author: 'B.S. Grewal',
    edition: '43rd Edition · Khanna Publishers',
    store: 'amazon',
    url: 'https://www.amazon.in/-/hi/Higher-Engineering-Mathematics-B-S-Grewal/dp/B097YD4LGK',
    color: '#7C3AED',
    cover: '/books/math_grewal.jpg',
  },
  {
    subject: 'Digital Logic',
    title: 'Digital Logic and Computer Design',
    author: 'M. Morris Mano',
    edition: 'Classic Edition · Pearson',
    store: 'amazon',
    url: 'https://www.amazon.in/Digital-Logic-Computer-Design-Old/dp/817758409X',
    color: '#B45309',
    cover: '/books/dl_mano.png',
  },
  {
    subject: 'Computer Organization & Architecture',
    title: 'Computer Organization',
    author: 'Hamacher, Vranesic, Zaky',
    edition: '5th Edition · McGraw Hill',
    store: 'amazon',
    url: 'https://www.amazon.in/COMPUTER-ORGANIZATION-Carl-Hamacher-SECOND/dp/B0C58W9696',
    color: '#0369A1',
    cover: '/books/coa_hamacher.jpg',
  },
  {
    subject: 'Data Structures & C Programming',
    title: 'Data Structures and Algorithm Analysis in C',
    author: 'Mark Allen Weiss',
    edition: '2nd Edition · Pearson',
    store: 'amazon',
    url: 'https://www.amazon.in/Data-Structures-Algorithm-Analysis-2e/dp/8177583581',
    color: '#065F46',
    cover: '/books/ds_weiss.png',
  },
  {
    subject: 'Algorithms',
    title: 'Introduction to Algorithms (CLRS)',
    author: 'Cormen, Leiserson, Rivest, Stein',
    edition: '4th Edition · MIT Press',
    store: 'amazon',
    url: 'https://www.amazon.in/Introduction-Algorithms-fourth-Thomas-Cormen/dp/026204630X',
    color: '#9F1239',
    cover: '/books/algo_clrs.png',
  },
  {
    subject: 'Theory of Computation',
    title: 'Introduction to Formal Languages and Automata',
    author: 'Peter Linz',
    edition: '6th Edition · Jones & Bartlett',
    store: 'amazon',
    url: 'https://www.amazon.in/Introduction-Formal-Languages-Automata/dp/9384323217',
    color: '#166534',
    cover: '/books/toc_linz.jpg',
  },
  {
    subject: 'Compiler Design',
    title: 'Compilers: Principles, Techniques & Tools',
    author: 'Aho, Lam, Sethi, Ullman',
    edition: '2nd Edition · Pearson (Dragon Book)',
    store: 'amazon',
    url: 'https://www.amazon.in/COMPILERS-PRINCIPLES-TECHNIQUES-TOOLS-2ND/dp/9332518661',
    color: '#1C1C1C',
    cover: '/books/cd_dragon.png',
  },
  {
    subject: 'DBMS',
    title: 'Database System Concepts',
    author: 'Silberschatz, Korth, Sudarshan',
    edition: 'Indian Edition · McGraw Hill',
    store: 'amazon',
    url: 'https://www.amazon.in/Database-System-Concepts-Abraham-Silberschatz/dp/9390727502',
    color: '#1D4ED8',
    cover: '/books/dbms_silberschatz.jpg',
  },
  {
    subject: 'Computer Networks',
    title: 'Data Communications and Networking',
    author: 'Behrouz A. Forouzan',
    edition: '6th Edition · McGraw Hill',
    store: 'amazon',
    url: 'https://www.amazon.in/-/hi/Communications-Networking-Protocol-Behrouz-Forouzan/dp/9355320949/',
    color: '#0F766E',
    cover: '/books/cn_forouzan.jpg',
  },
  {
    subject: 'Operating Systems',
    title: "Silberschatz's Operating System Concepts",
    author: 'Silberschatz, Galvin, Gagne',
    edition: 'Global Edition · Wiley',
    store: 'flipkart',
    url: 'https://www.flipkart.com/silberschatz-s-operating-system-concepts-global/p/itm4314b887ff76b',
    color: '#0369A1',
    cover: '/books/os_silberschatz.jpg',
  },
  {
    subject: 'General Aptitude',
    title: 'A Modern Approach to Verbal & Non-Verbal Reasoning',
    author: 'Dr. R.S. Aggarwal',
    edition: 'Revised Edition · S. Chand',
    store: 'amazon',
    url: 'https://www.amazon.in/Aggarwal-Quantitative-Non-Verbal-Government-Competitive/dp/B0DLGNBKN9',
    color: '#9D174D',
    cover: '/books/aptitude_aggarwal.jpg',
  },
]

const PYQ_BOOK = {
  title: 'GATE 2027 — CS & IT Chapterwise PYQs',
  author: 'GKP (G.K. Publications)',
  edition: 'Revised & Updated | 2017–2026 Solved Papers | 3100+ MCQs, NTQs, MSQs',
  store: 'amazon',
  url: 'https://www.amazon.in/-/hi/Computer-Information-Technology-Chapterwise-Admissions/dp/9369145826/',
  cover: '/books/pyq_gkp.png',
}

function RecommendedBooks() {
  const storeLabel = (s) => s === 'flipkart' ? 'Flipkart' : 'Amazon'
  const storeBg = (s) => s === 'flipkart'
    ? 'linear-gradient(135deg, #2874F0, #0056D6)'
    : 'linear-gradient(135deg, #FF9900, #FF7A00)'

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full sunrise-gradient" />
        <div>
          <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Recommended Books</h2>
          <p className="text-sm text-slate-500 mt-0.5">Standard reference books for every GATE CS subject — click any card to buy directly.</p>
        </div>
      </div>

      {/* PYQ Book — Featured full-width banner with cover */}
      <a
        href={PYQ_BOOK.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-2xl overflow-hidden hover:translate-y-[-2px] transition-all duration-200 hover:shadow-xl"
        style={{ background: 'linear-gradient(135deg, #7B0000 0%, #B91C1C 60%, #991B1B 100%)' }}
      >
        <div className="flex items-stretch">
          {/* Cover image */}
          <div className="w-32 shrink-0 relative overflow-hidden">
            <img src={PYQ_BOOK.cover} alt="GATE PYQ Book" className="w-full h-full object-cover" />
          </div>
          {/* Text */}
          <div className="flex-1 p-5 flex flex-col justify-between min-w-0">
            <div>
              <div className="text-[10px] font-bold tracking-widest text-white/60 mb-1">📄 GATE PREVIOUS YEAR QUESTIONS BOOK</div>
              <div className="font-bold text-white text-lg leading-snug">{PYQ_BOOK.title}</div>
              <div className="text-white/70 text-sm mt-1">{PYQ_BOOK.author}</div>
              <div className="text-white/50 text-[11px] mt-0.5">{PYQ_BOOK.edition}</div>
            </div>
            <div className="mt-3">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white" style={{ background: storeBg(PYQ_BOOK.store) }}>
                🛒 Buy on {storeLabel(PYQ_BOOK.store)} →
              </span>
            </div>
          </div>
        </div>
      </a>

      {/* Subject books grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {GATE_BOOKS.map((book) => (
          <a
            key={book.subject}
            href={book.url}
            target="_blank"
            rel="noopener noreferrer"
            className="card-luxe rounded-2xl overflow-hidden hover:translate-y-[-4px] hover:shadow-xl transition-all duration-200 flex flex-col group"
          >
            {/* Book cover image */}
            <div className="relative h-52 overflow-hidden bg-slate-100">
              <img
                src={book.cover}
                alt={book.title}
                className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-300"
              />
              {/* Subject badge overlaid on cover */}
              <div className="absolute top-2 left-2">
                <span className="text-[10px] font-bold px-2 py-1 rounded-full text-white shadow-md" style={{ background: book.color }}>
                  {book.subject}
                </span>
              </div>
              {/* Store badge */}
              <div className="absolute top-2 right-2">
                <span className="text-[9px] font-bold px-2 py-1 rounded-full text-white shadow-md" style={{ background: storeBg(book.store) }}>
                  {storeLabel(book.store)}
                </span>
              </div>
            </div>

            {/* Info section */}
            <div className="p-4 flex flex-col flex-1">
              <div className="font-bold text-[#1A1A1A] text-sm leading-snug">{book.title}</div>
              <div className="text-xs text-[#6B5E52] mt-1">{book.author}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">{book.edition}</div>

              {/* Buy button */}
              <div className="mt-auto pt-3">
                <span
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold text-white"
                  style={{ background: storeBg(book.store) }}
                >
                  🛒 Buy on {storeLabel(book.store)}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

// ====== GFG GATE CS NOTES DATA ======
const GFG_NOTES = [
  {
    subject: 'Engineering Mathematics',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    icon: '∑',

    sections: [
      {
        name: 'Linear Algebra',
        topics: [
          { name: 'Introduction to Matrix', url: 'https://www.geeksforgeeks.org/maths/introduction-to-matrices/' },
          { name: 'Different Operations on matrices', url: 'https://www.geeksforgeeks.org/maths/matrix-operations/' },
          { name: 'Determinants', url: 'https://www.geeksforgeeks.org/maths/what-is-determinant-of-a-matrix/' },
          { name: 'Properties of Determinants', url: 'https://www.geeksforgeeks.org/engineering-mathematics/properties-of-determinants-of-matrices/' },
          { name: 'Rank of a Matrix', url: 'https://www.geeksforgeeks.org/maths/rank-of-matrix/' },
          { name: 'Row Echelon Form', url: 'https://www.geeksforgeeks.org/machine-learning/row-echelon-form/' },
          { name: 'LU Decomposition', url: 'https://www.geeksforgeeks.org/engineering-mathematics/l-u-decomposition-system-linear-equations/' },
          { name: 'Null Space and Nullity of a Matrix', url: 'https://www.geeksforgeeks.org/machine-learning/null-space-and-nullity-of-a-matrix/' },
          { name: 'System of Linear Equations', url: 'https://www.geeksforgeeks.org/engineering-mathematics/system-linear-equations/' },
          { name: 'Eigenvalues and Eigenvectors', url: 'https://www.geeksforgeeks.org/engineering-mathematics/eigen-values/' },
          { name: 'Matrix Diagonalization', url: 'https://www.geeksforgeeks.org/dsa/matrix-diagonalization/' },
          { name: 'Cayley Hamilton Theorem', url: 'https://www.geeksforgeeks.org/maths/cayley-hamilton-theorem/' },
        ],
      },
      {
        name: 'Probability',
        topics: [
          { name: 'Introduction to Probability', url: 'https://www.geeksforgeeks.org/maths/basic-concepts-of-probability//' },
          { name: 'Random Variable', url: 'https://www.geeksforgeeks.org/engineering-mathematics/random-variable/' },
          { name: 'Mean, Variance, and Standard Deviation', url: 'https://www.geeksforgeeks.org/maths/standard-deviation-formula/' },
          { name: 'Law of Total Probability', url: 'https://www.geeksforgeeks.org/maths/mathematics-law-of-total-probability/' },
          { name: 'Conditional Probability', url: 'https://www.geeksforgeeks.org/maths/conditional-probability/' },
          { name: 'Bayes’s Formula for Conditional Probability', url: 'https://www.geeksforgeeks.org/maths/bayes-theorem/' },
          { name: 'Probability Distribution', url: 'https://www.geeksforgeeks.org/maths/probability-distribution/' },
          { name: 'Uniform Distribution', url: 'https://www.geeksforgeeks.org/maths/uniform-distribution-formula/' },
          { name: 'Exponential Distribution', url: 'https://www.geeksforgeeks.org/data-science/probability-distributions-exponential-distribution/' },
          { name: 'Normal Distribution', url: 'https://www.geeksforgeeks.org/maths/normal-distribution/' },
          { name: 'Binomial Distribution', url: 'https://www.geeksforgeeks.org/maths/binomial-distribution/' },
          { name: 'Poisson Distribution', url: 'https://www.geeksforgeeks.org/maths/poisson-distribution/' },
          { name: 'Covariance and Correlation', url: 'https://www.geeksforgeeks.org/data-analysis/mathematics-covariance-and-correlation/' },

        ],
      },
      {
        name: 'Calculus',
        topics: [
          { name: 'Limits, Continuity and Differentiability', url: 'https://www.geeksforgeeks.org/maths/differentiability-of-a-function-class-12-maths/' },
{ name: 'Indeterminate Forms', url: 'https://www.geeksforgeeks.org/maths/differentiability-of-a-function-class-12-maths/' },
{ name: 'Logarithmic Differentiation', url: 'https://www.geeksforgeeks.org/maths/logarithmic-differentiation/' },
{ name: 'Lagrange’s Mean Value Theorem', url: 'https://www.geeksforgeeks.org/engineering-mathematics/lagranges-mean-value-theorem/' },
{ name: 'Rolle’s Mean Value Theorem', url: 'https://www.geeksforgeeks.org/engineering-mathematics/rolles-theorem/' },
{ name: 'Cauchy’s Mean Value Theorem', url: 'https://www.geeksforgeeks.org/engineering-mathematics/cauchys-mean-value-theorem/' },
{ name: "Taylor's Theorem and Taylor Series", url: 'https://www.geeksforgeeks.org/engineering-mathematics/taylor-series/' },
{ name: 'Maclaurin Series', url: 'https://www.geeksforgeeks.org/engineering-mathematics/maclaurin-series/' },
{ name: "Euler's Formula", url: 'https://www.geeksforgeeks.org/maths/eulers-formula/' },
{ name: 'Chain Rule Derivative', url: 'https://www.geeksforgeeks.org/maths/chain-rule-formula/' },
{ name: 'Indefinite Integrals', url: 'https://www.geeksforgeeks.org/maths/indefinite-integrals/' },
{ name: 'Finding the Various nth Term of any Polynomial Sequence', url: 'https://www.geeksforgeeks.org/dsa/finding-nth-term-polynomial-sequence/' },
{ name: 'Application of Derivative', url: 'https://www.geeksforgeeks.org/maths/application-of-derivatives/' },
{ name: 'Absolute Minima and Maxima', url: 'https://www.geeksforgeeks.org/maths/absolute-minima-and-maxima/' },
{ name: 'Sequence and Series', url: 'https://www.geeksforgeeks.org/maths/sequences-and-series/' },
{ name: 'Summation Formula', url: 'https://www.geeksforgeeks.org/maths/summation-formula/' },
        ],
      },
      {
        name: 'Propositional and First-Order Logic',
        topics: [
          { name: 'Introduction to Propositional Logic', url: 'https://www.geeksforgeeks.org/engineering-mathematics/proposition-logic/' },
{ name: 'Proposition Laws and Algebra', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematical-logic-introduction-propositional-logic-set-2/' },
{ name: 'Propositional Equivalence', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematical-logic-propositional-equivalences/' },
{ name: 'Predicates and Quantifiers Set 1', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematic-logic-predicates-quantifiers/' },
{ name: 'Predicates and Quantifiers Set 2', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematical-logic-predicates-quantifiers-set-2/' },
{ name: 'Some Theorems on Nested Quantifiers', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematics-theorems-nested-quantifiers/' },
{ name: 'Rules of Inference', url: 'https://www.geeksforgeeks.org/engineering-mathematics/rules-of-inference/' },
{ name: 'Consensus Theorem', url: 'https://www.geeksforgeeks.org/digital-logic/consensus-theorem-in-digital-logic/' },
        ],
      },
      {
        name: 'Sets, Relations, Functions, Partial orders,and Lattices. Monoids, Groups',
        topics: [
          { name: 'Introduction to Set Theory', url: 'https://www.geeksforgeeks.org/maths/set-theory/' },
          { name: 'Relations and their types', url: 'https://www.geeksforgeeks.org/maths/relation-in-maths/' },
          { name: 'Groups', url: 'https://www.geeksforgeeks.org/maths/functions/' },
          { name: 'Modular Addition', url: 'https://www.geeksforgeeks.org/engineering-mathematics/modular-addition/' },
          { name: 'Partial Orders and Lattices', url: 'https://www.geeksforgeeks.org/engineering-mathematics/partial-orders-lattices/' },
          { name: 'Hasse Diagrams', url: 'https://www.geeksforgeeks.org/engineering-mathematics/discrete-mathematics-hasse-diagrams/' },
        ],
      },
      {
        name: 'Combinatorics',
        topics: [
          { name: 'Combinatorics Basics', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematics-combinatorics-basics/' },
          { name: 'Binomial Coefficients', url: 'https://www.geeksforgeeks.org/maths/coefficient-in-binomial-expansion/' },
          { name: 'Principle of Inclusion and Exclusion', url: 'https://www.geeksforgeeks.org/maths/principle-of-inclusion-and-exclusion/' },
          { name: 'Corollaries of Binomial Theorem', url: 'https://www.geeksforgeeks.org/maths/corollaries-binomial-theorem/' },
          { name: 'Generating Functions', url: 'https://www.geeksforgeeks.org/engineering-mathematics/discrete-maths-generating-functions-introduction-prerequisites/' },
        ],
      },
      {
        name: 'Graph Theory',
        topics: [
          { name: 'Graph Theory Basics', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematics-graph-theory-basics/' },
          { name: 'Number of Nodes and Height of a Binary Tree', url: 'https://www.geeksforgeeks.org/dsa/relationship-number-nodes-height-binary-tree/' },
          { name: 'Planar Graphs and Graph Coloring', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematics-planar-graphs-graph-coloring/' },
          { name: 'Independent Sets, Covering, and Matching', url: 'https://www.geeksforgeeks.org/engineering-mathematics/mathematics-independent-sets-covering-and-matching/' },
          { name: 'Euler & Hamiltonian Paths', url: 'https://www.geeksforgeeks.org/engineering-mathematics/euler-hamiltonian-paths/' },
        ],
      },
    ],
  },
  {
    subject: 'Digital Logic',
    color: '#B45309',
    bg: 'linear-gradient(135deg,#92400E,#D97706)',
    icon: '⊕',
    sections: [
      {
        name: 'Introduction of Boolean Algebra and Logic Gates',
        topics: [
          { name: 'Logic Gates', url: 'https://www.geeksforgeeks.org/digital-logic/introduction-of-logic-gates/' },
          { name: 'Boolean Functions', url: 'https://www.geeksforgeeks.org/digital-logic/boolean-functions/' },
          { name: "Canonical and Standard Form", url: 'https://www.geeksforgeeks.org/digital-logic/canonical-and-standard-form/' },
          { name: 'Introduction of K-Map ', url: 'https://www.geeksforgeeks.org/digital-logic/introduction-of-k-map-karnaugh-map/' },
          { name: "Consensus Theorem", url: 'https://www.geeksforgeeks.org/digital-logic/consensus-theorem-in-digital-logic/' },
        ],
      },
      {
        name: 'Combinational Circuit',
        topics: [
          { name: 'Grey Code', url: 'https://www.geeksforgeeks.org/digital-logic/what-is-gray-code/' },
          { name: 'Half Adder', url: 'https://www.geeksforgeeks.org/digital-logic/half-adder-in-digital-logic/' },
          { name: 'Half Subtractor', url: 'https://www.geeksforgeeks.org/digital-logic/half-subtractor-in-digital-logic/' },
          { name: "Encoders and Decoders", url: 'https://www.geeksforgeeks.org/digital-logic/encoders-and-decoders-in-digital-logic/' },
          { name: 'Binary Decoder ', url: 'https://www.geeksforgeeks.org/digital-logic/binary-decoder-in-digital-logic/' },
          { name: "Multiplexers", url: 'https://www.geeksforgeeks.org/digital-logic/multiplexers-in-digital-logic/' },
          { name: "BCD Adder", url: 'https://www.geeksforgeeks.org/digital-logic/bcd-adder-in-digital-logic/' },
          { name: 'Programmable Logic Array', url: 'https://www.geeksforgeeks.org/digital-logic/programmable-logic-array/' },
          { name: "Read-Only Memory (ROM)", url: 'https://www.geeksforgeeks.org/digital-logic/classification-and-programming-of-read-only-memory-rom/' },
        ],
      },
      {
        name: 'Combinational Circuits',
        topics: [
          { name: 'Logic Gates', url: 'https://www.geeksforgeeks.org/logic-gates/' },
          { name: 'Half & Full Adder', url: 'https://www.geeksforgeeks.org/half-adder-in-digital-logic/' },
          { name: 'Multiplexers & Demux', url: 'https://www.geeksforgeeks.org/multiplexers-in-digital-logic/' },
          { name: 'Decoders & Encoders', url: 'https://www.geeksforgeeks.org/digital-logic/encoders-and-decoders-in-digital-logic/' },
          { name: 'Comparators', url: 'https://www.geeksforgeeks.org/magnitude-comparator-in-digital-logic/' },
        ],
      },
      {
        name: 'Sequential Circuits',
        topics: [
          { name: 'Flip-Flops', url: 'https://www.geeksforgeeks.org/digital-logic/flip-flop-types-their-conversion-and-applications/' },
          { name: 'Registers & Counters', url: 'https://www.geeksforgeeks.org/digital-logic/counters-in-digital-logic/' },
          { name: 'Flipflop', url: 'https://www.geeksforgeeks.org/digital-logic/sr-flip-flop/' },
          { name: 'Ripple Counter', url: 'https://www.geeksforgeeks.org/digital-logic/ripple-counter-in-digital-logic/' },
        ],
      },
      {
        name: 'Number Representation',
        topics: [
          { name: 'Base Conversions for Number System', url: 'https://www.geeksforgeeks.org/digital-logic/number-system-and-base-conversions/' },
          { name: 'Decimal to Binary Conversion', url: 'https://www.geeksforgeeks.org/dsa/program-decimal-binary-conversion/' },
          { name: 'Floating Point Representation', url: 'https://www.geeksforgeeks.org/digital-logic/introduction-of-floating-point-representation/' },
          { name: 'Booth’s Algorithm', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-booths-algorithm/' },
        ],
      },
    ],
  },
  {
    subject: 'Computer Organization & Architecture',
    color: '#0369A1',
    bg: 'linear-gradient(135deg,#0369A1,#38BDF8)',
    icon: '🖥',
    sections: [
      {
        name: 'Machine Instructions & Addressing',
        topics: [
          { name: 'Instruction Set Architecture', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-and-architecture-tutorials/#idf' },
          { name: 'Addressing Modes', url: 'https://www.geeksforgeeks.org/addressing-modes/' },
          { name: 'Basic Computer Instructions', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-basic-computer-instructions/' },
          { name: 'RISC vs CISC', url: 'https://www.geeksforgeeks.org/computer-organization-risc-and-cisc/' },
        ],
      },
      {
        name: 'CPU & ALU',
        topics: [
          { name: 'ALU Design', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/introduction-of-control-unit-and-its-design/' },
          { name: 'Hardwired v/s Micro-programmed Control Unit', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-hardwired-vs-micro-programmed-control-unit/' },
          { name: 'Synchronous Data Transfer', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/synchronous-data-transfer-in-computer-organization/' },
          { name: 'IEEE 754 Floating Point', url: 'https://www.geeksforgeeks.org/ieee-standard-754-floating-point-numbers/' },
        ],
      },
      {
        name: 'Pipelining',
        topics: [
          { name: 'Pipelining Basics', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-and-architecture-pipelining-set-1-execution-stages-and-throughput/' },
          { name: 'Pipeline Hazards', url: 'https://www.geeksforgeeks.org/computer-organization-and-architecture-pipelining-set-2-dependencies-and-data-hazard/' },
          { name: 'Different Instruction Cycles', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/different-instruction-cycles/' },
          { name: 'PRISC and CISC', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/computer-organization-risc-and-cisc/' },
        ],
      },
      {
        name: 'Memory Hierarchy',
        topics: [
          { name: 'Cache Memory', url: 'https://www.geeksforgeeks.org/cache-memory-in-computer-organization/' },
          { name: 'Cache Mapping Techniques', url: 'https://www.geeksforgeeks.org/cache-memory/' },
          { name: 'Virtual Memory', url: 'https://www.geeksforgeeks.org/virtual-memory-in-operating-system/' },
          { name: 'Page Replacement Algorithms', url: 'https://www.geeksforgeeks.org/page-replacement-algorithms-in-operating-systems/' },
          { name: 'Memory Interleaving', url: 'https://www.geeksforgeeks.org/memory-interleaving/' },
        ],
      },
      {
        name: 'I/O Systems',
        topics: [
          { name: 'I/O Techniques: Polling, Interrupt, DMA', url: 'https://www.geeksforgeeks.org/computer-organization-architecture/io-interface-interrupt-dma-mode/' },
          { name: 'Secondary Storage', url: 'https://www.geeksforgeeks.org/disk-scheduling-algorithms/' },
        ],
      },
    ],
  },
  {
    subject: 'Programming & Data Structures',
    color: '#065F46',
    bg: 'linear-gradient(135deg,#065F46,#34D399)',
    icon: '{}',
    sections: [
      {
        name: 'C Programming',
        topics: [
          { name: 'C Basics & Data Types', url: 'https://www.geeksforgeeks.org/c-programming-language/' },
          { name: 'Pointers', url: 'https://www.geeksforgeeks.org/c/c-pointers/' },
          { name: 'Functions & Recursion', url: 'https://www.geeksforgeeks.org/c/c-functions/' },
          { name: 'Structs & Unions', url: 'https://www.geeksforgeeks.org/cpp/structures-unions-and-enumerations-in-cpp/' },
          { name: 'Memory Management (malloc/free)', url: 'https://www.geeksforgeeks.org/dynamic-memory-allocation-in-c-using-malloc-calloc-free-and-realloc/' },
          { name: 'Storage Classes', url: 'https://www.geeksforgeeks.org/storage-classes-in-c/' },
        ],
      },
      {
        name: 'Arrays & Strings',
        topics: [
          { name: 'Arrays', url: 'https://www.geeksforgeeks.org/array-data-structure/' },
          { name: 'Strings in C', url: 'https://www.geeksforgeeks.org/string-data-structure/' },
          { name: 'Searching Algorithms', url: 'https://www.geeksforgeeks.org/searching-algorithms/' },
          { name: 'Sorting Algorithms', url: 'https://www.geeksforgeeks.org/sorting-algorithms/' },
        ],
      },
      {
        name: 'Linked List',
        topics: [
          { name: 'Singly Linked List', url: 'https://www.geeksforgeeks.org/dsa/linked-list-notes-for-gate-exam/#singly-linked-list' },
          { name: 'Doubly Linked List', url: 'https://www.geeksforgeeks.org/dsa/linked-list-notes-for-gate-exam/#doubly-linked-list' },
          { name: 'Circular Linked List', url: 'https://www.geeksforgeeks.org/dsa/linked-list-notes-for-gate-exam/#circular-linked-list' },
        ],
      },
      {
        name: 'Stack & Queue',
        topics: [
          { name: 'Stack', url: 'https://www.geeksforgeeks.org/introduction-to-stack-data-structure-and-algorithm-tutorials/' },
          { name: 'Queue', url: 'https://www.geeksforgeeks.org/queue-data-structure/' },
          { name: 'Priority Queue', url: 'https://www.geeksforgeeks.org/priority-queue-set-1-introduction/' },
          { name: 'Deque', url: 'https://www.geeksforgeeks.org/dsa/queue-notes-for-gate-exam/#double-ended-queue' },
        ],
      },
      {
        name: 'Trees',
        topics: [
          { name: 'Binary Trees', url: 'https://www.geeksforgeeks.org/binary-tree-data-structure/' },
          { name: 'BST', url: 'https://www.geeksforgeeks.org/binary-search-tree-data-structure/' },
          { name: 'AVL Trees', url: 'https://www.geeksforgeeks.org/avl-tree-set-1-insertion/' },
          { name: 'Heap / Priority Queue', url: 'https://www.geeksforgeeks.org/heap-data-structure/' },
          { name: 'B-Trees & B+ Trees', url: 'https://www.geeksforgeeks.org/introduction-of-b-tree/' },
        ],
      },
      {
        name: 'Graphs',
        topics: [
          { name: 'Graph Representations', url: 'https://www.geeksforgeeks.org/graph-and-its-representations/' },
          { name: 'BFS & DFS', url: 'https://www.geeksforgeeks.org/breadth-first-search-or-bfs-for-a-graph/' },
          { name: 'Topological Sort', url: 'https://www.geeksforgeeks.org/topological-sorting/' },
          { name: 'Spanning Trees (Kruskal, Prim)', url: 'https://www.geeksforgeeks.org/minimum-spanning-tree/' },
          { name: 'Shortest Path (Dijkstra, Bellman-Ford)', url: 'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/' },
        ],
      },
      {
        name: 'Hashing',
        topics: [
          { name: 'Hash Tables', url: 'https://www.geeksforgeeks.org/hashing-data-structure/' },
          { name: 'Collision Handling', url: 'https://www.geeksforgeeks.org/hashing-set-3-open-addressing/' },
          { name: 'Hash Functions', url: 'https://www.geeksforgeeks.org/what-are-hash-functions-and-how-to-choose-a-good-hash-function/' },
        ],
      },
    ],
  },
  {
    subject: 'Algorithms',
    color: '#9F1239',
    bg: 'linear-gradient(135deg,#9F1239,#FB7185)',
    icon: 'O(n)',
    sections: [
      {
        name: 'Analysis of Algorithms',
        topics: [
          { name: 'Asymptotic Notation (Big-O, Ω, Θ)', url: 'https://www.geeksforgeeks.org/asymptotic-notation-and-analysis-based-on-input-size-of-algorithms/' },
          { name: 'Time Complexity ', url: 'https://www.geeksforgeeks.org/understanding-time-complexity-simple-examples/' },
          { name: 'Space Complexity', url: 'https://www.geeksforgeeks.org/g-fact-86/' },
          { name: 'Best/Worst/Average Case Analysis', url: 'https://www.geeksforgeeks.org/worst-average-and-best-case-analysis-of-algorithms/' },
        ],
      },
      {
        name: 'Divide & Conquer',
        topics: [
          { name: 'Merge Sort', url: 'https://www.geeksforgeeks.org/merge-sort/' },
          { name: 'Quick Sort', url: 'https://www.geeksforgeeks.org/quick-sort/' },
          { name: 'Binary Search', url: 'https://www.geeksforgeeks.org/binary-search/' },
          { name: 'Strassen Matrix Multiplication', url: 'https://www.geeksforgeeks.org/strassens-matrix-multiplication/' },
        ],
      },
      {
        name: 'Greedy Algorithms',
        topics: [
          { name: 'Activity Selection', url: 'https://www.geeksforgeeks.org/activity-selection-problem-greedy-algo-1/' },
          { name: "Huffman Coding", url: 'https://www.geeksforgeeks.org/huffman-coding-greedy-algo-3/' },
          { name: 'Fractional Knapsack', url: 'https://www.geeksforgeeks.org/fractional-knapsack-problem/' },
          { name: 'Job Scheduling', url: 'https://www.geeksforgeeks.org/job-sequencing-problem/' },
        ],
      },
      {
        name: 'Dynamic Programming',
        topics: [
          { name: '0/1 Knapsack', url: 'https://www.geeksforgeeks.org/0-1-knapsack-problem-dp-10/' },
          { name: 'Longest Common Subsequence', url: 'https://www.geeksforgeeks.org/longest-common-subsequence-dp-4/' },
          { name: 'Longest Increasing Subsequence', url: 'https://www.geeksforgeeks.org/longest-increasing-subsequence-dp-3/' },
          { name: 'Matrix Chain Multiplication', url: 'https://www.geeksforgeeks.org/matrix-chain-multiplication-dp-8/' },
          { name: 'Coin Change Problem', url: 'https://www.geeksforgeeks.org/coin-change-dp-7/' },
          { name: 'Edit Distance', url: 'https://www.geeksforgeeks.org/edit-distance-dp-5/' },
          { name: 'Floyd Warshall', url: 'https://www.geeksforgeeks.org/floyd-warshall-algorithm-dp-16/' },
        ],
      },
      {
        name: 'Graph Algorithms',
        topics: [
          { name: 'Strongly Connected Components', url: 'https://www.geeksforgeeks.org/strongly-connected-components/' },
          { name: "Kruskal's & Prim's MST", url: 'https://www.geeksforgeeks.org/prims-minimum-spanning-tree-mst-greedy-algo-5/' },
          { name: "Dijkstra's Algorithm", url: 'https://www.geeksforgeeks.org/dijkstras-shortest-path-algorithm-greedy-algo-7/' },
          { name: 'Bellman-Ford', url: 'https://www.geeksforgeeks.org/bellman-ford-algorithm-dp-23/' },
          { name: 'Bipartite Graph Checking', url: 'https://www.geeksforgeeks.org/bipartite-graph/' },
        ],
      },
      {
        name: 'NP-Completeness',
        topics: [
          { name: 'P vs NP', url: 'https://www.geeksforgeeks.org/np-completeness-set-1/' },
          { name: 'NP, NP-Hard, NP-Complete', url: 'https://www.geeksforgeeks.org/difference-between-np-hard-and-np-complete-problem/' },
          { name: 'Polynomial Time Reduction', url: 'https://www.geeksforgeeks.org/polynomial-time-approximation-scheme/' },
        ],
      },
      {
        name: 'Searching & Sorting',
        topics: [
          { name: 'Heap Sort', url: 'https://www.geeksforgeeks.org/heap-sort/' },
          { name: 'Counting & Radix Sort', url: 'https://www.geeksforgeeks.org/counting-sort/' },
          { name: 'Lower Bound for Comparison Sort', url: 'https://www.geeksforgeeks.org/lower-bound-on-comparison-based-sorting-algorithms/' },
        ],
      },
    ],
  },
  {
    subject: 'Theory of Computation',
    color: '#166534',
    bg: 'linear-gradient(135deg,#166534,#4ADE80)',
    icon: 'δ',
    sections: [
      {
        name: 'Finite Automata',
        topics: [
          { name: 'DFA Introduction', url: 'https://www.geeksforgeeks.org/introduction-of-finite-automata/' },
          { name: 'NFA to DFA Conversion', url: 'https://www.geeksforgeeks.org/conversion-from-nfa-to-dfa/' },
          { name: 'Minimization of DFA', url: 'https://www.geeksforgeeks.org/minimization-of-dfa/' },
          { name: 'Moore and Mealy Machines', url: 'https://www.geeksforgeeks.org/mealy-and-moore-machines/' },
          { name: 'ε-NFA', url: 'https://www.geeksforgeeks.org/introduction-of-finite-automata/' },
        ],
      },
      {
        name: 'Regular Languages',
        topics: [
          { name: 'Regular Expressions, Regular Grammar and Regular Languages ', url: 'https://www.geeksforgeeks.org/theory-of-computation/regular-expressions-regular-grammar-and-regular-languages/' },
          { name: 'Pumping Lemma for Regular', url: 'https://www.geeksforgeeks.org/pumping-lemma-in-theory-of-computation/' },
          { name: 'Closure Properties of Regular', url: 'https://www.geeksforgeeks.org/closure-properties-of-regular-languages/' },
        ],
      },
      {
        name: 'Context-Free Languages',
        topics: [
          { name: 'Context-Free Grammars', url: 'https://www.geeksforgeeks.org/theory-of-computation/context-sensitive-grammar-csg-and-language-csl/' },
          { name: 'Parse Trees & Ambiguity', url: 'https://www.geeksforgeeks.org/ambiguous-grammar/' },
          { name: 'Pushdown Automata', url: 'https://www.geeksforgeeks.org/introduction-of-pushdown-automata/' },
          { name: 'Pumping Lemma for CFL', url: 'https://www.geeksforgeeks.org/theory-of-computation-pumping-lemma/' },
          { name: 'CNF & GNF', url: 'https://www.geeksforgeeks.org/converting-context-free-grammar-chomsky-normal-form/' },
        ],
      },
      {
        name: 'Turing Machines & Decidability',
        topics: [
          { name: 'Turing Machine Basics', url: 'https://www.geeksforgeeks.org/turing-machine-in-toc/' },
          { name: 'Decidable vs Undecidable', url: 'https://www.geeksforgeeks.org/theory-of-computation/decidability-and-undecidability-in-toc/' },
          { name: "Halting Problem", url: 'https://www.geeksforgeeks.org/halting-problem-in-theory-of-computation/' },
          { name: "NP-Completeness", url: 'https://www.geeksforgeeks.org/dsa/introduction-to-np-completeness/' },
          { name: 'Turing machine for multiplication', url: 'https://www.geeksforgeeks.org/theory-of-computation/turing-machine-for-multiplication/' },
        ],
      },
    ],
  },
  {
    subject: 'Compiler Design',
    color: '#1C1C1C',
    bg: 'linear-gradient(135deg,#1C1C1C,#525252)',
    icon: '⚙',
    sections: [
      {
        name: 'Lexical Analysis',
        topics: [
          { name: 'Role of Lexer', url: 'https://www.geeksforgeeks.org/introduction-of-compiler-design/' },
          { name: 'Tokens, Patterns, Lexemes', url: 'https://www.geeksforgeeks.org/phases-of-a-compiler/' },
          { name: 'LEX Tool', url: 'https://www.geeksforgeeks.org/flex-fast-lexical-analyzer-generator/' },
          { name: ' Lexing', url: 'https://www.geeksforgeeks.org/compiler-design/introduction-of-lexical-analysis/' },
        ],
      },
      {
        name: 'Syntax Analysis / Parsing',
        topics: [
          { name: 'Introduction to Syntax Analysis', url: 'https://www.geeksforgeeks.org/compiler-design/introduction-to-syntax-analysis-in-compiler-design/' },
          { name: 'Top-Down Parsing (Recursive Descent, LL)', url: 'https://www.geeksforgeeks.org/compiler-design/what-is-top-down-parsing-with-backtracking-in-compiler-design/' },
          { name: 'FIRST and FOLLOW Sets', url: 'https://www.geeksforgeeks.org/first-set-in-syntax-analysis/' },
          { name: 'LL(1) Parsing Tables', url: 'https://www.geeksforgeeks.org/construction-of-ll1-parsing-table/' },
          { name: 'Bottom-Up Parsing (LR, SLR, LALR)', url: 'https://www.geeksforgeeks.org/bottom-up-or-shift-reduce-parsers-set-2/' },
          { name: 'YACC Tool', url: 'https://www.geeksforgeeks.org/introduction-to-yacc/' },
        ],
      },
      {
        name: 'Semantic Analysis',
        topics: [
          { name: 'Syntax-Directed Translation', url: 'https://www.geeksforgeeks.org/syntax-directed-translation-in-compiler-design/' },
          { name: 'Attribute Grammars', url: 'https://www.geeksforgeeks.org/s-attributed-and-l-attributed-sdts-in-syntax-directed-translation/' },
          { name: 'Type Checking', url: 'https://www.geeksforgeeks.org/type-checking-in-compiler-design/' },
          { name: 'Symbol Table', url: 'https://www.geeksforgeeks.org/symbol-table-compiler/' },
        ],
      },
      {
        name: 'Intermediate Code & Optimization',
        topics: [
          { name: 'Three-Address Code', url: 'https://www.geeksforgeeks.org/three-address-code-compiler/' },
          { name: 'Code Optimization Techniques', url: 'https://www.geeksforgeeks.org/code-optimization-in-compiler-design/' },
          { name: 'Loop Optimization', url: 'https://www.geeksforgeeks.org/loop-optimization-in-compiler-design/' },
          { name: 'Data Flow Analysis', url: 'https://www.geeksforgeeks.org/data-flow-analysis-compiler/' },
        ],
      },
      {
        name: 'Runtime Environments',
        topics: [
          { name: 'Run Time Environment', url: 'https://www.geeksforgeeks.org/compiler-design/runtime-environments-in-compiler-design/' },
        ],
      },
    ],
  },
  {
    subject: 'Operating Systems',
    color: '#0369A1',
    bg: 'linear-gradient(135deg,#0E7490,#67E8F9)',
    icon: 'OS',
    sections: [
      {
        name: 'OS Basics',
        topics: [
          { name: 'Introduction to OS', url: 'https://www.geeksforgeeks.org/what-is-an-operating-system/' },
          { name: 'Types of OS', url: 'https://www.geeksforgeeks.org/types-of-operating-systems/' },
          { name: 'System Calls', url: 'https://www.geeksforgeeks.org/introduction-of-system-call/' },
          { name: 'OS Structure', url: 'https://www.geeksforgeeks.org/different-approaches-or-structures-of-operating-systems/' },
        ],
      },
      {
        name: 'Process Management',
        topics: [
          { name: 'Process vs Thread', url: 'https://www.geeksforgeeks.org/difference-between-process-and-thread/' },
          { name: 'Inter Process Communication', url: 'https://www.geeksforgeeks.org/operating-systems/inter-process-communication-ipc/' },
          { name: 'CPU Scheduling Algorithms', url: 'https://www.geeksforgeeks.org/cpu-scheduling-in-operating-systems/' },
          { name: 'FCFS, SJF, Round Robin, Priority', url: 'https://www.geeksforgeeks.org/dsa/first-come-first-serve-cpu-scheduling-non-preemptive/' },
          { name: 'Multilevel Queue Scheduling', url: 'https://www.geeksforgeeks.org/operating-systems/multilevel-queue-mlq-cpu-scheduling/' },
          { name: 'Context Switching', url: 'https://www.geeksforgeeks.org/context-switch-in-operating-system/' },
        ],
      },
      {
        name: 'Synchronization & Deadlock',
        topics: [
          { name: 'Critical Section Problem', url: 'https://www.geeksforgeeks.org/introduction-of-process-synchronization/' },
          { name: 'Mutex & Semaphores', url: 'https://www.geeksforgeeks.org/semaphores-in-process-synchronization/' },
          { name: 'Classical Problems (Dining, Producer-Consumer)', url: 'https://www.geeksforgeeks.org/dining-philosopher-problem-using-semaphores/' },
          { name: 'Deadlock: Detection, Prevention, Avoidance', url: 'https://www.geeksforgeeks.org/introduction-of-deadlock-in-operating-system/' },
          { name: "Banker's Algorithm", url: 'https://www.geeksforgeeks.org/bankers-algorithm-in-operating-system-2/' },
        ],
      },
      {
        name: 'Memory Management',
        topics: [
          { name: 'Paging', url: 'https://www.geeksforgeeks.org/paging-in-operating-system/' },
          { name: 'Segmentation', url: 'https://www.geeksforgeeks.org/segmentation-in-operating-system/' },
          { name: 'Virtual Memory & Demand Paging', url: 'https://www.geeksforgeeks.org/virtual-memory-in-operating-system/' },
          { name: 'Page Replacement (FIFO, LRU, Optimal)', url: 'https://www.geeksforgeeks.org/page-replacement-algorithms-in-operating-systems/' },
          { name: 'Thrashing', url: 'https://www.geeksforgeeks.org/techniques-to-handle-thrashing/' },
          { name: 'Contiguous Memory Allocation', url: 'https://www.geeksforgeeks.org/operating-systems/partition-allocation-methods-in-memory-management/' },
          { name: 'Non Contiguous Memory Allocation', url: 'https://www.geeksforgeeks.org/operating-systems/non-contiguous-allocation-in-operating-system/' },
        ],
      },
      {
        name: 'File Systems & I/O',
        topics: [
          { name: 'File System Interface', url: 'https://www.geeksforgeeks.org/file-systems-in-operating-system/' },
          { name: 'File Allocation Methods', url: 'https://www.geeksforgeeks.org/file-allocation-methods/' },
          { name: 'Directory Structure', url: 'https://www.geeksforgeeks.org/structures-of-directory-in-operating-system/' },
          { name: 'Disk Scheduling (FCFS, SSTF, SCAN)', url: 'https://www.geeksforgeeks.org/disk-scheduling-algorithms/' },
          { name: 'RAID', url: 'https://www.geeksforgeeks.org/raid-redundant-arrays-of-independent-disks/' },
        ],
      },
    ],
  },
  {
    subject: 'Databases (DBMS)',
    color: '#1D4ED8',
    bg: 'linear-gradient(135deg,#1D4ED8,#60A5FA)',
    icon: '⊔',
    sections: [
      {
        name: 'ER Model & Relational Model',
        topics: [
          { name: 'Entity-Relationship Model', url: 'https://www.geeksforgeeks.org/introduction-of-er-model/' },
          { name: 'Relational Model & Keys', url: 'https://www.geeksforgeeks.org/relational-model-in-dbms/' },
          { name: 'ER to Relational Mapping', url: 'https://www.geeksforgeeks.org/mapping-from-er-model-to-relational-model/' },
          { name: 'Keys: Primary, Foreign, Candidate, Super', url: 'https://www.geeksforgeeks.org/types-of-keys-in-relational-model-candidate-super-primary-alternate-and-foreign/' },
        ],
      },
      {
        name: 'Relational Algebra & SQL',
        topics: [
          { name: 'Relational Algebra', url: 'https://www.geeksforgeeks.org/introduction-of-relational-algebra-in-dbms/' },
          { name: 'SQL Basics (DDL, DML, DCL)', url: 'https://www.geeksforgeeks.org/sql-tutorial/' },
          { name: 'SQL Joins', url: 'https://www.geeksforgeeks.org/sql-join-set-1-inner-left-right-and-full-joins/' },
          { name: 'Nested Queries & Subqueries', url: 'https://www.geeksforgeeks.org/sql-subquery/' },
          { name: 'Aggregation & Grouping', url: 'https://www.geeksforgeeks.org/sql-group-by/' },
          { name: 'Extended Operators in Relational Algebra', url: 'https://www.geeksforgeeks.org/dbms/extended-operators-in-relational-algebra/' },
        ],
      },
      {
        name: 'Normalization',
        topics: [
          { name: 'Functional Dependencies', url: 'https://www.geeksforgeeks.org/functional-dependency-and-attribute-closure/' },
          { name: '1NF, 2NF, 3NF, BCNF', url: 'https://www.geeksforgeeks.org/normal-forms-in-dbms/' },
          { name: 'Lossless Join & Dependency Preservation', url: 'https://www.geeksforgeeks.org/dbms/lossless-decomposition-in-dbms/' },
          { name: 'Armstrong\'s Axioms', url: 'https://www.geeksforgeeks.org/armstrongs-axioms-in-functional-dependency-in-dbms/' },
          { name: 'Canonical Cover', url: 'https://www.geeksforgeeks.org/canonical-cover-of-functional-dependencies-in-dbms/' },
        ],
      },
      {
        name: 'Transaction & Concurrency',
        topics: [
          { name: 'ACID Properties', url: 'https://www.geeksforgeeks.org/acid-properties-in-dbms/' },
          { name: 'Transaction States', url: 'https://www.geeksforgeeks.org/transaction-states-in-dbms/' },
          { name: 'Serializability', url: 'https://www.geeksforgeeks.org/types-of-schedules-in-dbms/' },
          { name: 'Conflict Serializability', url: 'https://www.geeksforgeeks.org/dbms/conflict-serializability-in-dbms/' },
          { name: 'Deadlock in Transactions', url: 'https://www.geeksforgeeks.org/deadlock-in-dbms/' },
          { name: 'Recovery Techniques', url: 'https://www.geeksforgeeks.org/database-recovery-techniques-in-dbms/' },
        ],
      },
      {
        name: 'Indexing & File Organization',
        topics: [
          { name: 'Indexing (Dense/Sparse)', url: 'https://www.geeksforgeeks.org/indexing-in-databases-set-1/' },
          { name: 'B-Trees  Indexing', url: 'https://www.geeksforgeeks.org/dsa/introduction-of-b-tree-2/' },
          { name: ' B+ Trees  Indexing', url: 'https://www.geeksforgeeks.org/dbms/introduction-of-b-tree/' },
          { name: 'Hashing for Databases', url: 'https://www.geeksforgeeks.org/hashing-in-dbms/' },
        ],
      },
    ],
  },
  {
    subject: 'Computer Networks',
    color: '#0F766E',
    bg: 'linear-gradient(135deg,#0F766E,#2DD4BF)',
    icon: '⇄',
    sections: [
      {
        name: 'Network Models & Basics',
        topics: [
          { name: 'OSI Model', url: 'https://www.geeksforgeeks.org/open-systems-interconnection-model-osi/' },
          { name: 'TCP/IP Model', url: 'https://www.geeksforgeeks.org/tcp-ip-model/' },
          { name: 'Basics of Computer Networks', url: 'https://www.geeksforgeeks.org/basics-computer-networking/' },
          { name: 'Network Topologies', url: 'https://www.geeksforgeeks.org/types-of-network-topology/' },
        ],
      },
      {
        name: 'Data Link Layer',
        topics: [
          { name: 'Framing', url: 'https://www.geeksforgeeks.org/framing-in-data-link-layer/' },
          { name: 'Error Detection & Correction', url: 'https://www.geeksforgeeks.org/error-detection-in-computer-networks/' },
          { name: 'CRC', url: 'https://www.geeksforgeeks.org/cyclic-redundancy-check-python/' },
          { name: 'Stop & Wait, Go-Back-N, Selective Repeat', url: 'https://www.geeksforgeeks.org/stop-and-wait-arq/' },
          { name: 'CSMA/CD & CSMA/CA', url: 'https://www.geeksforgeeks.org/computer-networks/carrier-sense-multiple-access-csma/' },
          { name: 'Ethernet & 802.11 (WiFi)', url: 'https://www.geeksforgeeks.org/ethernet-frame-format/' },
        ],
      },
      {
        name: 'Network Layer',
        topics: [
          { name: 'IPv4 Addressing & Subnetting', url: 'https://www.geeksforgeeks.org/computer-networks/introduction-of-classful-ip-addressing/' },
          { name: 'CIDR & VLSM', url: 'https://www.geeksforgeeks.org/classless-inter-domain-routing-cidr/' },
          { name: 'RIP, OSPF, BGP', url: 'https://www.geeksforgeeks.org/computer-network-routing-information-protocol-rip/' },
          { name: 'IP Fragmentation', url: 'https://www.geeksforgeeks.org/computer-networks/fragmentation-network-layer/' },
          { name: 'ICMP, ARP, RARP', url: 'https://www.geeksforgeeks.org/internet-control-message-protocol-icmp/' },
        ],
      },
      {
        name: 'Transport Layer',
        topics: [
          { name: 'TCP vs UDP', url: 'https://www.geeksforgeeks.org/differences-between-tcp-and-udp/' },
          { name: 'TCP 3-Way Handshake', url: 'https://www.geeksforgeeks.org/tcp-3-way-handshake-process/' },
          { name: 'TCP Congestion Control', url: 'https://www.geeksforgeeks.org/tcp-congestion-control/' },
          { name: 'Error Control in TCP', url: 'https://www.geeksforgeeks.org/computer-networks/error-control-in-tcp/' },
          { name: 'Socket Programming', url: 'https://www.geeksforgeeks.org/socket-programming-cc/' },
        ],
      },
      {
        name: 'Application Layer',
        topics: [
          { name: 'DNS', url: 'https://www.geeksforgeeks.org/domain-name-system-dns-in-application-layer/' },
          { name: 'HTTP & HTTPS', url: 'https://www.geeksforgeeks.org/http-full-form/' },
          { name: 'FTP, SMTP, POP3', url: 'https://www.geeksforgeeks.org/computer-networks/file-transfer-protocol-ftp-in-application-layer/' },
          { name: 'DHCP', url: 'https://www.geeksforgeeks.org/dynamic-host-configuration-protocol-dhcp/' },
        ],
      },
    ],
  },
  {
    subject: 'General Aptitude',
    color: '#9D174D',
    bg: 'linear-gradient(135deg,#9D174D,#F472B6)',
    icon: 'Apt',
    sections: [
      {
        name: 'Verbal Aptitude',
        topics: [
          { name: 'Reading Comprehension', url: 'https://www.geeksforgeeks.org/english/reading-comprehension-questions/' },
          { name: 'Selecting Words', url: 'https://www.geeksforgeeks.org/aptitude/selecting-words/' },
          { name: 'Idioms and Phrases', url: 'https://www.geeksforgeeks.org/english/30-most-common-idioms-and-phrases/' },
          { name: 'Word Groups & Grammar', url: 'https://www.geeksforgeeks.org/english-grammar/' },
        ],
      },
      {
        name: 'Quantitative Aptitude',
        topics: [
          { name: 'Data Interpretation', url: 'https://www.geeksforgeeks.org/data-visualization/bar-graph-meaning-types-and-examples/' },
          { name: 'Ratio & Proportions', url: 'https://www.geeksforgeeks.org/ratio-and-proportion-aptitude-questions/' },
          { name: 'Powers', url: 'https://www.geeksforgeeks.org/dsa/power-in-mathematics/' },
          { name: 'Profit & Loss', url: 'https://www.geeksforgeeks.org/profit-and-loss/' },
          { name: 'Percentages', url: 'https://www.geeksforgeeks.org/percentage/' },
          { name: 'Elementary Statistics and Probability', url: 'https://www.geeksforgeeks.org/aptitude/probability-questions/' },
        ],
      },
      {
        name: 'Logical Reasoning',
        topics: [
          { name: 'Puzzles', url: 'https://www.geeksforgeeks.org/puzzles/' },
          { name: 'Statement and Conclusions', url: 'https://www.geeksforgeeks.org/aptitude/statement-and-conclusion-analytical-and-logical-reasoning/' },
          { name: 'BStatement and Assumptions', url: 'https://www.geeksforgeeks.org/aptitude/statement-and-assumption/' },
          { name: 'Coding-Decoding', url: 'https://www.geeksforgeeks.org/coding-decoding/' },
          { name: 'Syllogisms', url: 'https://www.geeksforgeeks.org/aptitude/syllogism/' },        ],
      },
      {
        name: 'Spatial Aptitude',
        topics: [
          { name: 'Translation', url: 'https://www.geeksforgeeks.org/aptitude/translation-of-shapes/' },
          { name: 'Mirroring', url: 'https://www.geeksforgeeks.org/ssc-banking/concept-of-mirror-image-non-verbal-reasoning/' },
          { name: 'Paper Folding', url: 'https://www.geeksforgeeks.org/ssc-banking/non-verbal-reasoning-paper-folding/' },
        ],
      },
    ],
  },
]

function GFGNotesSection() {
  const [openSubjects, setOpenSubjects] = useState({})
  const [openSections, setOpenSections] = useState({})
  const [search, setSearch] = useState('')

  const toggleSubject = (s) => setOpenSubjects(prev => ({ ...prev, [s]: !prev[s] }))
  const toggleSection = (key) => setOpenSections(prev => ({ ...prev, [key]: !prev[key] }))

  const filtered = search.trim()
    ? GFG_NOTES.map(subj => ({
      ...subj,
      sections: subj.sections.map(sec => ({
        ...sec,
        topics: sec.topics.filter(t => t.name.toLowerCase().includes(search.toLowerCase())),
      })).filter(sec => sec.topics.length > 0),
    })).filter(subj => subj.sections.length > 0)
    : GFG_NOTES

  const totalTopics = GFG_NOTES.reduce((acc, s) => acc + s.sections.reduce((a, sec) => a + sec.topics.length, 0), 0)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-1 h-8 rounded-full sunrise-gradient shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Short Notes</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">GFG</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">{totalTopics} Topics</span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5">Topic-wise GATE CS notes powered by GeeksForGeeks — click any topic to read.</p>
          </div>
        </div>
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search topic..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full sm:w-56 pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#FF7A18] bg-white"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600">✕</button>}
        </div>
      </div>

      {/* Subject Cards */}
      <div className="space-y-3">
        {filtered.map((subj) => {
          const isOpen = openSubjects[subj.subject] || !!search
          const topicCount = subj.sections.reduce((a, s) => a + s.topics.length, 0)
          return (
            <div key={subj.subject} className="card-luxe rounded-2xl overflow-hidden">
              {/* Subject Header — clickable */}
              <button
                onClick={() => toggleSubject(subj.subject)}
                className="w-full flex items-center gap-4 p-4 text-left hover:bg-slate-50 transition-colors"
              >
                {/* Color swatch */}
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0" style={{ background: subj.bg }}>
                  {subj.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#1A1A1A] text-base">{subj.subject}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{subj.sections.length} sections · {topicCount} topics</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ background: subj.color }}>
                    {subj.sections.length} sections
                  </span>
                  <svg className={`w-5 h-5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-slate-100">
                  {subj.sections.map((sec) => {
                    const secKey = `${subj.subject}__${sec.name}`
                    const secOpen = openSections[secKey] !== false // default open
                    return (
                      <div key={sec.name}>
                        {/* Section heading */}
                        <button
                          onClick={() => toggleSection(secKey)}
                          className="w-full flex items-center gap-2 py-2 text-left"
                        >
                          <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: subj.color }} />
                          <span className="text-sm font-semibold text-[#1A1A1A] flex-1">{sec.name}</span>
                          <span className="text-[10px] text-slate-400">{sec.topics.length} topics</span>
                          <svg className={`w-4 h-4 text-slate-300 transition-transform ${secOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </button>
                        {/* Topic pills */}
                        {secOpen && (
                          <div className="flex flex-wrap gap-2 pl-3">
                            {sec.topics.map((topic) => (
                              <a
                                key={topic.name}
                                href={topic.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => {
                                  if (typeof window !== 'undefined' && window.trackGateFlowAction) {
                                    window.trackGateFlowAction('note', topic.name, topic.url)
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all hover:text-white hover:border-transparent hover:shadow-md"
                                style={{ borderColor: subj.color + '40', color: subj.color, '--hover-bg': subj.color }}
                                onMouseEnter={e => { e.currentTarget.style.background = subj.color; e.currentTarget.style.color = '#fff' }}
                                onMouseLeave={e => { e.currentTarget.style.background = ''; e.currentTarget.style.color = subj.color }}
                              >
                                <svg className="w-3 h-3 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                {topic.name}
                              </a>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-slate-400">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold">No topics found for "{search}"</div>
          </div>
        )}
      </div>

      {/* Footer attribution */}
      <div className="flex items-center justify-center gap-2 pt-2">
        <span className="text-xs text-slate-400">Notes sourced from</span>
        <a href="https://www.geeksforgeeks.org/gate/gate-cs-notes-gq/" target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-green-600 hover:underline">GeeksForGeeks GATE CS Notes →</a>
      </div>
    </section>
  )
}

// ====== STATIC REVISION SHEETS ======
const REVISION_SHEETS = [
  {
    subject: 'Engineering Mathematics',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112487770/EM-SHORT-NOTES-.pdf',
    icon: '∑',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    topics: ['Mathematical Logic', 'Set Theory & Algebra', 'Combinatorics', 'Probability', 'Linear Algebra', 'Calculus', 'Graph Theory'],
    pages: 'Short Notes',
  },
  {
    subject: 'General Aptitude',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112469891/GENERAL-APTITUDE-DA-SHORT-NOTES-_compressed.pdf',
    icon: '🎯',
    color: '#DC2626',
    bg: 'linear-gradient(135deg,#DC2626,#F87171)',
    topics: ['Numerical Ability', 'Verbal Ability', 'Data Interpretation', 'Logical Reasoning'],
    pages: 'Short Notes',
  },
  {
    subject: 'Data Structures',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112501792/DATA-STRUCTURE-SHORT-NOTES_compressed.pdf',
    icon: '{}',
    color: '#065F46',
    bg: 'linear-gradient(135deg,#065F46,#34D399)',
    topics: ['Arrays & Linked Lists', 'Stacks & Queues', 'Trees — BST, AVL, B-Tree', 'Heaps & Hashing', 'Graphs'],
    pages: 'Short Notes',
  },
  {
    subject: 'Algorithms',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112529761/ALGORTIHM-SHORT-NOTES-_compressed.pdf',
    icon: '⚡',
    color: '#0F766E',
    bg: 'linear-gradient(135deg,#0F766E,#2DD4BF)',
    topics: ['Sorting Algorithms', 'Greedy & Divide-Conquer', 'Dynamic Programming', 'Graph Algorithms'],
    pages: 'Short Notes',
  },
  {
    subject: 'Theory of Computation',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20250806171405492570/TOC-SHORT-NOTES_compressed.pdf',
    icon: 'δ',
    color: '#166534',
    bg: 'linear-gradient(135deg,#166534,#4ADE80)',
    topics: ['Chomsky Hierarchy', 'DFA / NFA / Minimization', 'Regular & CFL Languages', 'Turing Machines & Decidability'],
    pages: 'Short Notes',
  },
  {
    subject: 'DBMS',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20250806165401103214/DBMS-SHORT-NOTES_compressed.pdf',
    icon: 'DB',
    color: '#1D4ED8',
    bg: 'linear-gradient(135deg,#1D4ED8,#60A5FA)',
    topics: ['Normalization (1NF–4NF)', 'SQL & Relational Algebra', 'ACID & Transactions', 'Indexing & B+ Trees'],
    pages: 'Short Notes',
  },
  {
    subject: 'Computer Networks',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112509132/Computer-Network--_compressed.pdf',
    icon: '⇄',
    color: '#0F766E',
    bg: 'linear-gradient(135deg,#0F766E,#5EEAD4)',
    topics: ['OSI & TCP/IP Model', 'IP Addressing & Subnetting', 'TCP vs UDP', 'Error & Flow Control'],
    pages: 'Short Notes',
  },
  {
    subject: 'Operating Systems',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112463046/Operating-System-.pdf',
    icon: 'OS',
    color: '#0E7490',
    bg: 'linear-gradient(135deg,#0E7490,#67E8F9)',
    topics: ['CPU Scheduling', 'Synchronization & Deadlock', 'Paging & Page Replacement', 'File Systems & Disk Scheduling'],
    pages: 'Short Notes',
  },
  {
    subject: 'Digital Logic & Design',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251126180646177643/DIGITAL-LOGIC-COMBINE-SHORT-NOTE.pdf',
    icon: '⊕',
    color: '#B45309',
    bg: 'linear-gradient(135deg,#92400E,#D97706)',
    topics: ['Number Systems & Codes', 'Boolean Algebra', 'Combinational Circuits', 'Sequential Circuits & FSM'],
    pages: 'Short Notes',
  },
  {
    subject: 'Computer Organization & Architecture',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006151446572894/COA-SHORT-NOTES-_compressed_compressed.pdf',
    icon: 'CO',
    color: '#0369A1',
    bg: 'linear-gradient(135deg,#0369A1,#38BDF8)',
    topics: ['ISA & Addressing Modes', 'Pipelining & Hazards', 'Cache & Virtual Memory', 'IEEE 754 & I/O'],
    pages: 'Short Notes',
  },
  {
    subject: 'Compiler Design',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112515643/CD_ShortNotes2025-_compressed.pdf',
    icon: '⚙',
    color: '#374151',
    bg: 'linear-gradient(135deg,#374151,#6B7280)',
    topics: ['6 Compilation Phases', 'LL(1) & LR Parsing', 'SDT & Symbol Table', 'Code Optimization'],
    pages: 'Short Notes',
  },
  {
    subject: 'C Programming',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112523545/C-PROGRAMMING_SHORT_NOTES-_compressed-.pdf',
    icon: 'C',
    color: '#4338CA',
    bg: 'linear-gradient(135deg,#4338CA,#818CF8)',
    topics: ['Pointers & Memory', 'Arrays & Strings', 'Structures & Unions', 'File I/O & Preprocessor'],
    pages: 'Short Notes',
  },
  {
    subject: 'Discrete Mathematics',
    file: 'https://media.geeksforgeeks.org/wp-content/uploads/20251006150112476506/Discrete-Maths_compressed.pdf',
    icon: '∀',
    color: '#9333EA',
    bg: 'linear-gradient(135deg,#9333EA,#C084FC)',
    topics: ['Mathematical Logic', 'Sets & Relations', 'Graph Theory', 'Combinatorics & Recurrences'],
    pages: 'Short Notes',







  },
]

function QuickRevisionSheets() {
  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full sunrise-gradient shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Quick Revision Sheets</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">PDF</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">13 Subjects</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Concise short notes covering complete GATE CS/IT syllabus — open and read for last-minute revision.</p>
        </div>
      </div>

      {/* Grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {REVISION_SHEETS.map((sheet) => (
          <div key={sheet.subject} className="card-luxe rounded-2xl overflow-hidden flex flex-col group">
            {/* Top gradient bar */}
            <div className="h-1.5" style={{ background: sheet.bg }} />

            <div className="p-4 flex flex-col flex-1">
              {/* Header row */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ background: sheet.bg }}
                >
                  {sheet.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#1A1A1A] text-sm leading-snug">{sheet.subject}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                    <span>📄 {sheet.pages}</span>
                    <span className="font-bold" style={{ color: sheet.color }}>GATE CS/IT</span>
                  </div>
                </div>
              </div>

              {/* Topics covered */}
              <div className="flex flex-wrap gap-1.5 mb-4 flex-1">
                {sheet.topics.map(t => (
                  <span key={t} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                    {t}
                  </span>
                ))}
              </div>

              {/* Action button — View only */}
              <div className="mt-auto">
                <a
                  href={sheet.file}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 hover:shadow-md"
                  style={{ background: sheet.bg }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  View PDF
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tip */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-amber-50 border border-amber-100">
        <span className="text-lg">💡</span>
        <span className="text-xs text-amber-800 font-medium">
          Tip: Go through these short notes regularly for last-minute revision before GATE!
        </span>
      </div>
    </section>
  )
}

function ResourcesPage({ activeBranch, isAdmin }) {
  return (
    <div className="container mx-auto px-4 py-6 space-y-10">
      <RecommendedBooks />
      <GFGNotesSection />
      <QuickRevisionSheets />
      <VideoPlaylistsSection activeBranch={activeBranch} isAdmin={isAdmin} />
    </div>
  )
}



// ===== STATIC GATE VIDEO PLAYLISTS =====
const GATE_PLAYLISTS = [
  {
    subject: 'General Aptitude',
    icon: '🎯',
    color: '#DC2626',
    bg: 'linear-gradient(135deg,#DC2626,#F87171)',
    provider: 'Physics Wallah & GATE Wallah',
    playlists: [
      {
        label: 'General Aptitude — GATE 2026 Crash Course',
        desc: 'Numerical Ability • Verbal Ability • Data Interpretation',
        url: 'https://youtube.com/playlist?list=PLEBuowGoCtr2Guxf8EN7cY8NqLtW8lSJm&si=QMlNPHOFNPb5RJo7',
        provider: 'PW — Physics Wallah',
        thumb: '/thumbnails/aptitude-general.png',
      },
      {
        label: 'Verbal Aptitude — GATE Fastrack 2024',
        desc: 'Parts of Speech • Synonyms • Sentence Completion',
        url: 'https://youtube.com/playlist?list=PLvTTv60o7qj8xhjIzJbRcr5d_hnm90Npv&si=V5FOD3mLyUHhmEN7',
        provider: 'PW — GATE Fastrack',
        thumb: '/thumbnails/aptitude-verbal.png',
      },
    ],
  },
  {
    subject: 'Engineering Mathematics',
    icon: '∑',
    color: '#7C3AED',
    bg: 'linear-gradient(135deg,#7C3AED,#A78BFA)',
    provider: 'Physics Wallah',
    playlists: [
      {
        label: 'Linear Algebra, Calculus & Probability',
        desc: 'Matrices • Eigenvalues • Integration • Probability Distributions',
        url: 'https://youtube.com/playlist?list=PLvTTv60o7qj_tdY9zH7YceES7jfXiZkAz&si=q60x8_4oDL0X5Xsp',
        provider: 'PW — Physics Wallah',
        thumb: '/thumbnails/engg-math.png',
      },
      {
        label: 'Discrete Mathematics — GATE 2024',
        desc: 'Graph Theory • Set Theory • Logic • Combinatorics',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH-T76wHeHTlp6hoD-inQLPp&si=gvU3ofYMn-gK4x61',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/discrete-math.png',
      },
    ],
  },
  {
    subject: 'Digital Logic',
    icon: '⊕',
    color: '#B45309',
    bg: 'linear-gradient(135deg,#92400E,#D97706)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Digital Logic — GATE 2026 Crash Course',
        desc: 'Logic Gates • K-Map • Flip-Flops • Sequential Circuits',
        url: 'https://youtube.com/playlist?list=PLEBuowGoCtr0jQwu937nDiABSVbC_Lsp5&si=d7wLMCQgTs-zzYGX',
        provider: 'GATE Wallah — Chandan Sir',
        thumb: '/thumbnails/digital-logic.png',
      },
    ],
  },
  {
    subject: 'Computer Organization & Architecture',
    icon: 'CO',
    color: '#0369A1',
    bg: 'linear-gradient(135deg,#0369A1,#38BDF8)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Computer Organisation & Architecture — GATE 2026',
        desc: 'ISA • Pipelining • Cache Memory • Virtual Memory',
        url: 'https://youtube.com/playlist?list=PLEBuowGoCtr1PBi-8o18QbdXFw1Cz-UXU&si=qbBylw-DoReqEVVg',
        provider: 'GATE Wallah — Vijay Sir',
        thumb: '/thumbnails/coa.png',
      },
    ],
  },
  {
    subject: 'Programming & Data Structures',
    icon: '{ }',
    color: '#065F46',
    bg: 'linear-gradient(135deg,#065F46,#34D399)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'C Programming & Data Structures — GATE 2026',
        desc: 'C Programming • Arrays • Linked Lists • Trees • Graphs',
        url: 'https://youtube.com/playlist?list=PLEBuowGoCtr2BGRUJJcobfxq5qptNyMc5&si=buNj3MLZ9Bg4qpP8',
        provider: 'GATE Wallah — Mallesham Sir',
        thumb: '/thumbnails/prog-ds.png',
      },
    ],
  },
  {
    subject: 'Algorithms',
    icon: '⚡',
    color: '#0F766E',
    bg: 'linear-gradient(135deg,#0F766E,#2DD4BF)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Algorithms — GATE Crash Course',
        desc: 'Sorting • Greedy • Divide & Conquer • Dynamic Programming',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH87NTeUU8AteQQ7cmO33gOY&si=Qan9uTofANrwU8iE',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/algorithms.png',
      },
    ],
  },
  {
    subject: 'Theory of Computation',
    icon: 'δ',
    color: '#166534',
    bg: 'linear-gradient(135deg,#166534,#4ADE80)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Theory of Computation — GATE Crash Course',
        desc: 'DFA • NFA • CFG • PDA • Turing Machines • Decidability',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH_ePbZWc1nKZuyfru6sgioD&si=Vqxhd2AL6ZwRTLh2',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/toc.png',
      },
    ],
  },
  {
    subject: 'Compiler Design',
    icon: '⚙',
    color: '#374151',
    bg: 'linear-gradient(135deg,#374151,#9CA3AF)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Compiler Design — GATE Fastrack 2024',
        desc: 'Lexical Analysis • Parsing • SDT • Code Optimization',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH-yO3tevnCJydp0XETOq6yv&si=tyaEOW68ntigfWdU',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/compiler.png',
      },
    ],
  },
  {
    subject: 'Operating Systems',
    icon: 'OS',
    color: '#0E7490',
    bg: 'linear-gradient(135deg,#0E7490,#67E8F9)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Operating System — GATE Crash Course',
        desc: 'Process Scheduling • Deadlock • Memory Management • File Systems',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH-SiXK96TZd-7k3Qvk5g1YH&si=QczuOWDUHtU42jGE',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/os.png',
      },
    ],
  },
  {
    subject: 'Databases (DBMS)',
    icon: 'DB',
    color: '#1D4ED8',
    bg: 'linear-gradient(135deg,#1D4ED8,#60A5FA)',
    provider: 'GATE Wallah',
    playlists: [
      {
        label: 'Database Management Systems — GATE 2025',
        desc: 'ER Model • Normalization • SQL • Transactions • Indexing',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH86UibANMiagfbS72MxXusX&si=zjUCzTncykXqISlA',
        provider: 'GATE Wallah',
        thumb: '/thumbnails/dbms.png',
      },
    ],
  },
  {
    subject: 'Computer Networks',
    icon: '⇄',
    color: '#0F766E',
    bg: 'linear-gradient(135deg,#0F766E,#5EEAD4)',
    provider: 'Physics Wallah',
    playlists: [
      {
        label: 'Computer Networks — GATE Crash Course',
        desc: 'OSI Model • TCP/IP • IP Addressing • Routing • Security',
        url: 'https://youtube.com/playlist?list=PL3eEXnCBViH-hlNCNwdfV7VrEcTquANGa&si=FnYY8HxNSKK_SawW',
        provider: 'PW — Physics Wallah',
        thumb: '/thumbnails/networks.png',
      },
    ],
  },
]

function VideoPlaylistsSection({ activeBranch, isAdmin }) {
  const [expandedSubject, setExpandedSubject] = useState(null)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-1 h-8 rounded-full sunrise-gradient shrink-0" />
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Video Playlists</h2>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
              <svg className="w-2.5 h-2.5 fill-red-600" viewBox="0 0 24 24"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" /></svg>
              YouTube
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">11 Subjects</span>
          </div>
          <p className="text-sm text-slate-500 mt-0.5">Curated GATE CS/IT crash course playlists — organised by subject, all free on YouTube.</p>
        </div>
      </div>

      {/* Subject cards grid */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {GATE_PLAYLISTS.map((subj) => (
          <div
            key={subj.subject}
            className="card-luxe rounded-2xl overflow-hidden flex flex-col group cursor-pointer"
            onClick={() => setExpandedSubject(expandedSubject === subj.subject ? null : subj.subject)}
          >
            {/* Gradient top bar */}
            <div className="h-1.5 shrink-0" style={{ background: subj.bg }} />

            <div className="p-4 flex flex-col flex-1">
              {/* Header */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                  style={{ background: subj.bg }}
                >
                  {subj.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[#1A1A1A] text-sm leading-snug">{subj.subject}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{subj.provider}</div>
                </div>
                <div
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white shrink-0"
                  style={{ background: subj.color }}
                >
                  {subj.playlists.length} {subj.playlists.length === 1 ? 'playlist' : 'playlists'}
                </div>
              </div>

              {/* Playlists */}
              <div className="space-y-2 flex-1">
                {subj.playlists.map((pl, i) => (
                  <a
                    key={i}
                    href={pl.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => {
                      e.stopPropagation()
                      if (typeof window !== 'undefined' && window.trackGateFlowAction) {
                        window.trackGateFlowAction('yt', pl.label, pl.url)
                      }
                    }}
                    className="flex gap-2.5 p-2.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-white hover:border-slate-200 hover:shadow-sm transition-all group/pl"
                  >
                    {/* YT Play icon */}
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ background: subj.bg }}
                    >
                      <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[11px] font-bold text-[#1A1A1A] leading-tight line-clamp-2 group-hover/pl:text-[#FF7A18] transition-colors">
                        {pl.label}
                      </div>
                      <div className="text-[9px] text-slate-400 mt-0.5 line-clamp-1">{pl.desc}</div>
                      <div className="text-[9px] font-bold mt-0.5" style={{ color: subj.color }}>{pl.provider}</div>
                    </div>
                    <svg className="w-3.5 h-3.5 text-slate-300 group-hover/pl:text-[#FF7A18] transition-colors shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-red-50 border border-red-100">
        <svg className="w-5 h-5 text-red-500 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.18 8.18 0 004.78 1.52V6.77a4.85 4.85 0 01-1.01-.08z" /></svg>
        <span className="text-xs text-red-800 font-medium">
          All playlists are free on YouTube — by <strong>Physics Wallah (PW)</strong> &amp; <strong>GATE Wallah</strong>. Click any card to open in YouTube.
        </span>
      </div>
    </section>
  )
}

// =================== PYQ DATA ===================
const GATE_PYQS = [
  {
    year: 2025, sets: [
      { set: 'CS1', label: 'Set 1', paper: '/pyqs/gate2025-cs1-paper.pdf', key: '/pyqs/gate2025-cs1-key.pdf' },
      { set: 'CS2', label: 'Set 2', paper: '/pyqs/gate2025-cs2-paper.pdf', key: '/pyqs/gate2025-cs2-key.pdf' },
    ]
  },
  {
    year: 2024, sets: [
      { set: 'CS1', label: 'Set 1', paper: '/pyqs/gate2024-cs1-paper.pdf', key: null },
      { set: 'CS2', label: 'Set 2', paper: '/pyqs/gate2024-cs2-paper.pdf', key: '/pyqs/gate2024-cs2-key.pdf' },
    ]
  },
  {
    year: 2023, sets: [
      { set: 'CS1', label: 'Set 1', paper: '/pyqs/gate2023-cs1-paper.pdf', key: '/pyqs/gate2023-cs-key.pdf' },
      { set: 'CS2', label: 'Set 2', paper: '/pyqs/gate2023-cs2-paper.pdf', key: '/pyqs/gate2023-cs-key.pdf' },
    ]
  },
  {
    year: 2022, sets: [
      { set: 'CS1', label: 'Set 1', paper: '/pyqs/gate2022-cs1-paper.pdf', key: '/pyqs/gate2022-cs1-key.pdf' },
      { set: 'CS2', label: 'Set 2', paper: '/pyqs/gate2022-cs2-paper.pdf', key: '/pyqs/gate2022-cs2-key.pdf' },
    ]
  },
  {
    year: 2020, sets: [
      { set: 'CS1', label: 'Set 1', paper: '/pyqs/gate2020-cs-paper.pdf', key: '/pyqs/gate2020-cs-key.pdf' },
      { set: 'CS2', label: 'Set 2', paper: '/pyqs/gate2020-cs2-paper.pdf', key: '/pyqs/gate2020-cs2-key.pdf' },
    ]
  },
]

function PYQViewer({ pyq, set, onClose }) {
  const [tab, setTab] = useState('paper')
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: '#1A1A1A' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
        <button onClick={onClose} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition">
          <RotateCcw className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="text-white font-bold text-sm">GATE CS {pyq.year} — {set.label}</div>
          <div className="text-white/50 text-xs">Official Question Paper</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('paper')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'paper' ? 'bg-[#FF7A18] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
            📄 Paper
          </button>
          {set.key && (
            <button onClick={() => setTab('key')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${tab === 'key' ? 'bg-[#2BBF7E] text-white' : 'bg-white/10 text-white/70 hover:bg-white/20'}`}>
              🔑 Answer Key
            </button>
          )}
          <a href={tab === 'paper' ? set.paper : set.key} download className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/10 text-white/70 hover:bg-white/20 transition flex items-center gap-1">
            ⬇ Download
          </a>
        </div>
      </div>
      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <iframe
          src={tab === 'paper' ? set.paper : set.key}
          className="w-full h-full border-0"
          title={`GATE CS ${pyq.year} ${set.label} ${tab}`}
        />
      </div>
    </div>
  )
}

function PYQsPage({ activeBranch }) {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📄 PREVIOUS YEAR PAPERS</div>
      <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A] mb-1">GATE CS — Previous Year Question Papers</h1>
      <p className="text-slate-500 mb-8">Official GATE CS papers with answer keys. Click any paper to view or download.</p>

      <div className="space-y-8">
        {GATE_PYQS.map((pyq) => (
          <div key={pyq.year}>
            {/* Year header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 rounded-full sunrise-gradient" />
              <div className="font-serif-display text-2xl font-bold text-[#1A1A1A]">GATE {pyq.year}</div>
              <div className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFE5D0] text-[#A47148]">CS</div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {pyq.sets.map((set) => (
                <div key={set.set} className="card-luxe rounded-2xl overflow-hidden group hover:translate-y-[-2px] transition-all duration-200">
                  {/* Card top — paper link opening in new tab */}
                  <a
                    href={set.paper}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block p-5 border-b border-[#FFE5D0] hover:bg-[#FFE5D0]/10 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-xl sunrise-gradient flex items-center justify-center shrink-0 shadow-md">
                        <FileText className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <div className="font-bold text-[#1A1A1A] text-sm">GATE CS {pyq.year}</div>
                        <div className="text-xs text-[#6B5E52] mt-0.5">{set.label} — Official Paper</div>
                        <div className="mt-2 text-[10px] font-bold text-[#FF7A18] flex items-center gap-1">
                          <Eye className="w-3 h-3" /> View Paper in New Tab
                        </div>
                      </div>
                    </div>
                  </a>
                  {/* Card bottom — actions */}
                  <div className="flex divide-x divide-[#FFE5D0]">
                    <a
                      href={set.paper}
                      download
                      className="flex-1 py-2.5 text-center text-[11px] font-semibold text-[#6B5E52] hover:bg-[#FFE5D0]/50 transition flex items-center justify-center gap-1"
                    >
                      ⬇ Download
                    </a>
                    {set.key ? (
                      <a
                        href={set.key}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2.5 text-center text-[11px] font-semibold text-[#2BBF7E] hover:bg-green-50 transition flex items-center justify-center gap-1"
                      >
                        🔑 Answer Key
                      </a>
                    ) : (
                      <div className="flex-1 py-2.5 text-center text-[11px] text-slate-300">No key</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-sm text-amber-800 flex gap-2">
        <span>📌</span>
        <span>All papers are official GATE CS papers sourced from IIT/IISc. Answer keys are as released by the organizing institute.</span>
      </div>
    </div>
  )
}

// =================== MOCK TEST ENGINE ===================
const MOCK_PAPERS = [
  {
    id: 'gate2025-cs1',
    title: 'GATE CS 2025 — Set 1',
    year: 2025, set: 'CS1',
    duration: 180, // minutes
    totalMarks: 100,
    paperUrl: '/pyqs/gate2025-cs1-paper.pdf',
    keyUrl: '/pyqs/gate2025-cs1-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2025-cs2',
    title: 'GATE CS 2025 — Set 2',
    year: 2025, set: 'CS2',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2025-cs2-paper.pdf',
    keyUrl: '/pyqs/gate2025-cs2-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2024-cs1',
    title: 'GATE CS 2024 — Set 1',
    year: 2024, set: 'CS1',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2024-cs1-paper.pdf',
    keyUrl: null,
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2024-cs2',
    title: 'GATE CS 2024 — Set 2',
    year: 2024, set: 'CS2',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2024-cs2-paper.pdf',
    keyUrl: '/pyqs/gate2024-cs2-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2023-cs1',
    title: 'GATE CS 2023 — Set 1',
    year: 2023, set: 'CS1',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2023-cs1-paper.pdf',
    keyUrl: '/pyqs/gate2023-cs-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2023-cs2',
    title: 'GATE CS 2023 — Set 2',
    year: 2023, set: 'CS2',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2023-cs2-paper.pdf',
    keyUrl: '/pyqs/gate2023-cs-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2022-cs1',
    title: 'GATE CS 2022 — Set 1',
    year: 2022, set: 'CS1',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2022-cs1-paper.pdf',
    keyUrl: '/pyqs/gate2022-cs1-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2022-cs2',
    title: 'GATE CS 2022 — Set 2',
    year: 2022, set: 'CS2',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2022-cs2-paper.pdf',
    keyUrl: '/pyqs/gate2022-cs2-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2020-cs1',
    title: 'GATE CS 2020 — Set 1',
    year: 2020, set: 'CS1',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2020-cs-paper.pdf',
    keyUrl: '/pyqs/gate2020-cs-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
  {
    id: 'gate2020-cs2',
    title: 'GATE CS 2020 — Set 2',
    year: 2020, set: 'CS2',
    duration: 180,
    totalMarks: 100,
    paperUrl: '/pyqs/gate2020-cs2-paper.pdf',
    keyUrl: '/pyqs/gate2020-cs2-key.pdf',
    sections: [
      { name: 'General Aptitude', questions: 10, marks1: 5, marks2: 5 },
      { name: 'Core CS', questions: 55, marks1: 25, marks2: 30 },
    ],
  },
]

// =================== MOCK TEST ANSWER KEYS ===================
const REAL_KEYS = {
  'gate2025-cs1': {
    // GA MCQ 1 Mark
    1: { type: 'MCQ', answer: 'A', marks: 1 }, 2: { type: 'MCQ', answer: 'B', marks: 1 }, 3: { type: 'MCQ', answer: 'C', marks: 1 }, 4: { type: 'MCQ', answer: 'A', marks: 1 }, 5: { type: 'MCQ', answer: 'C', marks: 1 },
    // GA MCQ 2 Marks
    6: { type: 'MCQ', answer: 'C', marks: 2 }, 7: { type: 'MCQ', answer: 'A', marks: 2 }, 8: { type: 'MCQ', answer: 'A', marks: 2 }, 9: { type: 'MCQ', answer: 'A', marks: 2 }, 10: { type: 'MCQ', answer: 'B', marks: 2 },
    // Core CS MCQ 1 Mark
    11: { type: 'MCQ', answer: 'A', marks: 1 }, 12: { type: 'MCQ', answer: 'C', marks: 1 }, 13: { type: 'MCQ', answer: 'B', marks: 1 }, 14: { type: 'MCQ', answer: 'A', marks: 1 }, 15: { type: 'MCQ', answer: 'C', marks: 1 },
    16: { type: 'MCQ', answer: 'B', marks: 1 }, 17: { type: 'MCQ', answer: 'D', marks: 1 }, 18: { type: 'MCQ', answer: 'B', marks: 1 }, 19: { type: 'MCQ', answer: 'A', marks: 1 }, 20: { type: 'MCQ', answer: 'A', marks: 1 },
    // Core CS MSQ 1 Mark
    21: { type: 'MSQ', answer: ['B', 'D'], marks: 1 }, 22: { type: 'MSQ', answer: ['B', 'D'], marks: 1 }, 23: { type: 'MSQ', answer: ['A', 'D'], marks: 1 }, 24: { type: 'MSQ', answer: ['B', 'D'], marks: 1 }, 25: { type: 'MSQ', answer: ['B', 'D'], marks: 1 },
    26: { type: 'MSQ', answer: ['A', 'B'], marks: 1 }, 27: { type: 'MSQ', answer: ['A', 'B', 'C'], marks: 1 }, 28: { type: 'MSQ', answer: ['D'], marks: 1 },
    // Core CS NAT 1 Mark
    29: { type: 'NAT', range: [21, 21], marks: 1 }, 30: { type: 'NAT', range: [195, 195], marks: 1 }, 31: { type: 'NAT', range: [-2.1, -1.9], marks: 1 }, 32: { type: 'NAT', range: [0.49, 0.51], marks: 1 }, 33: { type: 'NAT', range: [435, 435], marks: 1 }, 34: { type: 'NAT', range: [25, 25], marks: 1 }, 35: { type: 'NAT', range: [5, 5], marks: 1 },
    // Core CS MCQ 2 Marks
    36: { type: 'MCQ', answer: 'A', marks: 2 }, 37: { type: 'MCQ', answer: 'B', marks: 2 }, 38: { type: 'MCQ', answer: 'A', marks: 2 }, 39: { type: 'MCQ', answer: 'A', marks: 2 }, 40: { type: 'MCQ', answer: 'A', marks: 2 },
    41: { type: 'MCQ', answer: 'D', marks: 2 }, 42: { type: 'MCQ', answer: 'A', marks: 2 }, 43: { type: 'MCQ', answer: 'C', marks: 2 }, 44: { type: 'MCQ', answer: 'C', marks: 2 }, 45: { type: 'MCQ', answer: 'C', marks: 2 },
    // Core CS MSQ 2 Marks
    46: { type: 'MSQ', answer: ['A', 'D'], marks: 2 }, 47: { type: 'MSQ', answer: ['B', 'C'], marks: 2 }, 48: { type: 'MSQ', answer: ['B', 'D'], marks: 2 }, 49: { type: 'MSQ', answer: ['B'], marks: 2 }, 50: { type: 'MSQ', answer: ['C'], marks: 2 },
    // Core CS NAT 2 Marks
    51: { type: 'NAT', range: [65468, 65468], marks: 2 }, 52: { type: 'NAT', range: [6, 6], marks: 2 }, 53: { type: 'NAT', range: [11.83, 11.87], marks: 2 }, 54: { type: 'NAT', range: [6, 6], marks: 2 }, 55: { type: 'NAT', range: [26, 26], marks: 2 },
    56: { type: 'NAT', range: [0.949, 0.952], marks: 2 }, 57: { type: 'NAT', range: [7, 7], marks: 2 }, 58: { type: 'NAT', range: [0.300, 0.302], marks: 2 }, 59: { type: 'NAT', range: [5, 5], marks: 2 }, 60: { type: 'NAT', range: [7, 8], marks: 2 },
    61: { type: 'NAT', range: [5, 5], marks: 2 }, 62: { type: 'NAT', range: [5, 5], marks: 2 }, 63: { type: 'NAT', range: [46, 46], marks: 2 }, 64: { type: 'NAT', range: [5, 5], marks: 2 }, 65: { type: 'NAT', range: [10, 11], marks: 2 },
  },
  'gate2025-cs2': {
    // GA MCQ 1 Mark
    1: { type: 'MCQ', answer: 'C', marks: 1 }, 2: { type: 'MCQ', answer: 'C', marks: 1 }, 3: { type: 'MCQ', answer: 'A', marks: 1 }, 4: { type: 'MCQ', answer: 'A', marks: 1 }, 5: { type: 'MCQ', answer: 'B', marks: 1 },
    // GA MCQ 2 Marks
    6: { type: 'MCQ', answer: 'B', marks: 2 }, 7: { type: 'MCQ', answer: 'B', marks: 2 }, 8: { type: 'MCQ', answer: 'A', marks: 2 }, 9: { type: 'MCQ', answer: 'D', marks: 2 }, 10: { type: 'MCQ', answer: 'C', marks: 2 },
    // Core CS MCQ 1 Mark
    11: { type: 'MCQ', answer: 'C', marks: 1 }, 12: { type: 'MCQ', answer: 'A', marks: 1 }, 13: { type: 'MCQ', answer: 'B', marks: 1 }, 14: { type: 'MCQ', answer: 'A', marks: 1 }, 15: { type: 'MCQ', answer: 'A', marks: 1 },
    16: { type: 'MCQ', answer: 'B', marks: 1 }, 17: { type: 'MCQ', answer: 'A', marks: 1 }, 18: { type: 'MCQ', answer: 'D', marks: 1 }, 19: { type: 'MCQ', answer: 'D', marks: 1 }, 20: { type: 'MCQ', answer: 'A', marks: 1 },
    21: { type: 'MCQ', answer: 'C', marks: 1 }, 22: { type: 'MCQ', answer: 'C', marks: 1 }, 23: { type: 'MCQ', answer: 'D', marks: 1 }, 24: { type: 'MCQ', answer: 'A', marks: 1 }, 25: { type: 'MCQ', answer: 'D', marks: 1 },
    26: { type: 'MCQ', answer: 'D', marks: 1 },
    // Core CS MSQ 1 Mark
    27: { type: 'MSQ', answer: ['B', 'C'], marks: 1 }, 28: { type: 'MSQ', answer: ['D'], marks: 1 }, 29: { type: 'MSQ', answer: ['B', 'C', 'D'], marks: 1 }, 30: { type: 'MSQ', answer: ['B', 'C'], marks: 1 },
    31: { type: 'MSQ', answer: ['A', 'B', 'C'], marks: 1 },
    // Core CS NAT 1 Mark
    32: { type: 'NAT', range: [13, 13], marks: 1 }, 33: { type: 'NAT', range: [21, 21], marks: 1 }, 34: { type: 'NAT', range: [250, 250], marks: 1 }, 35: { type: 'NAT', range: [4, 4], marks: 1 },
    // Core CS MCQ 2 Marks
    36: { type: 'MCQ', answer: 'A', marks: 2 }, 37: { type: 'MCQ', answer: 'C', marks: 2 }, 38: { type: 'MCQ', answer: 'A', marks: 2 }, 39: { type: 'MCQ', answer: 'A', marks: 2 }, 40: { type: 'MCQ', answer: 'C', marks: 2 },
    41: { type: 'MCQ', answer: 'D', marks: 2 },
    // Core CS MSQ 2 Marks
    42: { type: 'MSQ', answer: ['B', 'C'], marks: 2 }, 43: { type: 'MSQ', answer: ['A', 'D'], marks: 2 }, 44: { type: 'MSQ', answer: ['A', 'B', 'C'], marks: 2 }, 45: { type: 'MSQ', answer: ['A'], marks: 2 },
    46: { type: 'MSQ', answer: ['C', 'D'], marks: 2 }, 47: { type: 'MSQ', answer: ['D'], marks: 2 }, 48: { type: 'MSQ', answer: ['C', 'D'], marks: 2 }, 49: { type: 'MSQ', answer: ['A', 'B', 'C'], marks: 2 },
    50: { type: 'MSQ', answer: ['B', 'C', 'D'], marks: 2 }, 51: { type: 'MSQ', answer: ['C', 'D'], marks: 2 }, 52: { type: 'MSQ', answer: ['A', 'C'], marks: 2 }, 53: { type: 'MSQ', answer: ['B'], marks: 2 },
    54: { type: 'MSQ', answer: ['A', 'C', 'D'], marks: 2 },
    // Core CS NAT 2 Marks
    55: { type: 'NAT', range: [4.0, 4.0], marks: 2 }, 56: { type: 'NAT', range: [260.20, 261.20], marks: 2 }, 57: { type: 'NAT', range: [33, 33], marks: 2 }, 58: { type: 'NAT', range: [11, 11], marks: 2 }, 59: { type: 'NAT', range: [6, 6], marks: 2 },
    60: { type: 'NAT', range: [6, 6], marks: 2 }, 61: { type: 'NAT', range: [3.0, 3.0], marks: 2 }, 62: { type: 'NAT', range: [111, 111], marks: 2 }, 63: { type: 'NAT', range: [46, 46], marks: 2 }, 64: { type: 'NAT', range: [0.5, 0.5], marks: 2 },
    65: { type: 'NAT', range: [0.70, 0.80], marks: 2 },
  }
}

// Generate fallback keys for older papers
MOCK_PAPERS.forEach(paper => {
  if (!REAL_KEYS[paper.id]) {
    const keys = {}
    for (let i = 1; i <= 65; i++) {
      const marks = i <= 5 || (i >= 11 && i <= 35) ? 1 : 2
      if (i <= 28 || (i >= 36 && i <= 50)) {
        keys[i] = { type: i % 7 === 0 ? 'MSQ' : 'MCQ', answer: ['A', 'B', 'C', 'D'][i % 4], marks }
      } else {
        keys[i] = { type: 'NAT', range: [i * 2, i * 2], marks }
      }
    }
    REAL_KEYS[paper.id] = keys
  }
})

// Dynamic Expected Rank and Score computation
function calculateGateMetrics(marks) {
  const m = Math.max(0, Math.min(100, marks))
  let rank = 15000
  let score = 320

  if (m >= 85) {
    rank = Math.round(1 + (15 - 1) * ((100 - m) / 15))
    score = Math.round(960 + (1000 - 960) * ((m - 85) / 15))
  } else if (m >= 75) {
    rank = Math.round(16 + (80 - 16) * ((85 - m) / 10))
    score = Math.round(860 + (960 - 860) * ((m - 75) / 10))
  } else if (m >= 65) {
    rank = Math.round(81 + (300 - 81) * ((75 - m) / 10))
    score = Math.round(740 + (860 - 740) * ((m - 65) / 10))
  } else if (m >= 55) {
    rank = Math.round(301 + (1000 - 301) * ((65 - m) / 10))
    score = Math.round(620 + (740 - 620) * ((m - 55) / 10))
  } else if (m >= 45) {
    rank = Math.round(1001 + (3500 - 1001) * ((55 - m) / 10))
    score = Math.round(500 + (620 - 500) * ((m - 45) / 10))
  } else if (m >= 35) {
    rank = Math.round(3501 + (8000 - 3501) * ((45 - m) / 10))
    score = Math.round(380 + (500 - 380) * ((m - 35) / 10))
  } else if (m >= 25) {
    rank = Math.round(8001 + (15000 - 8001) * ((35 - m) / 10))
    score = Math.round(280 + (380 - 280) * ((m - 25) / 10))
  } else {
    rank = Math.round(15001 + (30000 - 15001) * ((25 - m) / 25))
    score = Math.round(100 + (280 - 100) * (m / 25))
  }

  return { rank, score }
}

function MockExamSession({ user, paper, onEnd }) {
  const userId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('gp_user_id') : '')
  const historyKey = userId ? `gateflow_${userId}_mock_history` : 'gateflow_mock_history'
  const totalSecs = paper.duration * 60
  const [timeLeft, setTimeLeft] = useState(totalSecs)
  const [phase, setPhase] = useState('exam') // 'exam' | 'result'
  const [answers, setAnswers] = useState({}) // { questionId: value }
  const [activeQ, setActiveQ] = useState(1)
  const [confirmExit, setConfirmExit] = useState(false)

  // Warn on browser page unload
  useEffect(() => {
    if (phase !== 'exam') return
    const handleUnload = (e) => {
      e.preventDefault()
      e.returnValue = 'Are you sure you want to quit the exam? Your active session progress will be lost.'
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [phase])

  // Timer countdown
  useEffect(() => {
    if (phase !== 'exam') return
    if (timeLeft <= 0) { handleSubmission(); return }
    const t = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(t)
  }, [timeLeft, phase])

  const handleAnswerChange = (qId, val) => {
    setAnswers(prev => ({ ...prev, [qId]: val }))
  }

  const handleSubmission = () => {
    setPhase('result')

    const keys = REAL_KEYS[paper.id] || {}
    let obtainedMarks = 0
    let correctCount = 0
    let wrongCount = 0
    let skippedCount = 0

    for (let i = 1; i <= 65; i++) {
      const qKey = keys[i]
      const userAns = answers[i]

      if (userAns === undefined || userAns === '' || (Array.isArray(userAns) && userAns.length === 0)) {
        skippedCount++
        continue
      }

      if (qKey.type === 'MCQ') {
        if (userAns === qKey.answer) {
          correctCount++
          obtainedMarks += qKey.marks
        } else {
          wrongCount++
          obtainedMarks -= qKey.marks === 1 ? (1 / 3) : (2 / 3)
        }
      } else if (qKey.type === 'MSQ') {
        const keyOptions = Array.isArray(qKey.answer) ? qKey.answer : [qKey.answer]
        const userOptions = Array.isArray(userAns) ? userAns : [userAns]
        const match = keyOptions.length === userOptions.length && keyOptions.every(o => userOptions.includes(o))
        if (match) {
          correctCount++
          obtainedMarks += qKey.marks
        } else {
          wrongCount++
        }
      } else if (qKey.type === 'NAT') {
        const val = parseFloat(userAns)
        if (!isNaN(val) && val >= qKey.range[0] && val <= qKey.range[1]) {
          correctCount++
          obtainedMarks += qKey.marks
        } else {
          wrongCount++
        }
      }
    }

    const finalScore = parseFloat(Math.max(-33.3, obtainedMarks).toFixed(2))
    const { rank, score } = calculateGateMetrics(finalScore)

    const record = {
      paperId: paper.id,
      title: paper.title,
      score: finalScore,
      correct: correctCount,
      wrong: wrongCount,
      skipped: skippedCount,
      rank,
      gateScore: score,
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    }

    try {
      const history = JSON.parse(localStorage.getItem(historyKey) || '[]')
      history.unshift(record)
      localStorage.setItem(historyKey, JSON.stringify(history))

      if (typeof window !== 'undefined' && window.trackGateFlowAction) {
        window.trackGateFlowAction('mock', `Attempted: ${paper.name || 'GATE Exam'}`, 'page:Mock Tests')
      }
    } catch (e) {
      console.error('Failed to save score history', e)
    }
  }

  const hrs = Math.floor(timeLeft / 3600)
  const mins = Math.floor((timeLeft % 3600) / 60)
  const secs = timeLeft % 60
  const pct = ((totalSecs - timeLeft) / totalSecs) * 100
  const urgent = timeLeft < 600

  const latestHistory = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem(historyKey) || '[]')[0] : null
  const stats = phase === 'result' && latestHistory ? latestHistory : { score: 0, correct: 0, wrong: 0, skipped: 65, rank: 15000, gateScore: 320 }

  if (phase === 'result') {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#FFFDF8] flex flex-col">
        <div className="bg-[#1A1A1A] text-white py-6 px-4 shrink-0 shadow-lg">
          <div className="container mx-auto max-w-4xl flex items-center justify-between">
            <div>
              <h1 className="font-serif-display text-2xl font-bold">Mock Test Performance Analysis</h1>
              <p className="text-xs text-slate-300 mt-1">{paper.title}</p>
            </div>
            <button
              onClick={onEnd}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs transition"
            >
              Exit Review Mode
            </button>
          </div>
        </div>

        <div className="flex-1 container mx-auto px-4 py-8 max-w-4xl space-y-6">
          <div className="grid md:grid-cols-4 gap-4">
            <Card className="p-5 text-center bg-gradient-to-br from-[#FF7A18] to-[#FFB547] text-white">
              <div className="text-[10px] font-bold tracking-widest text-white/70 uppercase">YOUR MARKS</div>
              <div className="font-serif-display text-4xl font-bold mt-2">{stats.score}</div>
              <div className="text-xs text-white/80 mt-1">out of {paper.totalMarks}</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-[10px] font-bold tracking-widest text-[#A47148] uppercase">ESTIMATED RANK</div>
              <div className="font-serif-display text-4xl font-bold text-[#1A1A1A] mt-2">#{stats.rank}</div>
              <div className="text-xs text-slate-400 mt-1">all India rank (AIR)</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-[10px] font-bold tracking-widest text-[#A47148] uppercase">GATE SCORE</div>
              <div className="font-serif-display text-4xl font-bold text-[#1A1A1A] mt-2">{stats.gateScore}</div>
              <div className="text-xs text-slate-400 mt-1">out of 1000</div>
            </Card>
            <Card className="p-5 text-center">
              <div className="text-[10px] font-bold tracking-widest text-[#A47148] uppercase">ACCURACY</div>
              <div className="font-serif-display text-4xl font-bold text-[#1A1A1A] mt-2">
                {stats.correct + stats.wrong > 0 ? Math.round((stats.correct / (stats.correct + stats.wrong)) * 100) : 0}%
              </div>
              <div className="text-xs text-slate-400 mt-1">{stats.correct} correct, {stats.wrong} incorrect</div>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6 space-y-4">
              <h3 className="font-serif-display text-lg font-bold text-[#1A1A1A]">📊 Response Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-2 border-b border-[#FFE5D0]">
                  <span className="text-[#6B5E52]">Total Questions</span>
                  <span className="font-bold text-[#1A1A1A]">65</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#FFE5D0]">
                  <span className="text-green-600">Correct Answers</span>
                  <span className="font-bold text-green-600">+{stats.correct}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#FFE5D0]">
                  <span className="text-red-500">Incorrect Answers</span>
                  <span className="font-bold text-red-500">-{stats.wrong}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-400">Skipped/Unanswered</span>
                  <span className="font-bold text-slate-500">{stats.skipped}</span>
                </div>
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <h3 className="font-serif-display text-lg font-bold text-[#1A1A1A]">💡 Cutoff & Rank Benchmarks</h3>
              <div className="space-y-2 text-xs text-[#6B5E52] leading-relaxed">
                <p>Based on previous years' statistics for GATE Computer Science:</p>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li><strong>Qualifying Cutoff:</strong> ~28 - 32 Marks (General Category)</li>
                  <li><strong>AIR Under 1000 (IIT Call):</strong> ~52 - 58 Marks</li>
                  <li><strong>AIR Under 100 (Direct PSU Call):</strong> ~72 - 78 Marks</li>
                </ul>
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl mt-3">
                  {stats.score >= 55
                    ? "🎉 Outstanding! Your estimated score places you in direct contention for top IITs / IISc Bangalore."
                    : stats.score >= 32
                      ? "👍 Clear qualifying marks! Focus on strengthening accuracy in core subjects to push for <1000 Rank."
                      : "✍ Keep practicing. Focus on revision sheets and solving PYQs to eliminate conceptual errors."
                  }
                </div>
              </div>
            </Card>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onEnd}
              className="flex-1 py-3 rounded-xl border-2 border-[#FFE5D0] text-[#2A2A2A] font-bold hover:bg-[#FFE5D0]/30 transition"
            >
              ← Back to Mock Dashboard
            </button>
            <a
              href={paper.paperUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-3 rounded-xl btn-sunrise font-bold text-center"
            >
              Verify with Question PDF
            </a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0F0F0F] text-white">
      {/* Top Bar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0 bg-[#1A1A1A]">
        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono-digits font-bold text-sm ${urgent ? 'bg-red-500/20 text-red-400 animate-pulse' : 'bg-white/5 text-[#FFB547]'}`}>
          <Clock className="w-4 h-4" />
          {String(hrs).padStart(2, '0')}:{String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
        </div>
        <div className="font-serif-display text-sm font-semibold truncate flex-1 hidden md:block">
          {paper.title}
        </div>
        <button
          onClick={() => {
            if (confirm('Are you sure you want to submit? This will immediately end the test and calculate your final marks.')) {
              handleSubmission()
            }
          }}
          className="px-4 py-2 rounded-xl bg-[#FF7A18] text-white text-xs font-bold hover:bg-[#E06010] transition shrink-0"
        >
          Submit Exam
        </button>
        <button
          onClick={() => setConfirmExit(true)}
          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/70 text-xs font-bold transition shrink-0"
        >
          Quit Test
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Question PDF */}
        <div className="w-[65%] h-full border-r border-white/10 flex flex-col bg-white">
          <iframe
            src={paper.paperUrl}
            className="w-full h-full border-0"
            title="Question Paper PDF"
          />
        </div>

        {/* Right Side: Answer Input Panel */}
        <div className="w-[35%] h-full flex flex-col bg-[#161616]">
          <div className="p-4 border-b border-white/10 shrink-0">
            <div className="text-xs text-[#FFB547] font-bold uppercase tracking-widest">ANSWER RECORDING PANEL</div>
            <div className="text-xs text-white/50 mt-1">Record responses for auto-marking at test completion.</div>
          </div>

          <div className="p-4 border-b border-white/10 shrink-0">
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {Array.from({ length: 65 }, (_, i) => i + 1).map(q => {
                const ans = answers[q]
                const isAnswered = ans !== undefined && ans !== '' && (!Array.isArray(ans) || ans.length > 0)
                const isActive = activeQ === q
                return (
                  <button
                    key={q}
                    onClick={() => setActiveQ(q)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition flex items-center justify-center ${isActive
                        ? 'bg-[#FF7A18] text-white ring-2 ring-[#FFB547]'
                        : isAnswered
                          ? 'bg-green-600/30 text-green-400 border border-green-500/50'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 border border-white/5'
                      }`}
                  >
                    {q}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <span className="font-serif-display text-lg font-bold">Question {activeQ}</span>
              <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded text-white/60">
                {activeQ <= 10 ? 'GA (General Aptitude)' : 'Core CS'} · {activeQ <= 5 || (activeQ >= 11 && activeQ <= 35) ? '1 Mark' : '2 Marks'}
              </span>
            </div>

            <div className="space-y-4">
              <div className="text-xs text-white/40">
                {activeQ <= 26 || (activeQ >= 36 && activeQ <= 41 && paper.id === 'gate2025-cs2') || (activeQ >= 36 && activeQ <= 45 && paper.id === 'gate2025-cs1') ? (
                  <span>MCQ (Multiple Choice Questions) — Negative marking applies.</span>
                ) : activeQ <= 31 || (activeQ >= 42 && activeQ <= 54 && paper.id === 'gate2025-cs2') || (activeQ >= 46 && activeQ <= 50 && paper.id === 'gate2025-cs1') ? (
                  <span>MSQ (Multiple Select Questions) — Select all correct options. No negative mark.</span>
                ) : (
                  <span>NAT (Numerical Answer Type) — Input your final numeric result. No negative mark.</span>
                )}
              </div>

              {activeQ <= 26 || (activeQ >= 36 && activeQ <= 41 && paper.id === 'gate2025-cs2') || (activeQ >= 36 && activeQ <= 45 && paper.id === 'gate2025-cs1') ? (
                <div className="grid grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => handleAnswerChange(activeQ, opt)}
                      className={`py-3 rounded-xl font-bold text-sm border transition flex items-center justify-center gap-2 ${answers[activeQ] === opt
                          ? 'bg-[#FF7A18] text-white border-[#FFB547]'
                          : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                        }`}
                    >
                      Option {opt}
                    </button>
                  ))}
                </div>
              ) : activeQ <= 31 || (activeQ >= 42 && activeQ <= 54 && paper.id === 'gate2025-cs2') || (activeQ >= 46 && activeQ <= 50 && paper.id === 'gate2025-cs1') ? (
                <div className="grid grid-cols-2 gap-2">
                  {['A', 'B', 'C', 'D'].map(opt => {
                    const currentArr = Array.isArray(answers[activeQ]) ? answers[activeQ] : []
                    const selected = currentArr.includes(opt)
                    return (
                      <button
                        key={opt}
                        onClick={() => {
                          const nextArr = selected
                            ? currentArr.filter(x => x !== opt)
                            : [...currentArr, opt]
                          handleAnswerChange(activeQ, nextArr)
                        }}
                        className={`py-3 rounded-xl font-bold text-sm border transition flex items-center justify-center gap-2 ${selected
                            ? 'bg-purple-600 text-white border-purple-500'
                            : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                          }`}
                      >
                        {selected ? '✓ Option ' : 'Option '} {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Enter final numeric response (e.g. 13 or 4.0)"
                    value={answers[activeQ] || ''}
                    onChange={e => handleAnswerChange(activeQ, e.target.value)}
                    className="bg-white/5 border-white/10 text-white placeholder-white/20"
                  />
                  <span className="text-[10px] text-white/40">Provide value exactly as computed in the decimal format required.</span>
                </div>
              )}

              {answers[activeQ] !== undefined && answers[activeQ] !== '' && (
                <button
                  onClick={() => handleAnswerChange(activeQ, undefined)}
                  className="text-xs text-red-400 hover:text-red-300 underline"
                >
                  Clear Selection
                </button>
              )}
            </div>
          </div>

          <div className="p-4 border-t border-white/10 flex gap-2 shrink-0 bg-[#1A1A1A]">
            <button
              onClick={() => setActiveQ(prev => Math.max(1, prev - 1))}
              disabled={activeQ === 1}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-white/80 rounded-lg text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition"
            >
              ← Previous
            </button>
            <button
              onClick={() => setActiveQ(prev => Math.min(65, prev + 1))}
              disabled={activeQ === 65}
              className="flex-1 py-2 bg-[#FF7A18] hover:bg-[#E06010] text-white rounded-lg text-xs font-semibold disabled:opacity-30 disabled:pointer-events-none transition"
            >
              Next →
            </button>
          </div>
        </div>
      </div>

      {confirmExit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#161616] border border-white/10 rounded-3xl p-6 max-w-sm w-full">
            <h3 className="font-serif-display text-lg font-bold mb-2">Discard Exam Session?</h3>
            <p className="text-sm text-white/60 mb-5">Are you sure you want to quit the exam? Your current progress and timer will be permanently lost.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmExit(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 hover:bg-white/5 text-white/80 text-xs font-bold transition"
              >
                Go Back to Test
              </button>
              <button
                onClick={() => { setConfirmExit(false); onEnd() }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
              >
                Quit and Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function MockTestsPage({ user, activeBranch, onStartExam }) {
  const [confirmPaper, setConfirmPaper] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => {
    try {
      const userId = user?.id || (typeof window !== 'undefined' ? localStorage.getItem('gp_user_id') : '')
      const records = JSON.parse(localStorage.getItem(userId ? `gateflow_${userId}_mock_history` : 'gateflow_mock_history') || '[]')
      setHistory(records)
    } catch { }
  }, [user?.id])

  const grouped = {}
  MOCK_PAPERS.forEach(p => {
    if (!grouped[p.year]) grouped[p.year] = []
    grouped[p.year].push(p)
  })

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      <div>
        <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-purple-700 bg-purple-100 mb-2">📝 MOCK TESTS</div>
        <h1 className="font-serif-display text-3xl font-bold text-[#1A1A1A] mb-1">GATE CS Full-Length Mock Tests</h1>
        <p className="text-slate-500">Real GATE papers in exam mode — timed, with marking scheme and answer key.</p>
      </div>

      <div className="rounded-2xl p-4 flex flex-wrap gap-4 text-sm" style={{ background: 'linear-gradient(135deg, #1A1A1A 0%, #2A2A2A 100%)' }}>
        {[
          ['⏱', '3 Hours', 'Time limit'],
          ['📋', '65 Qs', 'Total questions'],
          ['💯', '100 Marks', 'Total marks'],
          ['➕', '+1/+2', 'Correct answer'],
          ['➖', '−1/3·−2/3', 'Wrong MCQ/MSQ'],
          ['✅', 'No −ve', 'NAT questions'],
        ].map(([icon, val, label]) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-lg">{icon}</span>
            <div>
              <div className="font-bold text-white text-sm">{val}</div>
              <div className="text-white/40 text-[10px]">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {history.length > 0 && (
        <Card className="p-6">
          <h3 className="font-serif-display text-xl font-bold text-[#1A1A1A] mb-4">🏆 Your Attempts History</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-[#FFE5D0] text-[#A47148] font-bold text-xs uppercase">
                  <th className="py-2.5">Date</th>
                  <th className="py-2.5">Test Paper</th>
                  <th className="py-2.5 text-center">Score</th>
                  <th className="py-2.5 text-center">Correct/Wrong</th>
                  <th className="py-2.5 text-center">Est. Rank</th>
                  <th className="py-2.5 text-center">GATE Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FFE5D0]">
                {history.map((record, i) => (
                  <tr key={i} className="text-[#2A2A2A]">
                    <td className="py-3 text-xs text-slate-400">{record.date}</td>
                    <td className="py-3 font-semibold">{record.title}</td>
                    <td className="py-3 text-center font-bold text-[#FF7A18]">{record.score}</td>
                    <td className="py-3 text-center text-xs">{record.correct}C / {record.wrong}W</td>
                    <td className="py-3 text-center font-bold text-[#1A1A1A]">#{record.rank}</td>
                    <td className="py-3 text-center font-semibold text-slate-600">{record.gateScore}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="space-y-8">
        {Object.keys(grouped).sort((a, b) => b - a).map(year => (
          <div key={year}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 rounded-full sunrise-gradient" />
              <div className="font-serif-display text-2xl font-bold text-[#1A1A1A]">GATE {year}</div>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped[year].map(paper => (
                <div key={paper.id} className="card-luxe rounded-2xl p-5 hover:translate-y-[-2px] transition-all duration-200 group">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md" style={{ background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)' }}>
                      <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-[#1A1A1A]">{paper.title}</div>
                      <div className="text-xs text-[#6B5E52] mt-0.5">65 Questions · 100 Marks · 180 min</div>
                    </div>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {paper.sections.map(s => (
                      <div key={s.name} className="flex items-center justify-between text-xs">
                        <span className="text-[#6B5E52]">{s.name}</span>
                        <span className="font-semibold text-[#1A1A1A]">{s.questions} Qs</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700">MCQ</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">MSQ</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">NAT</span>
                    {paper.keyUrl && <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">🔑 Key available</span>}
                  </div>
                  <button
                    onClick={() => setConfirmPaper(paper)}
                    className="w-full py-2.5 rounded-xl sunrise-gradient text-white font-bold text-sm hover:scale-[1.02] transition flex items-center justify-center gap-2"
                  >
                    <Play className="w-4 h-4" /> Start Mock Exam
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {confirmPaper && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="card-luxe rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="w-16 h-16 rounded-2xl sunrise-gradient flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <h2 className="font-serif-display text-2xl font-bold text-center text-[#1A1A1A] mb-1">{confirmPaper.title}</h2>
            <p className="text-center text-sm text-[#6B5E52] mb-6">You are about to start a timed exam session. The timer will begin immediately.</p>
            <div className="grid grid-cols-3 gap-3 mb-6">
              {[['⏱', `${confirmPaper.duration} mins`], ['📋', '65 Questions'], ['💯', `${confirmPaper.totalMarks} Marks`]].map(([icon, val]) => (
                <div key={val} className="text-center p-3 rounded-xl bg-[#FFF8EE] border border-[#FFE5D0]">
                  <div className="text-xl mb-1">{icon}</div>
                  <div className="text-xs font-bold text-[#1A1A1A]">{val}</div>
                </div>
              ))}
            </div>
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 mb-6">
              ⚠️ Once started, the {confirmPaper.duration}-minute timer cannot be paused. Negative marking applies to MCQ/MSQ.
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmPaper(null)} className="flex-1 py-3 rounded-xl border-2 border-[#FFE5D0] text-[#2A2A2A] font-semibold hover:bg-[#FFE5D0]/50 transition">
                Cancel
              </button>
              <button
                onClick={() => { onStartExam(confirmPaper); setConfirmPaper(null) }}
                className="flex-1 py-3 rounded-xl sunrise-gradient text-white font-bold flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4" /> Start Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function SettingsPage({ user, activeBranch, onSwitchBranch, onAddBranch, onLogout }) {
  // Sidebar active tab tracker
  const [activeTab, setActiveTab] = useState('profile')

  // Section references for smooth scrolling navigation
  const profileRef = useRef(null)
  const preferencesRef = useRef(null)
  const goalsRef = useRef(null)
  const summaryRef = useRef(null)
  const syncRef = useRef(null)
  const securityRef = useRef(null)
  const notificationsRef = useRef(null)
  const dangerRef = useRef(null)

  const handleTabClick = (tabKey, ref) => {
    setActiveTab(tabKey)
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // Profile data states
  const [profileName, setProfileName] = useState(user?.username || '')
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false)
  const [editName, setEditName] = useState(profileName)

  // Preferences states
  const [prefBranch, setPrefBranch] = useState('Computer Science')
  const [prefDifficulty, setPrefDifficulty] = useState('Advanced')
  const [prefReminder, setPrefReminder] = useState('07:00 AM')
  const [isManagePreferencesOpen, setIsManagePreferencesOpen] = useState(false)

  // Goals states
  const [goalRank, setGoalRank] = useState('AIR Under 100')
  const [goalStudyTime, setGoalStudyTime] = useState('8 hours')
  const [goalTopics, setGoalTopics] = useState('3 topics')
  const [goalDate, setGoalDate] = useState('Feb 6, 2027')
  const [isUpdateGoalsOpen, setIsUpdateGoalsOpen] = useState(false)

  // Security states
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [twoFactor, setTwoFactor] = useState(false)
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Notifications states
  const [remindersEnabled, setRemindersEnabled] = useState(true)
  const [summaryEnabled, setSummaryEnabled] = useState(true)
  const [weeklyEnabled, setWeeklyEnabled] = useState(false)
  const [updatesEnabled, setUpdatesEnabled] = useState(true)

  // Load from localStorage on client-side mount
  useEffect(() => {
    if (typeof window !== 'undefined' && user?.id) {
      setProfileName(user.username || '')
      setEditName(user.username || '')
      const storedBranch = localStorage.getItem(`gateflow_${user.id}_pref_branch`)
      setPrefBranch(storedBranch || 'Computer Science')
      
      const storedDiff = localStorage.getItem(`gateflow_${user.id}_pref_difficulty`)
      setPrefDifficulty(storedDiff || 'Advanced')
      
      const storedReminder = localStorage.getItem(`gateflow_${user.id}_pref_reminder`)
      setPrefReminder(storedReminder || '07:00 AM')
      
      const storedRank = localStorage.getItem(`gateflow_${user.id}_goal_rank`)
      setGoalRank(storedRank || 'AIR Under 100')
      
      const storedTime = localStorage.getItem(`gateflow_${user.id}_goal_time`)
      setGoalStudyTime(storedTime || '8 hours')
      
      const storedTopics = localStorage.getItem(`gateflow_${user.id}_goal_topics`)
      setGoalTopics(storedTopics || '3 topics')
      
      const storedDate = localStorage.getItem(`gateflow_${user.id}_goal_date`)
      setGoalDate(storedDate || 'Feb 6, 2027')
      
      const stored2fa = localStorage.getItem(`gateflow_${user.id}_2fa`)
      setTwoFactor(stored2fa === 'true')
      
      const storedRem = localStorage.getItem(`gateflow_${user.id}_notif_reminders`)
      setRemindersEnabled(storedRem !== 'false')
      
      const storedSum = localStorage.getItem(`gateflow_${user.id}_notif_summary`)
      setSummaryEnabled(storedSum !== 'false')
      
      const storedWk = localStorage.getItem(`gateflow_${user.id}_notif_weekly`)
      setWeeklyEnabled(storedWk === 'true')
      
      const storedUp = localStorage.getItem(`gateflow_${user.id}_notif_updates`)
      setUpdatesEnabled(storedUp !== 'false')
    }
  }, [user])

  // Dialog open triggers
  const [isBranchOpen, setIsBranchOpen] = useState(false)
  const [newBranch, setNewBranch] = useState('CS')
  const [newYear, setNewYear] = useState('2027')
  const avail = BRANCHES.filter((b) => !(user?.branches || []).find((ub) => ub.branchCode === b.code))

  const addBranch = async () => {
    await onAddBranch(newBranch, newYear)
    setIsBranchOpen(false)
    toast.success(`Added branch ${newBranch} targeting ${newYear}`)
  }

  // Profile Save
  const saveProfile = () => {
    setProfileName(editName)
    if (user) user.username = editName
    setIsEditProfileOpen(false)
    toast.success('Profile details updated!')
  }

  // Preferences Save
  const savePreferences = () => {
    localStorage.setItem(`gateflow_${user.id}_pref_branch`, prefBranch)
    localStorage.setItem(`gateflow_${user.id}_pref_difficulty`, prefDifficulty)
    localStorage.setItem(`gateflow_${user.id}_pref_reminder`, prefReminder)
    setIsManagePreferencesOpen(false)
    toast.success('Study preferences saved!')
  }

  // Goals Save
  const saveGoals = () => {
    localStorage.setItem(`gateflow_${user.id}_goal_rank`, goalRank)
    localStorage.setItem(`gateflow_${user.id}_goal_time`, goalStudyTime)
    localStorage.setItem(`gateflow_${user.id}_goal_topics`, goalTopics)
    localStorage.setItem(`gateflow_${user.id}_goal_date`, goalDate)
    setIsUpdateGoalsOpen(false)
    toast.success('Study goals updated successfully!')
  }

  // Defaults Reset
  const handleResetToDefault = () => {
    setPrefBranch('Computer Science')
    setPrefDifficulty('Advanced')
    setPrefReminder('07:00 AM')
    setGoalRank('AIR Under 100')
    setGoalStudyTime('8 hours')
    setGoalTopics('3 topics')
    setGoalDate('Feb 6, 2027')
    setRemindersEnabled(true)
    setSummaryEnabled(true)
    setWeeklyEnabled(false)
    setUpdatesEnabled(true)
    setTwoFactor(false)

    localStorage.removeItem(`gateflow_${user.id}_pref_branch`)
    localStorage.removeItem(`gateflow_${user.id}_pref_difficulty`)
    localStorage.removeItem(`gateflow_${user.id}_pref_reminder`)
    localStorage.removeItem(`gateflow_${user.id}_goal_rank`)
    localStorage.removeItem(`gateflow_${user.id}_goal_time`)
    localStorage.removeItem(`gateflow_${user.id}_goal_topics`)
    localStorage.removeItem(`gateflow_${user.id}_goal_date`)
    localStorage.setItem(`gateflow_${user.id}_notif_reminders`, 'true')
    localStorage.setItem(`gateflow_${user.id}_notif_summary`, 'true')
    localStorage.setItem(`gateflow_${user.id}_notif_weekly`, 'false')
    localStorage.setItem(`gateflow_${user.id}_notif_updates`, 'true')
    localStorage.setItem(`gateflow_${user.id}_2fa`, 'false')

    toast.success('Settings reset to defaults!')
  }

  // JSON Exporter
  const downloadUserData = () => {
    try {
      const data = {
        user,
        activeBranch,
        todaysPlan: JSON.parse(localStorage.getItem(`gateflow_${user.id}_todays_plan`) || '[]'),
        mockHistory: JSON.parse(localStorage.getItem(`gateflow_${user.id}_mock_history`) || '[]'),
        notesCount: localStorage.getItem(`gateflow_${user.id}_notes_opened_count`),
        ytCount: localStorage.getItem(`gateflow_${user.id}_yt_watched_count`),
        activityLog: JSON.parse(localStorage.getItem(`gateflow_${user.id}_activity_log`) || '[]')
      }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute("href", dataStr)
      downloadAnchor.setAttribute("download", `gateflow_backup_${user?.username || 'user'}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      toast.success('Exporting your progress data...')
    } catch {
      toast.error('Failed to export data')
    }
  }

  // Clear caches
  const clearCache = () => {
    if (confirm('Are you sure you want to clear your local cache? This will reset your active mock exams, plan status, and local statistics.')) {
      if (user?.id) {
        const prefix = `gateflow_${user.id}_`
        const keysToRemove = []
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          if (key && (key.startsWith(prefix) || key === 'gp_user_id')) {
            keysToRemove.push(key)
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k))
      } else {
        localStorage.clear()
      }
      window.location.reload()
    }
  }

  // Password Update
  const handlePasswordChange = () => {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setIsChangePasswordOpen(false)
    setOldPassword('')
    setNewPassword('')
    setConfirmPassword('')
    toast.success('Password updated successfully!')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">

        {/* Left Sidebar Navigation */}
        <aside className="md:col-span-3 sticky top-6 space-y-6">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
            <div className="w-full font-serif-display text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 pl-3.5">SETTINGS</div>
            <div className="flex flex-col gap-1">
              {[
                { key: 'profile', label: 'Profile & Account', icon: <Users className="w-4 h-4" />, ref: profileRef },
                { key: 'preferences', label: 'Study Preferences', icon: <BookOpen className="w-4 h-4" />, ref: preferencesRef },
                { key: 'goals', label: 'Study Goals', icon: <Target className="w-4 h-4" />, ref: goalsRef },
                { key: 'notifications', label: 'Notifications', icon: <Bell className="w-4 h-4" />, ref: notificationsRef },
                { key: 'sync', label: 'Data & Sync', icon: <Cloud className="w-4 h-4" />, ref: syncRef },
                { key: 'security', label: 'Security', icon: <Shield className="w-4 h-4" />, ref: securityRef },
                { key: 'danger', label: 'Danger Zone', icon: <Trash2 className="w-4 h-4" />, ref: dangerRef }
              ].map(item => (
                <button
                  key={item.key}
                  onClick={() => handleTabClick(item.key, item.ref)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-left transition-all border-l-2 ${activeTab === item.key ? 'text-[#FF7A18] bg-orange-50/50 border-[#FF7A18]' : 'text-slate-600 border-transparent hover:bg-slate-50'}`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>

            {/* Sidebar Security Shield Badge */}
            <div className="mt-8 p-4 rounded-2xl bg-[#FFFDF9] border border-[#FFE5D0] space-y-2">
              <div className="flex items-center gap-2 text-[#FF7A18]">
                <Shield className="w-4 h-4 text-[#FF7A18]" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A47148]">Your data is safe</span>
              </div>
              <p className="text-[10px] text-slate-500 leading-relaxed">
                We never share your personal information with anyone.
              </p>
            </div>
          </div>
        </aside>

        {/* Right Content Area */}
        <main className="md:col-span-9 space-y-6">

          {/* Header Card */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
            <div>
              <h1 className="font-serif-display text-2xl font-bold text-[#1A1A1A]">Settings</h1>
              <p className="text-xs text-slate-500 mt-1">Manage your account, preferences and study experience.</p>
            </div>
            <button
              onClick={handleResetToDefault}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 transition self-start sm:self-center border border-slate-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset to default
            </button>
          </div>

          {/* Profile & Account Card */}
          <Card ref={profileRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-6">
            <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
              <Users className="w-4 h-4 text-[#FF7A18]" />
              Profile &amp; Account
            </h2>
            <div className="flex flex-col sm:flex-row items-center justify-between gap-5">
              <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
                <div className="w-16 h-16 rounded-full bg-[#FFE5D0] border-2 border-white shadow flex items-center justify-center text-[#FF7A18] font-serif-display font-black text-2xl">
                  {profileName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#1A1A1A]">{profileName}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{user?.email || 'No email'}</p>
                  <p className="text-[10px] text-slate-400 mt-1">Member since Feb 6, 2024</p>
                </div>
              </div>

              <button
                onClick={() => { setEditName(profileName); setEditEmail(profileEmail); setIsEditProfileOpen(true) }}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit Profile
              </button>
            </div>

            {/* Edit Profile Dialog Modal */}
            <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Edit Profile Details</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3 text-xs">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Username</Label>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Email Address</Label>
                    <Input value={user?.email || ''} disabled className="h-10 bg-slate-50 text-slate-500 cursor-not-allowed" type="email" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveProfile} className="btn-sunrise w-full h-10 rounded-xl font-bold">Save Changes</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          {/* Preferences & Goals Double Columns */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Study Preferences Card */}
            <Card ref={preferencesRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-blue-500" />
                  Study Preferences
                </h2>

                <div className="divide-y divide-slate-100 text-xs mt-3">
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Primary Branch</span>
                    <span className="font-semibold text-slate-800">{prefBranch}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Target Exam</span>
                    <span className="font-semibold text-slate-800">GATE {activeBranch?.targetYear || 2027}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Difficulty Level</span>
                    <span className="font-semibold text-[#FF7A18] bg-orange-50 px-2 py-0.5 rounded-full text-[10px]">{prefDifficulty}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Daily Study Reminder</span>
                    <span className="font-semibold text-slate-800">{prefReminder}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsManagePreferencesOpen(true)}
                className="w-full py-2.5 rounded-xl border border-[#FF7A18] text-[#FF7A18] font-bold text-xs hover:bg-orange-50/30 transition text-center"
              >
                Manage Preferences
              </button>

              {/* Preferences Configuration Modal */}
              <Dialog open={isManagePreferencesOpen} onOpenChange={setIsManagePreferencesOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Configure Preferences</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-3 text-xs">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Primary Branch</Label>
                      <Select value={prefBranch} onValueChange={setPrefBranch}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Computer Science">Computer Science</SelectItem>
                          <SelectItem value="Data Science & AI">Data Science &amp; AI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Difficulty Level</Label>
                      <Select value={prefDifficulty} onValueChange={setPrefDifficulty}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beginner">Beginner</SelectItem>
                          <SelectItem value="Intermediate">Intermediate</SelectItem>
                          <SelectItem value="Advanced">Advanced</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Daily Study Reminder</Label>
                      <Select value={prefReminder} onValueChange={setPrefReminder}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="06:00 AM">06:00 AM</SelectItem>
                          <SelectItem value="07:00 AM">07:00 AM</SelectItem>
                          <SelectItem value="08:00 AM">08:00 AM</SelectItem>
                          <SelectItem value="09:00 AM">09:00 AM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={savePreferences} className="btn-sunrise w-full h-10 rounded-xl font-bold">Save Preferences</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>

            {/* Study Goals Card */}
            <Card ref={goalsRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#FF7A18]" />
                  Study Goals
                </h2>

                <div className="divide-y divide-slate-100 text-xs mt-3">
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Target Rank</span>
                    <span className="font-semibold text-slate-800">{goalRank}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Daily Study Time</span>
                    <span className="font-semibold text-slate-800">{goalStudyTime}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Topics Per Day</span>
                    <span className="font-semibold text-slate-800">{goalTopics}</span>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <span className="font-medium text-slate-500">Target Date</span>
                    <span className="font-semibold text-slate-800">{goalDate}</span>
                  </div>
                </div>

                {/* You're on track prompt */}
                <div className="p-3 bg-orange-50/60 rounded-2xl border border-orange-100/60 flex items-start gap-2.5 mt-4">
                  <TrendingUp className="w-4 h-4 text-[#FF7A18] shrink-0 mt-0.5" />
                  <div className="text-[10px] leading-relaxed text-[#A47148]">
                    <span className="font-bold">You&apos;re on track!</span> Keep going, consistency is the key.
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsUpdateGoalsOpen(true)}
                className="w-full py-2.5 rounded-xl bg-[#FF7A18] hover:bg-[#FF8B33] text-white font-bold text-xs shadow transition text-center"
              >
                Update Goals
              </button>

              {/* Study Goals Dialog Modal */}
              <Dialog open={isUpdateGoalsOpen} onOpenChange={setIsUpdateGoalsOpen}>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>Update Study Goals</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-3 text-xs">
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Target Rank</Label>
                      <Input value={goalRank} onChange={e => setGoalRank(e.target.value)} className="h-10" />
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Daily Study Time</Label>
                      <Select value={goalStudyTime} onValueChange={setGoalStudyTime}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="4 hours">4 hours</SelectItem>
                          <SelectItem value="6 hours">6 hours</SelectItem>
                          <SelectItem value="8 hours">8 hours</SelectItem>
                          <SelectItem value="10 hours">10 hours</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Topics Per Day</Label>
                      <Select value={goalTopics} onValueChange={setGoalTopics}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1 topic">1 topic</SelectItem>
                          <SelectItem value="2 topics">2 topics</SelectItem>
                          <SelectItem value="3 topics">3 topics</SelectItem>
                          <SelectItem value="4 topics">4 topics</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label className="font-bold text-slate-700">Target Date</Label>
                      <Input value={goalDate} onChange={e => setGoalDate(e.target.value)} className="h-10" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button onClick={saveGoals} className="btn-sunrise w-full h-10 rounded-xl font-bold">Update Goals</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </Card>
          </div>

          {/* Your Progress Summary (4 stat boxes horizontal grid) */}
          <Card ref={summaryRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Your Progress Summary
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-3">
              {[
                { label: 'Topics Total', val: 141, icon: <BookOpen className="w-4 h-4 text-green-600" />, bg: 'bg-green-50/50 border border-green-100/50' },
                { label: 'Topics Completed', val: (activeBranch?.completedTopics || []).length, icon: <Check className="w-4 h-4 text-blue-600" />, bg: 'bg-blue-50/50 border border-blue-100/50' },
                { label: 'Day Streak', val: activeBranch?.streak || 1, icon: <Flame className="w-4 h-4 text-purple-600" />, bg: 'bg-purple-50/50 border border-purple-100/50' },
                { label: "Today's Study", val: '2h 45m', icon: <Clock className="w-4 h-4 text-orange-600" />, bg: 'bg-orange-50/50 border border-orange-100/50' }
              ].map(stat => (
                <div key={stat.label} className={`p-4 rounded-2xl border ${stat.bg} text-center flex flex-col items-center justify-center space-y-2`}>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
                    {stat.icon}
                  </div>
                  <div className="text-2xl font-black text-[#1A1A1A] tracking-tight">{stat.val}</div>
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </div>
          </Card>

          {/* Sync & Notifications Double columns */}
          <div className="grid md:grid-cols-2 gap-6">

            {/* Data & Sync Card */}
            <Card ref={syncRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-4">
              <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Cloud className="w-4 h-4 text-sky-500" />
                Data &amp; Sync
              </h2>

              <div className="divide-y divide-slate-100 text-xs">
                <div className="flex items-center justify-between py-3">
                  <span className="font-medium text-slate-500">Sync Across Devices</span>
                  <span className="font-semibold text-green-600 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Enabled
                  </span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <span className="font-medium text-slate-500">Last Synced</span>
                  <span className="font-semibold text-slate-800">10 mins ago</span>
                </div>
                <div
                  onClick={downloadUserData}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-xl transition"
                >
                  <span className="font-semibold text-slate-700">Download My Data</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
                <div
                  onClick={clearCache}
                  className="flex items-center justify-between py-3 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-xl transition"
                >
                  <span className="font-semibold text-slate-700">Clear Cache</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </Card>

            {/* Notifications Card */}
            <Card ref={notificationsRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-4">
              <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
                <Bell className="w-4 h-4 text-yellow-500" />
                Notifications
              </h2>

              <div className="space-y-4 pt-1">
                {[
                  { label: 'Study Reminders', desc: 'Daily reminders to keep you consistent', state: remindersEnabled, set: setRemindersEnabled },
                  { label: 'Session Summary', desc: 'Receive summary after each study session', state: summaryEnabled, set: setSummaryEnabled },
                  { label: 'Weekly Progress', desc: 'Get your weekly progress report', state: weeklyEnabled, set: setWeeklyEnabled },
                  { label: 'Important Updates', desc: 'News and important announcements', state: updatesEnabled, set: setUpdatesEnabled }
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-[#2A2A2A]">{item.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.desc}</div>
                    </div>
                    <Switch
                      checked={item.state}
                      onCheckedChange={(val) => {
                        item.set(val)
                        localStorage.setItem(`gateflow_${user.id}_notif_${item.label.toLowerCase().split(' ')[0]}`, String(val))
                        toast.success(`${item.label} ${val ? 'enabled' : 'disabled'}`)
                      }}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Security Card */}
          <Card ref={securityRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-4">
            <h2 className="text-sm font-bold text-[#1A1A1A] border-b border-slate-100 pb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              Security
            </h2>

            <div className="divide-y divide-slate-100 text-xs">
              <div
                onClick={() => setIsChangePasswordOpen(true)}
                className="flex items-center justify-between py-3.5 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-xl transition"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">Change Password</span>
                  <span className="text-[10px] text-slate-400">Update your password regularly</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>

              <div
                onClick={() => {
                  const val = !twoFactor
                  setTwoFactor(val)
                  localStorage.setItem(`gateflow_${user.id}_2fa`, String(val))
                  toast.success(`Two-Factor Authentication turned ${val ? 'ON' : 'OFF'}`)
                }}
                className="flex items-center justify-between py-3.5 cursor-pointer hover:bg-slate-50 px-2 -mx-2 rounded-xl transition"
              >
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">Two-Factor Authentication</span>
                  <span className="text-[10px] text-slate-400">Add an extra layer of security</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-slate-400 text-xs">{twoFactor ? 'On' : 'Off'}</span>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>

              <div className="flex items-center justify-between py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="font-semibold text-slate-700">Active Sessions</span>
                  <span className="text-[10px] text-slate-400">Manage devices logged in</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </div>

            {/* Change Password Dialog Modal */}
            <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
              <DialogContent className="max-w-sm">
                <DialogHeader>
                  <DialogTitle>Change Password</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-3 text-xs">
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Current Password</Label>
                    <Input value={oldPassword} onChange={e => setOldPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">New Password</Label>
                    <Input value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10" />
                  </div>
                  <div className="space-y-1">
                    <Label className="font-bold text-slate-700">Confirm New Password</Label>
                    <Input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="••••••••" className="h-10" />
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handlePasswordChange} className="btn-sunrise w-full h-10 rounded-xl font-bold">Update Password</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>

          {/* Danger Zone / Account Actions Card */}
          <Card ref={dangerRef} className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white space-y-4">
            <h2 className="text-sm font-bold text-red-600 border-b border-slate-100 pb-3 flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-red-500" />
              Account Actions
            </h2>
            <p className="text-[11px] text-slate-400">These actions are sensitive and cannot be undone.</p>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <button
                onClick={downloadUserData}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-xs font-bold"
              >
                <Download className="w-4 h-4 text-slate-500" />
                Export My Data
              </button>

              <div className="flex items-center gap-3">
                {/* Branch selector or add branch preserves previous features */}
                {avail.length > 0 && (
                  <button
                    onClick={() => setIsBranchOpen(true)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-xs font-bold"
                  >
                    Add Branch
                  </button>
                )}

                <button
                  onClick={onLogout}
                  className="px-4 py-2.5 rounded-xl border border-red-200 hover:border-red-300 text-red-600 hover:bg-red-50/50 transition text-xs font-bold flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </div>

            {/* Add Branch popup */}
            <Dialog open={isBranchOpen} onOpenChange={setIsBranchOpen}>
              <DialogContent className="max-w-xs">
                <DialogHeader><DialogTitle>Add a branch</DialogTitle></DialogHeader>
                <div className="space-y-3 text-xs py-2">
                  <div>
                    <Label className="font-bold text-slate-700">Select Branch</Label>
                    <Select value={newBranch} onValueChange={setNewBranch}>
                      <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {avail.map((b) => <SelectItem key={b.code} value={b.code}>{b.code} — {b.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="font-bold text-slate-700">Exam Year</Label>
                    <Select value={newYear} onValueChange={setNewYear}>
                      <SelectTrigger className="h-10 mt-1"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="2026">GATE 2026</SelectItem>
                        <SelectItem value="2027">GATE 2027</SelectItem>
                        <SelectItem value="2028">GATE 2028</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={addBranch} className="btn-sunrise w-full h-10 rounded-xl font-bold">Add Branch</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </Card>
        </main>
      </div>
    </div>
  )
}

// =================== SYLLABUS PAGE ===================
const GATE_WEIGHTAGE = [
  { subject: 'General Aptitude', marks: '15', range: '15', diff: 'Easy' },
  { subject: 'Engineering Mathematics', marks: '13', range: '13', diff: 'Medium' },
  { subject: 'Programming & Data Structures', marks: '8–12', range: '8–12', diff: 'Medium' },
  { subject: 'Algorithms', marks: '6–10', range: '6–10', diff: 'Hard' },
  { subject: 'Operating Systems', marks: '7–10', range: '7–10', diff: 'Medium' },
  { subject: 'Computer Organization & Architecture', marks: '7–10', range: '7–10', diff: 'Medium' },
  { subject: 'Theory of Computation', marks: '6–8', range: '6–8', diff: 'Hard' },
  { subject: 'DBMS', marks: '6–8', range: '6–8', diff: 'Medium' },
  { subject: 'Computer Networks', marks: '6–8', range: '6–8', diff: 'Medium' },
  { subject: 'Compiler Design', marks: '4–6', range: '4–6', diff: 'Hard' },
  { subject: 'Digital Logic', marks: '3–5', range: '3–5', diff: 'Easy' },
]

const GATE_EXAM_PATTERN = [
  { label: 'Exam Name', value: 'GATE CSE Exam 2027' },
  { label: 'Exam Mode', value: 'Online – Computer Based Test (CBT)' },
  { label: 'Duration', value: '3 Hours (180 Minutes)' },
  { label: 'Nature of Questions', value: 'MCQ – Multiple Choice Questions | MSQ – Multiple Select Questions | NAT – Numerical Answer Type' },
  { label: 'Number of Questions', value: '65 Questions' },
  { label: 'Total Marks', value: '100 Marks' },
  { label: 'Marks Awarded', value: '1 or 2 marks per correct answer' },
  { label: 'Negative Marking', value: '1/3rd Mark for 1‑mark question; 2/3rd Mark for 2‑mark question (MCQ only)' },
  { label: 'Medium', value: 'English' },
]

const GATE_SYLLABUS = [
  {
    section: 'Section 1: Engineering Mathematics',
    color: '#FF7A18',
    topics: [
      { sub: 'Discrete Mathematics', detail: 'Propositional and first order logic. Sets, relations, functions, partial orders and lattices. Monoids, Groups. Graphs: connectivity, matching, colouring. Combinatorics: counting, recurrence relations, generating functions.' },
      { sub: 'Linear Algebra', detail: 'Matrices, determinants, system of linear equations, eigenvalues and eigenvectors, LU decomposition.' },
      { sub: 'Calculus', detail: 'Limits, continuity and differentiability, Maxima and minima, Mean value theorem, Integration.' },
      { sub: 'Probability and Statistics', detail: 'Random variables, Uniform, normal, exponential, Poisson and binomial distributions. Mean, median, mode and standard deviation. Conditional probability and Bayes theorem.' },
    ],
  },
  {
    section: 'Section 2: Digital Logic',
    color: '#FFB547',
    topics: [
      { sub: 'Digital Logic', detail: 'Boolean algebra. Combinational and sequential circuits. Minimization. Number representations and computer arithmetic (fixed and floating point).' },
    ],
  },
  {
    section: 'Section 3: Computer Organization and Architecture',
    color: '#A47148',
    topics: [
      { sub: 'COA', detail: 'Machine instructions and addressing modes. ALU, data-path and control unit. Instruction pipelining, pipeline hazards. Memory hierarchy: cache, main memory and secondary storage; I/O interface (interrupt and DMA mode).' },
    ],
  },
  {
    section: 'Section 4: Programming and Data Structures',
    color: '#FF7A18',
    topics: [
      { sub: 'Programming & DS', detail: 'Programming in C. Recursion. Arrays, stacks, queues, linked lists, trees, binary search trees, binary heaps, graphs.' },
    ],
  },
  {
    section: 'Section 5: Algorithms',
    color: '#FFB547',
    topics: [
      { sub: 'Algorithms', detail: 'Searching, sorting, hashing. Asymptotic worst case time and space complexity. Algorithm design techniques: greedy, dynamic programming and divide-and-conquer. Graph traversals, minimum spanning trees, shortest paths.' },
    ],
  },
  {
    section: 'Section 6: Theory of Computation',
    color: '#A47148',
    topics: [
      { sub: 'TOC', detail: 'Regular expressions and finite automata. Context-free grammars and push-down automata. Regular and context-free languages, pumping lemma. Turing machines and undecidability.' },
    ],
  },
  {
    section: 'Section 7: Compiler Design',
    color: '#FF7A18',
    topics: [
      { sub: 'Compiler Design', detail: 'Lexical analysis, parsing, syntax-directed translation. Runtime environments. Intermediate code generation. Local optimization, Data flow analyses: constant propagation, liveness analysis, common sub expression elimination.' },
    ],
  },
  {
    section: 'Section 8: Operating System',
    color: '#FFB547',
    topics: [
      { sub: 'OS', detail: 'System calls, processes, threads, inter-process communication, concurrency and synchronization. Deadlock. CPU and I/O scheduling. Memory management and virtual memory. File systems.' },
    ],
  },
  {
    section: 'Section 9: Databases',
    color: '#A47148',
    topics: [
      { sub: 'DBMS', detail: 'ER-model. Relational model: relational algebra, tuple calculus, SQL. Integrity constraints, normal forms. File organization, indexing (e.g., B and B+ trees). Transactions and concurrency control.' },
    ],
  },
  {
    section: 'Section 10: Computer Networks',
    color: '#FF7A18',
    topics: [
      { sub: 'CN', detail: 'Concept of layering: OSI and TCP/IP Protocol Stacks; Basics of packet, circuit and virtual circuit-switching; Data link layer: framing, error detection, Medium Access Control, Ethernet bridging; Routing protocols: shortest path, flooding, distance vector and link state routing; Fragmentation and IP addressing, IPv4, CIDR notation; Transport layer: flow control and congestion control, UDP, TCP, sockets; Application layer protocols: DNS, SMTP, HTTP, FTP, Email.' },
    ],
  },
  {
    section: 'General Aptitude',
    color: '#2BBF7E',
    topics: [
      { sub: 'Verbal Aptitude', detail: 'Basic English grammar: tenses, articles, adjectives, prepositions, conjunctions, verb-noun agreement. Basic vocabulary: words, idioms, and phrases in context. Reading and comprehension, Narrative sequencing.' },
      { sub: 'Quantitative Aptitude', detail: 'Data interpretation: data graphs (bar graphs, pie charts, 2- and 3-dimensional plots, maps, and tables). Numerical computation: ratios, percentages, powers, exponents and logarithms, permutations and combinations, and series. Mensuration and geometry. Elementary statistics and probability.' },
      { sub: 'Analytical Aptitude', detail: 'Logic: deduction and induction. Analogy. Numerical relations and reasoning.' },
      { sub: 'Spatial Aptitude', detail: 'Transformation of shapes: translation, rotation, scaling, mirroring, assembling, and grouping. Paper folding, cutting, and patterns in 2 and 3 dimensions.' },
    ],
  },
]

function SyllabusPage() {
  const [activeTab, setActiveTab] = useState('pattern')
  const diffColor = (d) => d === 'Easy' ? 'bg-green-100 text-green-700' : d === 'Hard' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'

  return (
    <div className="container mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="rounded-3xl p-8 md:p-10 relative overflow-hidden card-luxe">
        <div className="absolute -top-32 -right-32 w-[400px] h-[400px] rounded-full opacity-30" style={{ background: 'radial-gradient(circle, #FF7A18 0%, transparent 70%)' }} />
        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-4 bg-white/70 border border-[#FFE5D0] text-[#A47148]">
            <BookOpen className="w-3 h-3 text-[#FF7A18]" /> GATE CS Official Syllabus & Exam Pattern
          </div>
          <h1 className="font-serif-display text-4xl md:text-5xl font-bold text-[#1A1A1A] leading-tight">
            Gate<span className="sunrise-text">Flow</span> Syllabus
          </h1>
          <p className="mt-3 text-[#6B5E52] max-w-2xl">Official GATE CS syllabus, subject-wise expected weightage, and full exam pattern for GATE 2027. Plan smart — every mark counts.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 flex-wrap">
        {[
          { id: 'pattern', label: '📋 Exam Pattern' },
          { id: 'weightage', label: '📊 Subject Weightage' },
          { id: 'syllabus', label: '📚 Full Syllabus' },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${activeTab === id
                ? 'sunrise-gradient text-white shadow-md'
                : 'bg-white border border-[#FFE5D0] text-[#2A2A2A] hover:bg-[#FFF8EE]'
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── EXAM PATTERN ─── */}
      {activeTab === 'pattern' && (
        <div className="space-y-6">
          <div>
            <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📋 GATE CSE EXAM PATTERN 2027</div>
            <h2 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">GATE CSE Exam Pattern 2027 Highlights</h2>
            <p className="text-slate-500 mt-1">The exam is 3 hours long with 65 questions worth 100 marks. High-weightage subjects like Algorithms, Programming & Data Structures, and Operating Systems typically carry 10–15 marks each.</p>
          </div>
          <Card className="overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1A1A1A', color: 'white' }}>
                    <th className="p-4 text-left font-semibold w-2/5">Parameter</th>
                    <th className="p-4 text-left font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {GATE_EXAM_PATTERN.map((row, i) => (
                    <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-[#FFFDF8]' : 'bg-white'}`}>
                      <td className="p-4 font-semibold text-[#1A1A1A]">{row.label}</td>
                      <td className="p-4 text-[#2A2A2A]">{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Branch-wise marks split */}
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: 'General Aptitude', marks: 15, pct: 15, color: '#2BBF7E', desc: '10 questions — GA section is compulsory for all branches.' },
              { label: 'Engineering Mathematics', marks: 13, pct: 13, color: '#FFB547', desc: 'Around 10–13 marks — Linear Algebra, Calculus, Probability.' },
              { label: 'Core CS Subjects', marks: 72, pct: 72, color: '#FF7A18', desc: '~72 marks from 8 core CS subjects — DSA, OS, CN, DBMS, TOC, COA, CD, DL.' },
            ].map(({ label, marks, pct, color, desc }) => (
              <Card key={label} className="card-luxe p-5">
                <div className="text-xs font-bold tracking-widest mb-1" style={{ color }}>{label.toUpperCase()}</div>
                <div className="font-serif-display text-4xl font-bold text-[#1A1A1A] mb-1">{marks}<span className="text-base font-normal text-slate-500"> marks</span></div>
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden mb-3">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                </div>
                <p className="text-xs text-[#6B5E52]">{desc}</p>
              </Card>
            ))}
          </div>

          {/* Marking scheme note */}
          <Card className="p-5 border-l-4" style={{ borderColor: '#FF7A18' }}>
            <div className="font-bold text-[#1A1A1A] mb-1">⚠️ Negative Marking Rules</div>
            <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
              <li><strong>MCQ 1-mark:</strong> 1/3 mark deducted for wrong answer</li>
              <li><strong>MCQ 2-mark:</strong> 2/3 mark deducted for wrong answer</li>
              <li><strong>MSQ & NAT:</strong> No negative marking — attempt all!</li>
            </ul>
          </Card>
        </div>
      )}

      {/* ─── WEIGHTAGE ─── */}
      {activeTab === 'weightage' && (
        <div className="space-y-6">
          <div>
            <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-amber-700 bg-amber-100 mb-2">📊 15-YEAR ANALYSIS (2010–2024)</div>
            <h2 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">GATE CSE Subject-Wise Expected Weightage 2027</h2>
            <p className="text-slate-500 mt-1">The GATE CS exam consists of 65 questions with a maximum score of 100 — separated into General Aptitude, Engineering Mathematics, and core CS subjects. Data based on 15-year analysis.</p>
          </div>
          <Card className="overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: '#1A1A1A', color: 'white' }}>
                    <th className="p-4 text-left font-semibold w-8">#</th>
                    <th className="p-4 text-left font-semibold">Subject</th>
                    <th className="p-4 text-left font-semibold">Expected Marks (Approx.)</th>
                    <th className="p-4 text-left font-semibold">Weightage</th>
                    <th className="p-4 text-left font-semibold">Difficulty</th>
                  </tr>
                </thead>
                <tbody>
                  {GATE_WEIGHTAGE.map((row, i) => {
                    const maxMark = 15
                    const markNum = parseInt(row.marks)
                    const pct = Math.min(100, Math.round((markNum / maxMark) * 100))
                    return (
                      <tr key={i} className={`border-b last:border-0 ${i % 2 === 0 ? 'bg-[#FFFDF8]' : 'bg-white'}`}>
                        <td className="p-4 font-mono text-slate-400 text-xs">{String(i + 1).padStart(2, '0')}</td>
                        <td className="p-4 font-semibold text-[#1A1A1A]">{row.subject}</td>
                        <td className="p-4">
                          <span className="font-bold text-[#1A1A1A] text-lg">{row.marks}</span>
                          <span className="text-xs text-slate-400 ml-1">marks</span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded bg-slate-200 w-24 overflow-hidden">
                              <div className="h-full rounded" style={{ width: `${pct}%`, background: '#FF7A18' }} />
                            </div>
                            <span className="text-xs font-semibold text-[#1A1A1A]">{pct}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${diffColor(row.diff)}`}>{row.diff}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Visual bar chart summary */}
          <div>
            <h3 className="font-serif-display text-xl font-bold text-[#1A1A1A] mb-4">Visual Marks Distribution</h3>
            <div className="space-y-3">
              {GATE_WEIGHTAGE.map((row, i) => {
                const markNum = parseInt(row.marks)
                const pct = Math.min(100, Math.round((markNum / 15) * 100))
                return (
                  <div key={i} className="flex items-center gap-3">
                    <div className="text-xs text-[#6B5E52] w-52 shrink-0 text-right">{row.subject.split('(')[0].trim()}</div>
                    <div className="flex-1 h-5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full flex items-center px-2 text-[10px] text-white font-bold"
                        style={{ width: `${Math.max(pct, 8)}%`, background: 'linear-gradient(90deg, #FF7A18, #FFB547)' }}
                      >
                        {row.marks}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ─── FULL SYLLABUS ─── */}
      {activeTab === 'syllabus' && (
        <div className="space-y-6">
          <div>
            <div className="inline-block px-2 py-1 rounded text-[11px] font-bold text-slate-600 bg-slate-100 mb-2">📚 CS — Computer Science and Information Technology</div>
            <h2 className="font-serif-display text-3xl font-bold text-[#1A1A1A]">Official GATE CS Syllabus</h2>
            <p className="text-slate-500 mt-1">Section-wise official syllabus as per the latest GATE CS/IT notification. Each topic is directly examinable.</p>
          </div>

          <div className="space-y-4">
            {GATE_SYLLABUS.map((sec, si) => (
              <Card key={si} className="overflow-hidden shadow-sm">
                <div className="px-5 py-3 flex items-center gap-3" style={{ background: '#1A1A1A' }}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: sec.color }} />
                  <h3 className="font-bold text-white text-sm">{sec.section}</h3>
                </div>
                <div className="p-5 space-y-4">
                  {sec.topics.map((t, ti) => (
                    <div key={ti}>
                      {t.sub && sec.topics.length > 1 && (
                        <div className="font-semibold text-sm mb-1" style={{ color: sec.color }}>{t.sub}:</div>
                      )}
                      <p className="text-sm text-[#2A2A2A] leading-relaxed">{t.detail}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          {/* Download note */}
          <Card className="p-5 border-l-4" style={{ borderColor: '#FFB547' }}>
            <div className="font-bold text-[#1A1A1A] mb-1">💡 Study Tip</div>
            <p className="text-sm text-slate-600">Cross-reference this syllabus with the Weightage tab — prioritize Algorithms, DSA, OS, and DBMS first as they carry the most marks. Use the <strong>Tracker</strong> section to mark topics complete as you go.</p>
          </Card>
        </div>
      )}
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
  const [activeExam, setActiveExam] = useState(null) // LIFTED TEST MODE
  const isAdmin = false
  const activeBranch = useMemo(() => user?.branches?.find((b) => b.isActive) || user?.branches?.[0], [user])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.trackGateFlowAction = (type, label, url) => {
        try {
          const userId = localStorage.getItem('gp_user_id')
          if (!userId) return

          if (type === 'yt') {
            const count = parseInt(localStorage.getItem(`gateflow_${userId}_yt_watched_count`) || '0') + 1
            localStorage.setItem(`gateflow_${userId}_yt_watched_count`, String(count))
          } else if (type === 'note') {
            const count = parseInt(localStorage.getItem(`gateflow_${userId}_notes_opened_count`) || '0') + 1
            localStorage.setItem(`gateflow_${userId}_notes_opened_count`, String(count))
          }

          const logs = JSON.parse(localStorage.getItem(`gateflow_${userId}_activity_log`) || '[]')
          const newLog = {
            type,
            title: type === 'yt' ? `Watched: ${label.slice(0, 35)}...` : `Note Opened: ${label.slice(0, 35)}...`,
            meta: type === 'yt' ? 'YouTube' : 'Notes',
            time: new Date().toISOString(),
            url: url || '#'
          }
          logs.unshift(newLog)
          localStorage.setItem(`gateflow_${userId}_activity_log`, JSON.stringify(logs.slice(0, 40)))
        } catch (e) {
          console.error(e)
        }
      }
    }
  }, [])

  const refresh = async () => {
    if (!user) return
    const u = await api.me()
    if (u.user) setUser(u.user)
    if (activeBranch) {
      const snap = await api.snapshot(user.id, activeBranch.branchCode)
      setSnapshot(snap)
      const hm = await api.heatmap(user.id)
      setHeatmap(hm.heatmap || {})
    }
  }

  useEffect(() => {
    // Restore the session from the stored bearer token (identity is verified
    // server-side). If the token is missing/expired the API returns 401 and we
    // fall back to the auth screen.
    const token = typeof window !== 'undefined' ? localStorage.getItem('gp_token') : null
    if (token) {
      api.me().then((r) => {
        if (r.user) { setUser(r.user); localStorage.setItem('gp_user_id', r.user.id) }
        else { setToken(null); localStorage.removeItem('gp_user_id') }
        setLoaded(true)
      }).catch(() => setLoaded(true))
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
  const logout = () => { setToken(null); localStorage.removeItem('gp_user_id'); setUser(null) }

  const switchBranch = async (code) => { await api.switchBranch({ userId: user.id, branchCode: code }); await refresh() }
  const addBranch = async (code, year) => { await api.addBranch({ userId: user.id, branchCode: code, targetYear: year }); await refresh() }

  if (!loaded) return <div className="min-h-screen flex items-center justify-center text-slate-400">Loading…</div>
  if (!user) {
    return (
      <>
        <Toaster richColors />
        <AuthScreen onAuth={handleAuth} />
      </>
    )
  }

  // STRICT FULLSCREEN EXAM MODE — Render ONLY the exam player
  if (activeExam) {
    return (
      <>
        <Toaster richColors position="top-right" />
        <MockExamSession user={user} paper={activeExam} onEnd={() => setActiveExam(null)} />
      </>
    )
  }

  return (
    <div className="min-h-screen pb-bottom-nav">
      <Toaster richColors position="top-right" />
      <TopBar user={user} activeBranch={activeBranch} />
      <NavBar user={user} page={page} setPage={setPage} activeBranch={activeBranch} onSwitchBranch={switchBranch} onLogout={logout} onAddBranch={addBranch} />
      <AnnouncementBanner />
      <main className="fade-up">
        {page === 'Home' && <HomePage user={user} activeBranch={activeBranch} snapshot={snapshot} heatmap={heatmap} onRefresh={refresh} setPage={setPage} />}
        {page === 'Syllabus' && <SyllabusPage />}
        {page === 'Tracker' && <ProgressPage user={user} activeBranch={activeBranch} onRefresh={refresh} />}
        {page === 'Revision' && <RevisionPage user={user} activeBranch={activeBranch} onRefresh={refresh} />}
        {page === 'Dashboard' && <DashboardPage user={user} activeBranch={activeBranch} snapshot={snapshot} heatmap={heatmap} setPage={setPage} />}
        {page === 'Resources' && <ResourcesPage activeBranch={activeBranch} isAdmin={isAdmin} />}
        {page === 'PYQs' && <PYQsPage activeBranch={activeBranch} />}
        {page === 'Mock Tests' && <MockTestsPage user={user} activeBranch={activeBranch} onStartExam={setActiveExam} />}
        {page === 'Settings' && <SettingsPage user={user} activeBranch={activeBranch} onSwitchBranch={switchBranch} onAddBranch={addBranch} onLogout={logout} />}
      </main>

      <footer className="container mx-auto px-4 mt-16 mb-8">
        <div className="rounded-3xl p-6 md:p-8 bg-[#0F111E] text-white shadow-xl relative overflow-hidden border border-slate-800/80">

          {/* Custom high-fidelity mountain, trail and flag SVG overlay background */}
          <div className="absolute inset-0 z-0 pointer-events-none rounded-3xl overflow-hidden">
            {/* Ambient orange glow centered on the peak */}
            <div className="absolute w-48 h-48 rounded-full bg-[#FF7A18]/10 blur-3xl pointer-events-none" style={{ right: '20%', top: '-30px' }} />

            <svg className="absolute inset-y-0 right-0 h-full w-full opacity-80" viewBox="0 0 1000 200" fill="none" preserveAspectRatio="none">
              <defs>
                <linearGradient id="trailGrad" x1="0%" y1="100%" x2="0%" y2="0%">
                  <stop offset="0%" stopColor="#FF7A18" />
                  <stop offset="100%" stopColor="#FFC857" />
                </linearGradient>
                <linearGradient id="mtGrad1" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#1E2235" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#0F111E" stopOpacity="1" />
                </linearGradient>
                <linearGradient id="mtGrad2" x1="50%" y1="0%" x2="50%" y2="100%">
                  <stop offset="0%" stopColor="#252A42" stopOpacity="0.5" />
                  <stop offset="100%" stopColor="#0F111E" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Mountains */}
              {/* Back peak */}
              <path d="M520 200 L660 60 L800 200 Z" fill="url(#mtGrad1)" />
              {/* Foreground main peak */}
              <path d="M620 200 L760 28 L900 200 Z" fill="url(#mtGrad2)" stroke="#2D3452" strokeWidth="1" />
              {/* Right secondary peak */}
              <path d="M740 200 L870 70 L1000 200 Z" fill="url(#mtGrad1)" />

              {/* Gold winding path to the summit */}
              <path
                d="M745 195 C755 170 790 155 770 120 C750 85 780 70 762 28"
                stroke="url(#trailGrad)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Flagpole and Summit Flag */}
              <line x1="762" y1="28" x2="762" y2="10" stroke="#FF7A18" strokeWidth="1.5" />
              <path d="M762 10 L776 14.5 L762 19 Z" fill="#FF7A18" />
              <circle cx="762" cy="10" r="1.5" fill="#FFC857" />
            </svg>
          </div>

          {/* Foreground content layers */}
          <div className="relative z-10 grid md:grid-cols-3 gap-8 items-center pb-6 border-b border-slate-800/80">

            {/* Left Column: Brand & Description */}
            <div className="space-y-3.5 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start gap-2.5">
                <div className="w-9 h-9 rounded-full overflow-hidden border border-orange-500 bg-slate-950">
                  <img src="/gateflow-logo.png" alt="GateFlow" className="w-full h-full object-cover" />
                </div>
                <span className="font-serif-display text-lg font-bold text-white">Gate<span className="text-[#FF7A18]">Flow</span></span>
              </div>
              <div className="text-sm font-medium text-slate-300">
                Less distraction. <span className="text-[#FF7A18]">More preparation.</span>
              </div>
              <div className="text-xs text-slate-400">
                Made for <span className="text-[#FF7A18] font-bold">GATE CS</span> aspirants. Built for your success.
              </div>
            </div>

            {/* Center Column: Slogan Badge */}
            <div className="flex items-center justify-center gap-4 text-center md:text-left">
              <div className="w-12 h-12 rounded-full border border-orange-500/20 bg-slate-900/60 flex items-center justify-center text-[#FF7A18] shrink-0 shadow-inner">
                <Star className="w-5 h-5 fill-[#FF7A18]/10" />
              </div>
              <div className="text-sm">
                <div className="text-slate-300 font-medium">Small steps today.</div>
                <div className="text-[#FF7A18] font-black tracking-wide mt-0.5">
                  Extraordinary <span className="text-white font-black">rank tomorrow.</span>
                </div>
              </div>
            </div>

            {/* Right Column: Social Links */}
            <div className="flex flex-col items-center md:items-end gap-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-300">Stay connected</div>
              <div className="flex gap-3">
                <a
                  href="https://www.instagram.com/gateflow_official"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-[#FF7A18] hover:text-[#FF7A18] transition flex items-center justify-center text-slate-300 shadow-md group"
                  title="Follow on Instagram"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 group-hover:scale-110 transition" stroke="currentColor" strokeWidth="2">
                    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
                    <circle cx="12" cy="12" r="4" />
                    <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
                  </svg>
                </a>
                <a
                  href="https://youtube.com/@gateflow-i5g?si=8yU31PzpH1BomV12"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-full border border-slate-700 bg-slate-800/60 hover:bg-slate-800 hover:border-[#FF7A18] hover:text-[#FF7A18] transition flex items-center justify-center text-slate-300 shadow-md group"
                  title="Subscribe on YouTube"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 group-hover:scale-110 transition">
                    <path d="M23.495 6.205a3.007 3.007 0 0 0-2.088-2.088c-1.87-.501-9.396-.501-9.396-.501s-7.507-.01-9.396.501A3.007 3.007 0 0 0 .527 6.205a31.247 31.247 0 0 0-.522 5.805 31.247 31.247 0 0 0 .522 5.783 3.007 3.007 0 0 0 2.088 2.088c1.868.502 9.396.502 9.396.502s7.506 0 9.396-.502a3.007 3.007 0 0 0 2.088-2.088 31.247 31.247 0 0 0 .5-5.783 31.247 31.247 0 0 0-.5-5.805zM9.609 15.601V8.408l6.264 3.602z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          {/* Attribution bottom bar */}
          <div className="pt-4 text-center text-xs text-slate-400 font-medium tracking-wide">
            © {new Date().getFullYear()} GateFlow  •  Your Journey. Your Rank. <span className="text-[#FF7A18] font-bold">Your Glory.</span>
          </div>
        </div>
      </footer>
      <BottomNav page={page} setPage={setPage} />
    </div>
  )
}

export default App
