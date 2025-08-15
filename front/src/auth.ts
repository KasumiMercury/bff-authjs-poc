import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { JWT } from "next-auth/jwt"

declare module "next-auth" {
  interface Session {
    user: {
      id?: string
      token?: string
    } & DefaultSession["user"]
  }
  
  interface User {
    token?: string
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    token?: string
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      id: "credentials",
      name: "Password Login",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null
        }

        try {
          const response = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              username: credentials.username,
              password: credentials.password,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          
          if (data.token) {
            return {
              id: credentials.username as string,
              name: credentials.username as string,
              token: data.token,
            }
          }

          return null
        } catch (error) {
          console.error("Authentication error:", error)
          return null
        }
      },
    }),
    Credentials({
      id: "otp",
      name: "OTP Login",
      credentials: {
        email: { label: "Email", type: "email" },
        otp: { label: "OTP", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.otp) {
          return null
        }

        try {
          const response = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/verify-otp`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              email: credentials.email,
              otp: credentials.otp,
            }),
          })

          if (!response.ok) {
            return null
          }

          const data = await response.json()
          
          if (data.token) {
            return {
              id: credentials.email as string,
              name: credentials.email as string,
              email: credentials.email as string,
              token: data.token,
            }
          }

          return null
        } catch (error) {
          console.error("OTP authentication error:", error)
          return null
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.token = user.token
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        if (token.id) session.user.id = token.id
        if (token.token) session.user.token = token.token
      }
      return session
    },
  },
  session: {
    strategy: "jwt",
  },
})