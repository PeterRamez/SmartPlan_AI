"use client";

import { useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");

    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.assign("/dashboard");
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: name.trim() } }
      });
      if (signUpError) throw signUpError;

      // Supabase may require email confirmation. The database trigger provisions
      // the client profile at Auth-user creation time in either case.
      if (data.session) {
        window.location.assign("/dashboard");
        return;
      }

      setSuccess(
        "Your account has been created. Check your email to confirm your address, then sign in. Your client workspace is provisioned automatically."
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5">
      <div className="card w-full max-w-md p-8">
        <Link href="/" className="text-sm text-blue-700">← Alex</Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          {mode === "register"
            ? "Create a secure client account to start your legal consultation with Alex."
            : "Sign in to continue your legal consultation."}
        </p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && (
            <input
              className="field"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoComplete="name"
            />
          )}
          <input
            className="field"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <input
            className="field"
            type="password"
            minLength={8}
            placeholder="Password (min. 8 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
          />
          <button disabled={busy} className="btn btn-primary w-full">
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create client account"}
          </button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">{success}</p>}
        <p className="mt-6 text-sm text-slate-500">
          {mode === "login" ? "New here? " : "Already registered? "}
          <Link className="text-blue-700" href={mode === "login" ? "/register" : "/login"}>
            {mode === "login" ? "Create account" : "Sign in"}
          </Link>
        </p>
        <Link className="mt-3 block text-sm text-blue-700" href="/reset-password">Forgot password?</Link>
      </div>
    </main>
  );
}
