import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { createSession, destroySession, getSessionUser, verifyPassword } from "@/lib/auth"

export const dynamic = "force-dynamic"

export async function GET() {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ user: null })
  return NextResponse.json({ user })
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const password = typeof body?.password === "string" ? body.password : ""
  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  const res = await db().query(
    `SELECT id, name, email, role, password_hash FROM users WHERE email = $1`,
    [email],
  )
  const row = res.rows[0]
  // No-enumeration: identical response whether the email exists or not.
  if (!row || !verifyPassword(password, row.password_hash)) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 })
  }

  await createSession(row.id)
  return NextResponse.json({
    user: { id: row.id, name: row.name, email: row.email, role: row.role },
  })
}

export async function DELETE() {
  await destroySession()
  return NextResponse.json({ ok: true })
}
