"use client";

import { createContext, useContext, useState, useEffect } from "react";
import {
  TOKEN_KEY,
  USER_KEY,
  clearAuthStorage,
  isDemoToken,
  loadAuthFromStorage,
} from "@/lib/auth-storage";

export type Permission = { module: string; function: string };

export type User = {
  id: string;
  email: string;
  name: string;
  role: string;
  roleId?: string;
  companyId?: string;
  companyName?: string;
  permissions?: Permission[];
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  ready: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const { token: t, user: u } = loadAuthFromStorage();
    if (t && u) {
      setToken(t);
      try {
        setUser(JSON.parse(u));
      } catch {
        clearAuthStorage();
      }
    }
    setReady(true);
  }, []);

  const setAuth = (newToken: string, newUser: User) => {
    if (isDemoToken(newToken)) return;
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    clearAuthStorage();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, ready, setAuth, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth deve ser usado dentro de AuthProvider");
  return ctx;
}
