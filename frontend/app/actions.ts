"use server"

import { signIn, signOut } from "@/auth"
import { redirect } from "next/navigation"

export async function handleGoogleSignIn() {
  await signIn("google", { redirectTo: "/map" })
}

export async function handleSignOut() {
  // Clear the NextAuth session
  await signOut({ redirect: false })
  
  // Redirect to home page
  redirect("/")
}
 