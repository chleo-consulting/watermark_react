"use client";

import { authClient } from "@/lib/auth-client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);
    if (authError) {
      setError(authError.message ?? "Sign up failed");
    } else {
      router.push("/");
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-xl border border-mist/30 bg-white p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-bold text-dark">Sign up</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-dark/60">
              Name
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mist/40 bg-cream/50 px-3 py-2 text-sm text-dark focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-dark/60">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mist/40 bg-cream/50 px-3 py-2 text-sm text-dark focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-dark/60">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-lg border border-mist/40 bg-cream/50 px-3 py-2 text-sm text-dark focus:border-steel focus:outline-none focus:ring-1 focus:ring-steel"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-navy py-2.5 text-sm font-medium text-white transition-colors hover:bg-navy/90 disabled:opacity-50"
          >
            {loading ? "Creating account..." : "Sign up"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-dark/60">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-navy hover:text-navy/80">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
