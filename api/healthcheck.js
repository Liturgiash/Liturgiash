import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY
)

export default async function handler(req, res) {
  try {
    await supabase.from('profiles').select('id').limit(1)
    res.status(200).json({ ok: true, timestamp: new Date().toISOString() })
  } catch (error) {
    res.status(500).json({ ok: false, error: error.message })
  }
}
