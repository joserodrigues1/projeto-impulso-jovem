"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await login({ email, senha });
      router.push("/dashboard"); 
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col sm:justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[10%] left-[20%] w-[50%] h-[50%] rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-[120px]" />
        <div className="absolute bottom-[10%] right-[20%] w-[50%] h-[50%] rounded-full bg-blue-50 dark:bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-block w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-indigo-500/30 mx-auto mb-6">
            I
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Bem-vindo de volta</h1>
          <p className="text-gray-500 dark:text-zinc-400">Acesse sua conta no Impulso IA</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Email</label>
            <Input
              type="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Senha</label>
              <Link href="/recuperar-senha" className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 hover:underline">
                Esqueceu a senha?
              </Link>
            </div>
            <Input
              type="password"
              placeholder="••••••••"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-indigo-500/30"
          >
            {loading ? "Entrando..." : "Entrar na plataforma"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-zinc-400 border-t border-gray-100 dark:border-white/10 pt-6">
          Ainda não tem conta?{" "}
          <Link href="/registro" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold hover:underline">
            Cadastre-se grátis
          </Link>
        </div>
      </div>
    </div>
  );
}
