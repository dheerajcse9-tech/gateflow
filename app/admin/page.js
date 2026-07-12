'use client'
import { AdminDashboard } from '@/components/AdminCMS'

// Reachable admin console. Access is gated by admin login (Bearer token) —
// the page itself renders the login form until authenticated.
export default function AdminPage() {
  return <AdminDashboard />
}
