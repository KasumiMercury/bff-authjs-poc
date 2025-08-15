"use client"

import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { atom, useAtom } from "jotai"

const activeTabAtom = atom<"password" | "otp">("password")
const otpStepAtom = atom<"email" | "verify">("email")
const emailAtom = atom("")
const loadingAtom = atom(false)
const messageAtom = atom("")

export default function Login() {
  const [activeTab, setActiveTab] = useAtom(activeTabAtom)
  const [otpStep, setOtpStep] = useAtom(otpStepAtom)
  const [email, setEmail] = useAtom(emailAtom)
  const [loading, setLoading] = useAtom(loadingAtom)
  const [message, setMessage] = useAtom(messageAtom)
  const router = useRouter()

  async function handlePasswordLogin(formData: FormData) {
    const username = formData.get("username") as string
    const password = formData.get("password") as string

    if (!username || !password) {
      return
    }

    try {
      setLoading(true)
      const result = await signIn("credentials", {
        username,
        password,
        redirect: false,
      })

      if (result?.ok) {
        router.push("/")
      } else {
        setMessage("ログインに失敗しました")
      }
    } catch (error) {
      console.error("Login error:", error)
      setMessage("ログインエラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  async function handleSendOTP(formData: FormData) {
    const emailValue = formData.get("email") as string

    if (!emailValue) {
      return
    }

    try {
      setLoading(true)
      setMessage("")
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: emailValue,
        }),
      })

      if (response.ok) {
        setEmail(emailValue)
        setOtpStep("verify")
        setMessage("OTPをサーバーログで確認してください")
      } else {
        setMessage("OTP送信に失敗しました")
      }
    } catch (error) {
      console.error("OTP send error:", error)
      setMessage("OTP送信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  async function handleVerifyOTP(formData: FormData) {
    const otpValue = formData.get("otp") as string

    if (!otpValue || !email) {
      return
    }

    try {
      setLoading(true)
      const result = await signIn("otp", {
        email,
        otp: otpValue,
        redirect: false,
      })

      if (result?.ok) {
        router.push("/")
      } else {
        setMessage("OTP認証に失敗しました")
      }
    } catch (error) {
      console.error("OTP verify error:", error)
      setMessage("OTP認証エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            ログイン
          </h2>
        </div>

        {/* タブコントロール */}
        <div className="flex border-b">
          <button
            type="button"
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === "password"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveTab("password")
              setMessage("")
            }}
          >
            パスワードログイン
          </button>
          <button
            type="button"
            className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${
              activeTab === "otp"
                ? "border-indigo-500 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => {
              setActiveTab("otp")
              setOtpStep("email")
              setMessage("")
            }}
          >
            OTPログイン
          </button>
        </div>

        {/* メッセージ表示 */}
        {message && (
          <div className={`text-sm text-center ${message.includes("失敗") || message.includes("エラー") ? "text-red-600" : "text-green-600"}`}>
            {message}
          </div>
        )}

        {/* パスワードログインフォーム */}
        {activeTab === "password" && (
          <form className="mt-8 space-y-6" action={handlePasswordLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="username" className="sr-only">
                  ユーザー名
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="ユーザー名"
                />
              </div>
              <div>
                <label htmlFor="password" className="sr-only">
                  パスワード
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="パスワード"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
              >
                {loading ? "ログイン中..." : "ログイン"}
              </button>
            </div>
          </form>
        )}

        {/* OTPログインフォーム */}
        {activeTab === "otp" && (
          <div className="mt-8 space-y-6">
            {otpStep === "email" ? (
              <form action={handleSendOTP} className="space-y-6">
                <div>
                  <label htmlFor="email" className="sr-only">
                    メールアドレス
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="メールアドレス"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? "送信中..." : "OTP送信"}
                  </button>
                </div>
              </form>
            ) : (
              <form action={handleVerifyOTP} className="space-y-6">
                <div>
                  <label htmlFor="email-display" className="block text-sm font-medium text-gray-700">
                    メールアドレス
                  </label>
                  <input
                    id="email-display"
                    type="email"
                    value={email}
                    disabled
                    className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-500 bg-gray-100 sm:text-sm"
                  />
                </div>

                <div>
                  <label htmlFor="otp" className="sr-only">
                    OTPコード
                  </label>
                  <input
                    id="otp"
                    name="otp"
                    type="text"
                    required
                    maxLength={6}
                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                    placeholder="6桁のOTPコード"
                  />
                </div>

                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep("email")
                      setMessage("")
                    }}
                    className="flex-1 py-2 px-4 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    戻る
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                  >
                    {loading ? "認証中..." : "ログイン"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  )
}