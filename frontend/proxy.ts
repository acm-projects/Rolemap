import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  // Allow public access to landing page
  if (req.nextUrl.pathname === "/") {
    return NextResponse.next()
  }

  // Allow all auth routes
  if (req.nextUrl.pathname.startsWith("/api/auth")) {
    return NextResponse.next()
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/((?!_next/static|_next/image|public).*)"],
}
