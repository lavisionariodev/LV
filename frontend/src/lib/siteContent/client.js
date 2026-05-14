import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { rowToSiteContent } from './mapping'

const TABLE = 'site_content'
const GLOBAL_ID = 'global'

export function useAdminSiteContent() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      try {
        const res = await fetch('/api/admin/site-content', { cache: 'no-store' })
        const body = await res.json().catch(() => null)

        if (!isMounted) return

        if (!res.ok) {
          const message = body?.error || 'Failed to load site content.'
          setError(new Error(message))
          setData(null)
          setIsLoading(false)
          return
        }

        setData(body?.data ?? null)
        setError(null)
      } catch (err) {
        if (!isMounted) return
        console.error('Failed to load site content from admin API:', err)
        setError(err instanceof Error ? err : new Error('Failed to load site content.'))
        setData(null)
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  return { data, isLoading, error }
}

export function useSiteContent() {
  const [data, setData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      setIsLoading(true)
      setError(null)

      const { data: row, error } = await supabase
        .from(TABLE)
        .select('*')
        .eq('id', GLOBAL_ID)
        .maybeSingle()

      if (!isMounted) return

      if (error) {
        console.error('Failed to load site_content from Supabase:', error.message)
        setError(error)
      }

      setData(rowToSiteContent(row || null))
      setIsLoading(false)
    }

    load()

    const channel = supabase
      .channel('site-content-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: TABLE,
          filter: `id=eq.${GLOBAL_ID}`,
        },
        (payload) => {
          const nextRow =
            payload.new ||
            payload.old ||
            null
          setData(rowToSiteContent(nextRow))
        },
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { data, isLoading, error }
}

export async function upsertSiteContent(content) {
  const res = await fetch('/api/admin/site-content', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content,
    }),
  })

  const body = await res.json().catch(() => null)

  if (!res.ok) {
    const msg = body?.error || 'Failed to save site content.'
    throw new Error(msg)
  }

  return body?.data
}

