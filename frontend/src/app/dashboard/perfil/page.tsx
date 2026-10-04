"use client";

import { useAuth } from "@/lib/auth";
import { User, Phone, Mail, Settings, ChevronLeft, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PerfilPage() {
  const { user, loading } = useAuth();

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-12 animate-in fade-in duration-500">
      <Link href="/dashboard" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-8 font-medium">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Voltar para o Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-black dark:to-gray-900 p-8 md:p-12 text-white flex items-center gap-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-3xl shadow-lg border-4 border-white/10">
            {user.nomeCompleto.charAt(0)}
          </div>
          <div>
            <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
              Configurações
              <Settings className="w-6 h-6 text-gray-400" />
            </h1>
            <p className="text-gray-400">Gerencie seus dados e preferências da conta.</p>
          </div>
        </div>

        <div className="p-8 md:p-12">
          <div className="grid gap-8">
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <User className="w-5 h-5 text-indigo-500" /> Dados Pessoais
              </h2>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block">Nome Completo</label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.nomeCompleto}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Mail className="w-3 h-3" /> E-mail
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.email}</p>
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-700">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1 block flex items-center gap-1">
                    <Phone className="w-3 h-3" /> WhatsApp
                  </label>
                  <p className="text-gray-900 dark:text-gray-100 font-medium">{user.telefone}</p>
                </div>
              </div>
            </section>

            <section className="space-y-4 mt-8">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 border-b border-gray-100 dark:border-gray-700 pb-2">
                <ShieldCheck className="w-5 h-5 text-green-500" /> Segurança
              </h2>
              <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                <p className="text-sm text-green-800 dark:text-green-300 mb-4">
                  Sua conta está segura e ativa. Se desejar alterar sua senha ou gerenciar o acesso de terceiros, utilize as opções de recuperação na tela de login.
                </p>
                <Button variant="outline" className="border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30">
                  Alterar Senha
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
