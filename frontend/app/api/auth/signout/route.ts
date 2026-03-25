import { signOut } from "@/auth"
import { NextResponse } from "next/server"

export async function POST() {
  // Clear the NextAuth session
  await signOut({ redirect: false })

  // Create a response that redirects to home first
  const homeUrl = process.env.NEXTAUTH_URL || "http://localhost:3000"
  const response = NextResponse.redirect(new URL("/", homeUrl), {
    status: 302,
  })

  // Clear all NextAuth related cookies to ensure full session cleanup
  response.cookies.delete("__Secure-next-auth.session-token")
  response.cookies.delete("next-auth.session-token")
  response.cookies.delete("__Secure-next-auth.callback-url")
  response.cookies.delete("next-auth.callback-url")
  response.cookies.delete("__Secure-next-auth.csrf-token")
  response.cookies.delete("next-auth.csrf-token")

  // Set Cache-Control headers to prevent session caching
  response.headers.set("Cache-Control", "no-cache, no-store, max-age=0, must-revalidate")
  response.headers.set("Pragma", "no-cache")
  response.headers.set("Expires", "0")

  return response
}

