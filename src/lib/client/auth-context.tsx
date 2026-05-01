"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabaseBrowser } from "./supabase-browser";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseBrowser) {
      setLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await (supabaseBrowser!).auth.getSession();
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (error) {
        console.error("Failed to get session:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for auth changes
    const {
      data: { subscription },
    } = (supabaseBrowser!).auth.onAuthStateChange((_event: AuthChangeEvent, newSession: Session | null) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    if (!supabaseBrowser) throw new Error("Supabase not configured");

    const { error } = await supabaseBrowser.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;

    // Create wallet entry for new user
    const { data: authUser } = await supabaseBrowser.auth.getUser();
    if (authUser.user) {
      const response = await fetch("/api/wallet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: authUser.user.id,
          displayName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create wallet");
      }
    }
  };

  const signIn = async (email: string, password: string) => {
    if (!supabaseBrowser) throw new Error("Supabase not configured");

    const { error } = await supabaseBrowser.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    if (!supabaseBrowser) throw new Error("Supabase not configured");

    const { error } = await supabaseBrowser.auth.signOut();
    if (error) throw error;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        signUp,
        signIn,
        signOut,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
