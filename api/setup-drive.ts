import type { VercelRequest, VercelResponse } from "@vercel/node"

const REDIRECT_URI = "https://budget-mobile-rosy.vercel.app/api/setup-drive-callback"

export default function handler(_req: VercelRequest, res: VercelResponse) {
  const raw = process.env.GOOGLE_CLIENT_ID ?? ""
  const CLIENT_ID = raw.charCodeAt(0) === 0xFEFF ? raw.slice(1).trim() : raw.trim()
  if (!CLIENT_ID) return res.status(500).send("Missing GOOGLE_CLIENT_ID env var")
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth")
  url.searchParams.set("client_id", CLIENT_ID)
  url.searchParams.set("redirect_uri", REDIRECT_URI)
  url.searchParams.set("response_type", "code")
  url.searchParams.set("scope", "https://www.googleapis.com/auth/drive.file")
  url.searchParams.set("access_type", "offline")
  url.searchParams.set("prompt", "consent")
  res.redirect(url.toString())
}
