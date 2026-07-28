import type { VercelRequest, VercelResponse } from '@vercel/node'

const REDIRECT_URI = 'https://budget-mobile-rosy.vercel.app/api/setup-drive-callback'

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
  if (!CLIENT_ID) return res.status(500).send('Missing GOOGLE_CLIENT_ID env var')
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'https://www.googleapis.com/auth/drive.file')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  res.redirect(url.toString())
}
