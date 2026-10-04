"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { fetchApi } from "./api";

type User = {
  id: string;
  nomeCompleto: string;
  email: string;
  tipoUsuario: "JOVEM" | "EMPRESA" | "MENTOR" | "ADMIN";
};

type AuthContextData = {
  user: User | null;
  loading: boolean;
  login: (dados: any) => Promise<void>;
  logout: () => Promise<void>;
  carregarSessao: () => Promise<void>;
};

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  async function carregarSessao() {
    try {
      const userData = await fetchApi("/me");
      setUser(userData);
    } catch (error) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    carregarSessao();
  }, []);

  const login = async (dados: any) => {
    const userData = await fetchApi("/auth/login", {
      method: "POST",
      body: JSON.stringify(dados),
    });
    setUser(userData);
  };

  const logout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, carregarSessao }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
