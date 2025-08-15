import { auth } from "@/auth"

export default async function Home() {
  const session = await auth()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {session ? (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h2 className="text-2xl font-semibold text-green-800 mb-4">
              ログイン済み
            </h2>
            <div className="space-y-2">
              <p className="text-green-700">
                <strong>ユーザー名:</strong> {session.user?.name}
              </p>
              <p className="text-green-700">
                <strong>ユーザーID:</strong> {session.user?.id}
              </p>
              {session.user?.token && (
                <div className="mt-4">
                  <p className="text-green-700 font-semibold">JWTトークン:</p>
                  <p className="text-xs text-green-600 bg-green-100 p-2 rounded mt-1 break-all">
                    {session.user.token}
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
            <h2 className="text-2xl font-semibold text-blue-800 mb-4">
              未ログイン
            </h2>
            <a
              href="/login"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-md font-medium"
            >
              ログインページ
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
