import NextAuth from "next-auth"
import Google from "next-auth/providers/google"

console.log("AUTH_SECRET loaded:", !!process.env.AUTH_SECRET)

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Google({
      allowDangerousEmailAccountLinking: true,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/",
    error: "/",
    signOut: "/",
  },
  callbacks: {
    redirect: async ({ url, baseUrl }) => {
      // After successful Google OAuth, redirect to /map
      // Otherwise, allow redirects to the base URL or specified redirectTo
      if (url.startsWith(baseUrl)) return url
      else if (url.startsWith("/")) return new URL(url, baseUrl).toString()
      return baseUrl
    },
  },
  events: {
    async signOut() {
      // This event fires when the user signs out
      // NextAuth clears the JWT token automatically
    },
  },
  //secret: process.env.NEXTAUTH_SECRET, 
  secret: process.env.AUTH_SECRET,
  trustHost: true,
})
 