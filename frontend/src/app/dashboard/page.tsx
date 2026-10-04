"use client";

import { useAuth } from "@/lib/auth";
import { Bot, FileText, Sparkles, ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function DashboardIndex() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gradient-to-br from-indigo-900 to-indigo-700 rounded-3xl p-8 md:p-12 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center justify-between">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
              Olá, {user.nomeCompleto.split(' ')[0]}! <span className="inline-block animate-wave">👋</span>
            </h1>
            <p className="text-indigo-100 text-lg md:text-xl">
              Bem-vindo ao seu centro de <b>Letramento Digital</b>. Use nossa inteligência artificial para alavancar a sua carreira.
            </p>
          </div>
          <div className="hidden md:flex p-6 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 shadow-xl">
            <Sparkles className="w-16 h-16 text-indigo-200" />
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Card: Entrevista com IA */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 rounded-2xl flex items-center justify-center mb-6 text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
              <Bot className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Simulador de Entrevista</h2>
            <p className="text-gray-600 dark:text-gray-300 flex-grow mb-8">
              Treine para entrevistas de emprego reais conversando com nossa IA recrutadora direto pelo WhatsApp. Receba feedback instantâneo e perca o nervosismo!
            </p>
            <a 
              href="https://wa.me/5511999999999?text=Oi%20IA!%20Quero%20treinar%20para%20uma%20entrevista."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-between w-full bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-4 rounded-xl transition-colors group-hover:shadow-lg"
            >
              <span>Falar com Agente no WhatsApp</span>
              <MessageSquare className="w-5 h-5" />
            </a>
          </div>
        </div>

        {/* Card: Geração de Currículo */}
        <div className="group relative bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          <div className="relative z-10 flex flex-col h-full">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-2xl flex items-center justify-center mb-6 text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform">
              <FileText className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Construtor de Currículo IA</h2>
            <p className="text-gray-600 dark:text-gray-300 flex-grow mb-8">
              Não sabe como montar seu currículo? Preencha seus dados de forma simples e deixe que nossa Inteligência Artificial estruture um PDF perfeito para você.
            </p>
            <Link 
              href="/dashboard/curriculo"
              className="inline-flex items-center justify-between w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-4 rounded-xl transition-colors group-hover:shadow-lg"
            >
              <span>Criar Meu Currículo</span>
              <ChevronRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Dicas de Letramento Digital - Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <Sparkles className="w-6 h-6 mr-3 text-indigo-500" />
          Dicas de Letramento Digital
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-100 dark:border-indigo-800/30">
            <h3 className="font-bold text-indigo-900 dark:text-indigo-300 mb-2">O Prompt Perfeito</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Para ter a melhor ajuda da IA na hora de revisar um e-mail ou criar um texto, sempre dê <strong>contexto</strong>.
            </p>
            <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-indigo-100 dark:border-indigo-800/50 text-xs text-gray-600 dark:text-gray-400 font-mono">
              "Aja como um recrutador experiente. Vou colar minha carta de apresentação e quero que você avalie o que posso melhorar."
            </div>
          </div>
          
          <div className="p-6 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <h3 className="font-bold text-blue-900 dark:text-blue-300 mb-2">Treino para Entrevistas</h3>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              Use a nossa IA no WhatsApp como seu professor. Se você não entendeu o feedback, faça perguntas!
            </p>
            <div className="bg-white dark:bg-gray-900 p-3 rounded-xl border border-blue-100 dark:border-blue-800/50 text-xs text-gray-600 dark:text-gray-400 font-mono">
              "Por que você achou minha resposta sobre 'defeitos' clichê? Pode me dar um exemplo de uma resposta melhor?"
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
