"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { atom, useAtom } from "jotai";
import { useId } from "react";

const activeTabAtom = atom<"password" | "otp" | "google">("password");
const otpStepAtom = atom<"email" | "verify">("email");
const emailAtom = atom("");
const loadingAtom = atom(false);
const messageAtom = atom("");

export default function Login() {
	const [activeTab, setActiveTab] = useAtom(activeTabAtom);
	const [otpStep, setOtpStep] = useAtom(otpStepAtom);
	const [email, setEmail] = useAtom(emailAtom);
	const [loading, setLoading] = useAtom(loadingAtom);
	const [message, setMessage] = useAtom(messageAtom);
	const router = useRouter();

	const usernameId = useId();
	const passwordId = useId();
	const emailId = useId();
	const emailDisplayId = useId();
	const otpId = useId();

	async function handlePasswordLogin(formData: FormData) {
		const username = formData.get("username") as string;
		const password = formData.get("password") as string;

		if (!username || !password) {
			return;
		}

		try {
			setLoading(true);
			const result = await signIn("credentials", {
				username,
				password,
				redirect: false,
			});

			if (result?.ok) {
				router.push("/");
			} else {
				setMessage("ログインに失敗しました");
			}
		} catch (error) {
			console.error("Login error:", error);
			setMessage("ログインエラーが発生しました");
		} finally {
			setLoading(false);
		}
	}

	async function handleSendOTP(formData: FormData) {
		const emailValue = formData.get("email") as string;

		if (!emailValue) {
			return;
		}

		try {
			setLoading(true);
			setMessage("");

			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080"}/send-otp`,
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						email: emailValue,
					}),
				},
			);

			if (response.ok) {
				setEmail(emailValue);
				setOtpStep("verify");
				setMessage("OTPをサーバーログで確認してください");
			} else {
				setMessage("OTP送信に失敗しました");
			}
		} catch (error) {
			console.error("OTP send error:", error);
			setMessage("OTP送信エラーが発生しました");
		} finally {
			setLoading(false);
		}
	}

	async function handleVerifyOTP(formData: FormData) {
		const otpValue = formData.get("otp") as string;

		if (!otpValue || !email) {
			return;
		}

		try {
			setLoading(true);
			const result = await signIn("otp", {
				email,
				otp: otpValue,
				redirect: false,
			});

			if (result?.ok) {
				router.push("/");
			} else {
				setMessage("OTP認証に失敗しました");
			}
		} catch (error) {
			console.error("OTP verify error:", error);
			setMessage("OTP認証エラーが発生しました");
		} finally {
			setLoading(false);
		}
	}

	async function handleGoogleLogin() {
		try {
			setLoading(true);
			console.log("Starting Google OAuth login...");

			await signIn("google", {
				redirectTo: "/",
			});

			console.log("Google signIn call completed");
		} catch (error) {
			console.error("Google login error:", error);
			setMessage("Googleログインエラーが発生しました");
			setLoading(false);
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
							setActiveTab("password");
							setMessage("");
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
							setActiveTab("otp");
							setOtpStep("email");
							setMessage("");
						}}
					>
						OTPログイン
					</button>
					<button
						type="button"
						className={`flex-1 py-2 px-4 text-sm font-medium border-b-2 ${
							activeTab === "google"
								? "border-indigo-500 text-indigo-600"
								: "border-transparent text-gray-500 hover:text-gray-700"
						}`}
						onClick={() => {
							setActiveTab("google");
							setMessage("");
						}}
					>
						Googleログイン
					</button>
				</div>

				{/* メッセージ表示 */}
				{message && (
					<div
						className={`text-sm text-center ${message.includes("失敗") || message.includes("エラー") ? "text-red-600" : "text-green-600"}`}
					>
						{message}
					</div>
				)}

				{/* パスワードログインフォーム */}
				{activeTab === "password" && (
					<form className="mt-8 space-y-6" action={handlePasswordLogin}>
						<div className="rounded-md shadow-sm -space-y-px">
							<div>
								<label htmlFor={usernameId} className="sr-only">
									ユーザー名
								</label>
								<input
									id={usernameId}
									name="username"
									type="text"
									required
									className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
									placeholder="ユーザー名"
								/>
							</div>
							<div>
								<label htmlFor={passwordId} className="sr-only">
									パスワード
								</label>
								<input
									id={passwordId}
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
									<label htmlFor={emailId} className="sr-only">
										メールアドレス
									</label>
									<input
										id={emailId}
										name="email"
										type="email"
										required
										value={email}
										onChange={(e) => setEmail(e.target.value)}
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
									<label
										htmlFor={emailDisplayId}
										className="block text-sm font-medium text-gray-700"
									>
										メールアドレス
									</label>
									<input
										id={emailDisplayId}
										type="email"
										value={email}
										disabled
										className="mt-1 appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-500 bg-gray-100 sm:text-sm"
									/>
								</div>

								<div>
									<label htmlFor={otpId} className="sr-only">
										OTPコード
									</label>
									<input
										id={otpId}
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
											setOtpStep("email");
											setMessage("");
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

				{/* Googleログインフォーム */}
				{activeTab === "google" && (
					<div className="mt-8 space-y-6">
						<div className="text-center">
							<p className="text-sm text-gray-600 mb-4">
								Googleアカウントでログインします
							</p>
							<button
								type="button"
								onClick={handleGoogleLogin}
								disabled={loading}
								className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
							>
								<svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
									<path
										fill="#4285F4"
										d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									/>
									<path
										fill="#34A853"
										d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									/>
									<path
										fill="#FBBC05"
										d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									/>
									<path
										fill="#EA4335"
										d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									/>
								</svg>
								{loading ? "ログイン中..." : "Googleでログイン"}
							</button>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
