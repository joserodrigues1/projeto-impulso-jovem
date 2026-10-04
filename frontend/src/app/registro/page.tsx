"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fetchApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const { carregarSessao } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    nomeCompleto: "",
    email: "",
    telefone: "",
    senha: "",
    aceiteTermos: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setFormData({ ...formData, [e.target.name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      await fetchApi("/auth/cadastro", {
        method: "POST",
        body: JSON.stringify(formData),
      });
      // Após o cadastro, atualizar a sessão global
      await carregarSessao();
      router.push("/dashboard");
    } catch (err: any) {
      if (Array.isArray(err.message)) {
        setError(err.message[0]);
      } else {
        setError(err.message || "Erro ao realizar cadastro.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 flex flex-col sm:justify-center p-4">
      {/* Background elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-[120px]" />
        <div className="absolute -bottom-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-blue-50 dark:bg-blue-900/10 blur-[120px]" />
      </div>

      <div className="w-full max-w-md mx-auto bg-white dark:bg-zinc-900 p-8 sm:p-10 rounded-3xl border border-gray-100 dark:border-white/10 shadow-2xl dark:shadow-2xl z-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <div className="text-center mb-8">
          <Link href="/" className="inline-block w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-2xl text-white shadow-lg shadow-indigo-500/30 mx-auto mb-6">
            I
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Criar Conta</h1>
          <p className="text-gray-500 dark:text-zinc-400">Junte-se à revolução da IA na carreira</p>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-600 dark:text-red-400 text-sm font-medium animate-in fade-in">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Nome Completo</label>
            <Input
              name="nomeCompleto"
              placeholder="João da Silva"
              value={formData.nomeCompleto}
              onChange={handleChange}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Email</label>
            <Input
              name="email"
              type="email"
              placeholder="voce@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">WhatsApp (com DDD)</label>
            <Input
              name="telefone"
              type="tel"
              placeholder="11999999999"
              value={formData.telefone}
              onChange={handleChange}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
            <p className="text-xs text-gray-500 dark:text-zinc-500">Obrigatório para conversar com a IA Recrutadora</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700 dark:text-zinc-300">Senha</label>
            <Input
              name="senha"
              type="password"
              placeholder="••••••••"
              value={formData.senha}
              onChange={handleChange}
              required
              className="h-12 bg-gray-50 dark:bg-black/50 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white focus-visible:ring-indigo-500 rounded-xl"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="aceite"
              name="aceiteTermos"
              checked={formData.aceiteTermos}
              onChange={handleChange}
              required
              className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="aceite" className="text-sm text-gray-600 dark:text-zinc-400">
              Li e concordo com a <Link href="#" className="text-indigo-600 dark:text-indigo-400 hover:underline">Política de Privacidade</Link>
            </label>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full h-12 mt-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-base transition-all shadow-lg shadow-indigo-500/30"
          >
            {loading ? "Preparando seu ambiente..." : "Começar Agora"}
          </Button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-600 dark:text-zinc-400 border-t border-gray-100 dark:border-white/10 pt-6">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 font-semibold hover:underline">
            Faça login
          </Link>
        </div>
      </div>
    </div>
  );
}
