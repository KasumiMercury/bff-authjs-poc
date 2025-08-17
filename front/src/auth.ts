import NextAuth, { type DefaultSession } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { JWT } from "next-auth/jwt"

// デバッグ用: 環境変数の確認
console.log("NextAuth Environment Variables:", {
  AUTH_GOOGLE_ID: process.env.AUTH_GOOGLE_ID ? "present" : "missing",
  AUTH_GOOGLE_SECRET: process.env.AUTH_GOOGLE_SECRET ? "present" : "missing",
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  EXTERNAL_API_BASE_URL: process.env.EXTERNAL_API_BASE_URL,
  NODE_ENV: process.env.NODE_ENV,
})

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
    Google({
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          scope: "openid email profile",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === "google") {
        try {
          console.log("Google OAuth signIn callback:", { user, account, profile })
          
          const requestBody: any = {
            email: user.email,
            name: user.name,
            provider: "google",
          }
          
          if (account.access_token) {
            requestBody.access_token = account.access_token
          }
          if (account.refresh_token) {
            requestBody.refresh_token = account.refresh_token
          }
          if (account.expires_at) {
            requestBody.expires_at = account.expires_at
          }
          
          console.log("Sending to IdP server:", {
            ...requestBody,
            access_token: requestBody.access_token ? `${requestBody.access_token.substring(0, 20)}...` : undefined,
            refresh_token: requestBody.refresh_token ? `${requestBody.refresh_token.substring(0, 20)}...` : undefined,
          })
          
          const response = await fetch(`${process.env.EXTERNAL_API_BASE_URL}/oauth-login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(requestBody),
          })

          if (response.ok) {
            const data = await response.json()
            console.log("IdP server response:", data)
            user.token = data.token
            return true
          } else {
            console.error("Failed to authenticate with IdP server:", response.status)
            return false
          }
        } catch (error) {
          console.error("OAuth authentication error:", error)
          return false
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user) {
        if (account?.provider === "google") {
          token.id = user.email as string
          token.token = user.token
        } else {
          // Credentials認証の場合（既存の処理）
          token.id = user.id
          token.token = user.token
        }
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
    async redirect({ url, baseUrl }) {
      console.log("NextAuth redirect callback:", {
        url,
        baseUrl,
        redirectUrl: url.startsWith(baseUrl) ? url : baseUrl,
      })
      return url.startsWith(baseUrl) ? url : baseUrl
    },
  },
  session: {
    strategy: "jwt",
  },
  debug: process.env.NODE_ENV === "development",
  logger: {
    error(error) {
      console.error("NextAuth Error:", error)
    },
    warn(code) {
      console.warn("NextAuth Warning:", code)
    },
    debug(code, metadata) {
      console.log("NextAuth Debug:", code, metadata)
    },
  },
  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log("NextAuth signIn event:", {
        user: user?.email,
        account: account?.provider,
        profile: profile?.email,
        isNewUser,
      })
      if (account?.provider === "google") {
        console.log("Google OAuth Details:", {
          provider: account.provider,
          type: account.type,
          access_token: account.access_token ? "present" : "missing",
          id_token: account.id_token ? "present" : "missing",
        })
      }
    },
  },
})