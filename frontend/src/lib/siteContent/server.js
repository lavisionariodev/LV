import { createClient } from '@/lib/supabase/server'
import { rowToSiteContent } from './mapping'

const TABLE = 'site_content'
const GLOBAL_ID = 'global'

export async function getSiteContent() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', GLOBAL_ID)
    .maybeSingle()

  if (error) {
    console.error('Failed to load site_content from Supabase:', error.message)
  }

  return rowToSiteContent(data || null)
}

