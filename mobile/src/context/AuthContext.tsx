import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { loginMotorista as apiLogin } from "@/src/lib/api";
import { clearSession, loadSession, saveSession } from "@/src/lib/auth-storage";

type AuthState = {
  token: string | null;
  nome: string | null;
  ready: boolean;
  login: (cpf: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    loadSession()
      .then((s) => {
        if (s) {
          setToken(s.token);
          setNome(s.nome);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (cpf: string, password: string) => {
    const res = await apiLogin(cpf, password);
    await saveSession(res.access_token, res.motorista.nome);
    setToken(res.access_token);
    setNome(res.motorista.nome);
  }, []);

  const logout = useCallback(async () => {
    await clearSession();
    setToken(null);
    setNome(null);
  }, []);

  return (
    <AuthContext.Provider value={{ token, nome, ready, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do AuthProvider");
  return ctx;
}
