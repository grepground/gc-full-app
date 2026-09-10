"use client";

import React, { useState, useRef, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "../services/api";
import { useAuth } from "../context/AuthContext";
import { getSiteName, getPlaceholderEmail } from "../services/siteConfig";

type AuthMode = "login" | "register" | "forgot-password" | "reset-password";

function AuthForm() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [usernameWarning, setUsernameWarning] = useState<string | null>(null);
  const [username, setUsername] = useState<string>("");
  const [isRedirecting, setIsRedirecting] = useState<boolean>(false);
  const [resetEmail, setResetEmail] = useState<string>("");

  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, refreshUser } = useAuth();

  const callbackUrl = searchParams.get("callbackUrl") || "/";

  useEffect(() => {
    if (!loading && user) {
      if (callbackUrl.includes("/admin") && user.role !== "admin") {
        router.push("/");
      } else {
        router.push(callbackUrl);
      }
    }
  }, [user, loading, router, callbackUrl]);

  const handleAuthSubmit = async (formData: FormData) => {
    setError(null);
    setSuccess(null);

    let username = formData.get("username") as string;
    if (username) {
      username = username.toLowerCase();
    }

    if (mode === "register" && username) {
      if (/\s/.test(username)) {
        setUsernameWarning(
          "Spaces are not allowed in usernames. Use letters and numbers only.",
        );
        setError(null);
        return;
      }
      if (!/^[a-z0-9]+$/.test(username)) {
        setUsernameWarning(
          "Only lowercase letters (a-z) and numbers are allowed in usernames.",
        );
        setError(null);
        return;
      }
    }
    const password = formData.get("password") as string;
    const email = formData.get("email") as string;
    const code = formData.get("code") as string;
    const newPassword = formData.get("newPassword") as string;

    try {
      if (mode === "login") {
        await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ username, password }),
        });

        setIsRedirecting(true);
        await refreshUser();
        router.push(callbackUrl);
        router.refresh();
      } else if (mode === "register") {
        await apiFetch("/users", {
          method: "POST",
          body: JSON.stringify({ username, email, password }),
        });
        setMode("login");
        setUsername("");
        setUsernameWarning(null);
        formRef.current?.reset();
        setSuccess("Account created successfully. Please sign in.");
      } else if (mode === "forgot-password") {
        await apiFetch("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email }),
        });
        setResetEmail(email);
        setMode("reset-password");
        formRef.current?.reset();
        setSuccess("Security verification code dispatched to your mailbox.");
      } else if (mode === "reset-password") {
        await apiFetch("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: resetEmail, code, newPassword }),
        });
        setMode("login");
        formRef.current?.reset();
        setSuccess("Password updated successfully. You can now log in.");
      }
    } catch (err: any) {
      setIsRedirecting(false);
      setError(err.message || "Operation failed within authentication engine.");
    }
  };

  if (loading) {
    return (
      <div className="text-center font-bold text-sm py-20 text-chess-text/40 animate-pulse">
        Verifying session...
      </div>
    );
  }

  if (user || isRedirecting) {
    return (
      <div className="max-w-md mx-auto my-12 w-full">
        <div className="bg-chess-surface p-10 rounded-3xl text-center space-y-3">
          <div className="text-2xl font-black text-chess-text">
            Access Granted ♟️
          </div>
          <p className="text-sm font-bold text-chess-primary animate-pulse">
            Redirecting to platform...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto my-8 w-full">
      <div className="bg-chess-surface p-8 md:p-10 rounded-3xl space-y-6">
        {/* Chubby Pill Tab Switcher */}
        {(mode === "login" || mode === "register") && (
          <div className="grid grid-cols-2 gap-1 bg-chess-bg p-1.5 rounded-full">
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setUsername("");
                setUsernameWarning(null);
                setError(null);
                setSuccess(null);
              }}
              className={`py-2.5 font-black text-xs rounded-full transition-all cursor-pointer ${
                mode === "login"
                  ? "bg-chess-primary text-chess-surface shadow-sm"
                  : "text-chess-text/60 hover:text-chess-text"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("register");
                setUsername("");
                setUsernameWarning(null);
                setError(null);
                setSuccess(null);
              }}
              className={`py-2.5 font-black text-xs rounded-full transition-all cursor-pointer ${
                mode === "register"
                  ? "bg-chess-primary text-chess-surface shadow-sm"
                  : "text-chess-text/60 hover:text-chess-text"
              }`}
            >
              Register
            </button>
          </div>
        )}

        {/* Header Text */}
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-chess-text">
            {mode === "login" && "Welcome back"}
            {mode === "register" && `Join ${getSiteName()}`}
            {mode === "forgot-password" && "Recover credentials"}
            {mode === "reset-password" && "Update password"}
          </h1>
          <p className="text-xs font-bold text-chess-text/50">
            {mode === "login" && "Enter your player details to continue"}
            {mode === "register" && "Start your tactical chess analysis today"}
            {mode === "forgot-password" &&
              "Enter your registered email address"}
            {mode === "reset-password" &&
              "Check your inbox for the 6-digit code"}
          </p>
        </div>

        {/* Feedback Messages */}
        {error && (
          <div className="bg-red-500/10 px-4 py-3 rounded-2xl text-xs font-extrabold text-red-400">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-chess-primary/10 px-4 py-3 rounded-2xl text-xs font-extrabold text-chess-primary">
            {success}
          </div>
        )}

        {/* Form Fields */}
        <form
          ref={formRef}
          key={mode}
          action={handleAuthSubmit}
          className="space-y-4"
        >
          {(mode === "login" || mode === "register") && (
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-chess-text/70">
                Username
              </label>
              <input
                type="text"
                name="username"
                required
                value={username}
                onChange={(e) => {
                  const raw = e.target.value;
                  // Block spaces and special characters in real-time
                  const cleaned = raw.replace(/[^a-zA-Z0-9]/g, "");
                  if (cleaned !== raw) {
                    setUsernameWarning(
                      "Only letters and numbers are allowed. Spaces and special characters were removed.",
                    );
                  } else {
                    setUsernameWarning(null);
                  }
                  setUsername(cleaned);
                }}
                className="w-full bg-chess-bg px-4 py-3 rounded-2xl font-bold text-sm text-chess-text focus:outline-none focus:bg-chess-bg/80 transition-colors"
                placeholder="grandmaster1"
              />
              {mode === "register" && usernameWarning && (
                <p className="text-xs font-extrabold text-red-400">
                  {usernameWarning}
                </p>
              )}
            </div>
          )}

          {(mode === "register" || mode === "forgot-password") && (
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-chess-text/70">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                className="w-full bg-chess-bg px-4 py-3 rounded-2xl font-bold text-sm text-chess-text focus:outline-none focus:bg-chess-bg/80 transition-colors"
                placeholder={getPlaceholderEmail()}
              />
            </div>
          )}

          {(mode === "login" || mode === "register") && (
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-extrabold text-chess-text/70">
                  Password
                </label>
                {mode === "login" && (
                  <button
                    type="button"
                    tabIndex={-1} // Removed from tab order, prevents focusing
                    onClick={() => {
                      setMode("forgot-password");
                      setError(null);
                      setSuccess(null);
                    }}
                    className="text-xs font-extrabold text-chess-primary hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <input
                type="password"
                name="password"
                required
                tabIndex={0} // Focuses directly here right after the username field
                className="w-full bg-chess-bg px-4 py-3 rounded-2xl font-bold text-sm text-chess-text focus:outline-none focus:bg-chess-bg/80 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {mode === "reset-password" && (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-chess-text/70">
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  name="code"
                  maxLength={6}
                  required
                  className="w-full bg-chess-bg px-4 py-3 rounded-2xl font-black tracking-[6px] text-center text-sm text-chess-primary focus:outline-none transition-colors"
                  placeholder="000000"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-chess-text/70">
                  New Password
                </label>
                <input
                  type="password"
                  name="newPassword"
                  required
                  className="w-full bg-chess-bg px-4 py-3 rounded-2xl font-bold text-sm text-chess-text focus:outline-none focus:bg-chess-bg/80 transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            className="w-full bg-chess-primary text-chess-surface font-black py-3.5 rounded-2xl hover:opacity-90 transition-opacity text-xs uppercase tracking-wider cursor-pointer mt-2"
          >
            {mode === "login" && "Sign in"}
            {mode === "register" && "Create account"}
            {mode === "forgot-password" && "Send recovery code"}
            {mode === "reset-password" && "Save new password"}
          </button>
        </form>

        {/* Continue without signing in */}
        {mode === "login" && !callbackUrl.includes("/admin") && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setIsRedirecting(true);
                router.push(callbackUrl);
                router.refresh();
              }}
              className="w-full bg-transparent border border-chess-border/20 text-chess-text/60 hover:text-chess-text hover:border-chess-primary/50 font-black py-2.5 rounded-2xl transition-all text-xs cursor-pointer"
            >
              Continue without signing in ↗
            </button>
          </div>
        )}

        {/* Footer Navigation Hints */}
        <div className="text-center text-xs font-extrabold text-chess-text/50 pt-2">
          {mode === "login" && (
            <p>
              New player?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setUsername("");
                  setUsernameWarning(null);
                  setError(null);
                }}
                className="text-chess-primary hover:underline cursor-pointer"
              >
                Create account
              </button>
            </p>
          )}
          {mode === "register" && (
            <p>
              Already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setUsername("");
                  setUsernameWarning(null);
                  setError(null);
                }}
                className="text-chess-primary hover:underline cursor-pointer"
              >
                Sign in
              </button>
            </p>
          )}
          {(mode === "forgot-password" || mode === "reset-password") && (
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setUsername("");
                setUsernameWarning(null);
                setError(null);
                setSuccess(null);
              }}
              className="text-chess-text/60 hover:text-chess-primary transition-colors cursor-pointer"
            >
              ← Back to sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center font-bold text-sm py-20 text-chess-text/40 animate-pulse">
          Loading authentication...
        </div>
      }
    >
      <AuthForm />
    </Suspense>
  );
}
