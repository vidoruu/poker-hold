"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/client/auth-context";

export default function AuthPage() {
  const router = useRouter();
  const { signUp, signIn, isAuthenticated } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    router.push("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        if (!displayName.trim()) {
          setError("Display name is required");
          setLoading(false);
          return;
        }
        await signUp(email, password, displayName);
        setError("Registration successful! Please check your email to confirm.");
        setTimeout(() => {
          setIsLogin(true);
          setEmail("");
          setPassword("");
          setDisplayName("");
        }, 2000);
      }
      router.push("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-green-900 to-black flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-xl p-8">
        <h1 className="text-3xl font-bold text-white mb-2 text-center">
          {isLogin ? "Login" : "Register"}
        </h1>
        <p className="text-gray-400 text-center mb-6">
          {isLogin ? "Welcome back to Holdem Poker" : "Join the tables"}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
                placeholder="Your poker name"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              placeholder="your@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-green-500"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div
              className={`p-3 rounded-lg text-sm ${
                error.includes("successful")
                  ? "bg-green-900 text-green-200"
                  : "bg-red-900 text-red-200"
              }`}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            {loading ? "Loading..." : isLogin ? "Login" : "Register"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-400">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError("");
                setEmail("");
                setPassword("");
                setDisplayName("");
              }}
              className="text-green-400 hover:text-green-300 font-semibold"
            >
              {isLogin ? "Register" : "Login"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
