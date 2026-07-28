import type { VercelRequest, VercelResponse } from "@vercel/node"

const REDIRECT_URI = "https://budget-mobile-rosy.vercel.app/api/setup-drive-callback"

function stripBom(s: string): string {
  return s.charCodeAt(0) === 0xFEFF ? s.slice(1).trim() : s.trim()
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const CLIENT_ID = stripBom(process.env.GOOGLE_CLIENT_ID ?? "")
  const CLIENT_SECRET = stripBom(process.env.GOOGLE_CLIENT_SECRET ?? "")
  if (!CLIENT_ID || !CLIENT_SECRET) return res.status(500).send("Missing credentials env vars")
  const code = req.query.code as string
  if (!code) return res.status(400).send("Missing code")

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }).toString(),
  })

  const tokens = await tokenRes.json() as any
  if (!tokenRes.ok) return res.status(500).json(tokens)

  const refreshToken = tokens.refresh_token
  if (!refreshToken) {
    return res.status(200).send(`<h2>No refresh token received</h2><pre>${JSON.stringify(tokens, null, 2)}</pre>`)
  }

  return res.status(200).send(`<h2>Success!</h2><p>Copy this refresh token and send it to Claude:</p><textarea rows="4" cols="80" onclick="this.select()">${refreshToken}</textarea>`)
}
