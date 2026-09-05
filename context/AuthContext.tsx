'use client'

import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react'
import type { AuthSession, Tenant, UserRole } from '@/types/database'
import { createClient } from '@/utils/supabase/client'

interface AuthContextType {
  session: AuthSession | null
  loading: boolean
  currentTenant: Tenant | null
  tenants: Tenant[]
  userRole: UserRole | null
  switchTenant: (tenantId: string) => void
  refetchSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const fetchInProgressRef = useRef(false)

  const fetchSession = async () => {
    if (fetchInProgressRef.current) return
    fetchInProgressRef.current = true

    try {
      const { getCurrentSessionClient, getUserTenants } = await import('@/lib/auth')
      const sess = await getCurrentSessionClient()
      setSession(sess)

      if (sess && sess.user && sess.user.id) {
        const userTenants = await getUserTenants(sess.user.id)
        setTenants(userTenants)
      }
    } catch (error) {
      console.error('Failed to fetch session:', error)
    } finally {
      setLoading(false)
      fetchInProgressRef.current = false
    }
  }

  useEffect(() => {
    fetchSession()

    const supabase = createClient()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: string) => {
      if (event === 'INITIAL_SESSION') return
      await fetchSession().catch((error) => {
        console.error('Auth state sync failed:', error)
      })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const switchTenant = (tenantId: string) => {
    const tenant = tenants.find((t) => t.id === tenantId)
    if (tenant && session) {
      setSession({
        ...session,
        tenant,
        role: session.role, // This should be fetched fresh in production
      })
    }
  }

  const value: AuthContextType = {
    session,
    loading,
    currentTenant: session?.tenant || null,
    tenants,
    userRole: session?.role || null,
    switchTenant,
    refetchSession: fetchSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuthContext must be used within AuthProvider')
  }
  return context
}
