"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { ChevronLeft, Bot, Calendar, Target, Building2, ThumbsUp, AlertCircle, MessageCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Entrevista {
  id: string;
  cargoAlvo: string;
  empresaAlvo: string | null;
  pontosFortes: string;
  pontosMelhoria: string;
  dicasComunicacao: string;
  dataRealizacao: string;
}

export default function EntrevistasPage() {
  const [entrevistas, setEntrevistas] = useState<Entrevista[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadEntrevistas() {
      try {
        const res = await fetchApi("/entrevistas");
        setEntrevistas(res.dados || []);
      } catch (err: any) {
        setError(err.message || "Erro ao carregar entrevistas");
      } finally {
        setLoading(false);
      }
    }
    loadEntrevistas();
  }, []);

  return (
    <div className="max-w-5xl mx-auto pb-12 animate-in fade-in duration-500">
      <Link href="/dashboard" className="inline-flex items-center text-indigo-600 dark:text-indigo-400 hover:underline mb-8 font-medium">
        <ChevronLeft className="w-4 h-4 mr-1" />
        Voltar para o Dashboard
      </Link>

      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden border border-gray-100 dark:border-gray-700">
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 md:p-12 text-white flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2 flex items-center">
              <Bot className="w-8 h-8 mr-3 opacity-90" />
              Relatórios de Entrevista
            </h1>
            <p className="text-indigo-100 text-lg">Seus feedbacks gerados pela Inteligência Artificial.</p>
          </div>
          <a
            href="https://wa.me/5511999999999?text=Oi%20IA!%20Quero%20treinar%20para%20uma%20entrevista."
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center px-6 py-3 bg-white text-indigo-700 font-bold rounded-xl hover:bg-indigo-50 shadow-lg hover:shadow-xl transition-all"
          >
            Nova Simulação
          </a>
        </div>

        <div className="p-8 md:p-12">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-500">
              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-500" />
              <p className="text-lg">Carregando seus relatórios...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 text-red-600 p-6 rounded-2xl text-center">
              {error}
            </div>
          ) : entrevistas.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 dark:bg-gray-900 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
              <Bot className="w-16 h-16 mx-auto text-gray-400 mb-4 opacity-50" />
              <h3 className="text-xl font-bold text-gray-700 dark:text-gray-300 mb-2">Nenhuma entrevista encontrada</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                Você ainda não realizou nenhuma simulação de entrevista com a nossa IA Recrutadora no WhatsApp.
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {entrevistas.map((entrevista) => (
                <div key={entrevista.id} className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl overflow-hidden hover:border-indigo-300 transition-colors">
                  <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-4 items-center justify-between bg-white dark:bg-gray-800/50">
                    <div>
                      <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm mb-2 font-medium">
                        <Calendar className="w-4 h-4 mr-2" />
                        {format(new Date(entrevista.dataRealizacao), "dd 'de' MMMM 'de' yyyy, 'às' HH:mm", { locale: ptBR })}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                        <Target className="w-5 h-5 mr-2 text-indigo-500" />
                        {entrevista.cargoAlvo}
                      </h3>
                      {entrevista.empresaAlvo && (
                        <p className="text-gray-600 dark:text-gray-400 flex items-center mt-1">
                          <Building2 className="w-4 h-4 mr-2 opacity-70" />
                          {entrevista.empresaAlvo}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-6 grid md:grid-cols-3 gap-6">
                    <div className="space-y-3">
                      <div className="flex items-center text-green-600 font-bold mb-3">
                        <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center mr-3">
                          <ThumbsUp className="w-4 h-4" />
                        </div>
                        Pontos Fortes
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {entrevista.pontosFortes}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-amber-600 font-bold mb-3">
                        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center mr-3">
                          <AlertCircle className="w-4 h-4" />
                        </div>
                        O que Melhorar
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {entrevista.pontosMelhoria}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center text-indigo-600 font-bold mb-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center mr-3">
                          <MessageCircle className="w-4 h-4" />
                        </div>
                        Dicas de Comunicação
                      </div>
                      <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                        {entrevista.dicasComunicacao}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
