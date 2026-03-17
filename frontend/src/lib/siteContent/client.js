import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { rowToSiteContent, siteContentToRow } from './mapping'

const TABLE = 'site_content'
const GLOBAL_ID = 'global'

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // no-op; just confirming subscription
        }
      })

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [])

  return { data, isLoading, error }
}

export async function upsertSiteContent(content) {
  const row = siteContentToRow(content)

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(
      {
        id: GLOBAL_ID,
        ...row,
      },
      { onConflict: 'id' },
    )
    .select('*')
    .single()

  if (error) {
    throw error
  }

  return rowToSiteContent(data)
}

