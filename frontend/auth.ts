import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github";

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
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      allowDangerousEmailAccountLinking: true,
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
    async jwt({ token, account, profile }) {
      if (account) {
        token.provider = account.provider;
        if (account.provider === "github" && profile) {
          token.githubUsername = (profile as { login?: string }).login ?? null;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as Record<string, unknown>).provider = token.provider;
        (session.user as Record<string, unknown>).githubUsername = token.githubUsername ?? null;
      }
      return session;
    },
    redirect: async ({ url, baseUrl }) => {
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/")) return new URL(url, baseUrl).toString();
      return new URL("/OnBoarding/Major", baseUrl).toString();
    },
  },
  events: {
    async signOut() {},
  },
  //secret: process.env.NEXTAUTH_SECRET, 
  secret: process.env.AUTH_SECRET,
  trustHost: true,
})
 