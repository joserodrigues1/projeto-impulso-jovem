"use client";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { ChevronLeft, Plus, Trash2, Send, FileCheck, Loader2 } from "lucide-react";
import Link from "next/link";
import { fetchApi } from "@/lib/api";

export default function CurriculoPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [resumo, setResumo] = useState("");
  const [nivelEscolaridade, setNivelEscolaridade] = useState("");
  const [habilidades, setHabilidades] = useState<string[]>([]);
  const [habilidadeInput, setHabilidadeInput] = useState("");
  
  const [experiencias, setExperiencias] = useState([
    { cargo: "", empresa: "", dataInicio: "", dataFim: "", descricao: "" }
  ]);

  const addHabilidade = () => {
    if (habilidadeInput.trim() && !habilidades.includes(habilidadeInput.trim())) {
      setHabilidades([...habilidades, habilidadeInput.trim()]);
      setHabilidadeInput("");
    }
  };

  const removeHabilidade = (hab: string) => {
    setHabilidades(habilidades.filter((h) => h !== hab));
  };

  const addExperiencia = () => {
    setExperiencias([...experiencias, { cargo: "", empresa: "", dataInicio: "", dataFim: "", descricao: "" }]);
  };

  const updateExperiencia = (index: number, field: string, value: string) => {
    const novas = [...experiencias];
    novas[index] = { ...novas[index], [field]: value };
    setExperiencias(novas);
  };

  const removeExperiencia = (index: number) => {
    setExperiencias(experiencias.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetchApi("/curriculos/gerar", {
        method: "POST",
        body: JSON.stringify({
          resumoProfissional: resumo,
          nivelEscolaridade,
          habilidades,
          experiencias,
        }),
      });
      setSucesso(true);
    } catch (error) {
      alert("Ocorreu um erro ao gerar o currículo.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (sucesso) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
          <FileCheck className="w-12 h-12" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">Currículo Gerado com Sucesso!</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 mb-8">
          Nossa Inteligência Artificial está processando seu currículo neste exato momento. Em breve você receberá o PDF no seu e-mail e WhatsApp!
        </p>
        <Link href="/dashboard" className="inline-flex items-center justify-center px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors font-medium">
          Voltar para o Início
        </Link>
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
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 md:p-12 text-white">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Construtor de Currículo</h1>
          <p className="text-indigo-100 text-lg">Deixe nossa IA formatar o currículo perfeito para você.</p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 md:p-12 space-y-12">
          {/* Seção Básica */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b pb-2">Resumo Profissional</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sobre você (O que você busca? O que gosta de fazer?)</label>
                <textarea 
                  value={resumo}
                  onChange={(e) => setResumo(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-shadow min-h-[120px]"
                  placeholder="Ex: Sou apaixonado por tecnologia e busco minha primeira oportunidade como Desenvolvedor..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nível de Escolaridade</label>
                <select 
                  value={nivelEscolaridade}
                  onChange={(e) => setNivelEscolaridade(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Selecione...</option>
                  <option value="Ensino Médio Incompleto">Ensino Médio Incompleto</option>
                  <option value="Ensino Médio Completo">Ensino Médio Completo</option>
                  <option value="Ensino Superior Incompleto">Ensino Superior Incompleto</option>
                  <option value="Ensino Superior Completo">Ensino Superior Completo</option>
                </select>
              </div>
            </div>
          </section>

          {/* Habilidades */}
          <section className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white border-b pb-2">Habilidades e Conhecimentos</h2>
            <div>
              <div className="flex gap-2">
                <input 
                  type="text"
                  value={habilidadeInput}
                  onChange={(e) => setHabilidadeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addHabilidade())}
                  className="flex-grow px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ex: Pacote Office, Comunicação, JavaScript..."
                />
                <button type="button" onClick={addHabilidade} className="px-6 py-3 bg-indigo-100 text-indigo-700 font-medium rounded-xl hover:bg-indigo-200 transition-colors">
                  Adicionar
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                {habilidades.map((hab) => (
                  <span key={hab} className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-sm font-medium border border-indigo-100 dark:border-indigo-800">
                    {hab}
                    <button type="button" onClick={() => removeHabilidade(hab)} className="ml-2 hover:text-indigo-900 dark:hover:text-white">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </span>
                ))}
                {habilidades.length === 0 && (
                  <p className="text-sm text-gray-500 italic">Nenhuma habilidade adicionada ainda.</p>
                )}
              </div>
            </div>
          </section>

          {/* Experiências */}
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b pb-2">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Experiências (Profissionais ou Projetos)</h2>
              <button type="button" onClick={addExperiencia} className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center text-sm">
                <Plus className="w-4 h-4 mr-1" /> Adicionar
              </button>
            </div>
            
            <div className="space-y-6">
              {experiencias.map((exp, index) => (
                <div key={index} className="p-6 rounded-2xl bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 relative group">
                  <button type="button" onClick={() => removeExperiencia(index)} className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-5 h-5" />
                  </button>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cargo / Função</label>
                      <input 
                        type="text"
                        value={exp.cargo}
                        onChange={(e) => updateExperiencia(index, 'cargo', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Empresa / Instituição</label>
                      <input 
                        type="text"
                        value={exp.empresa}
                        onChange={(e) => updateExperiencia(index, 'empresa', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Início</label>
                      <input 
                        type="month"
                        value={exp.dataInicio}
                        onChange={(e) => updateExperiencia(index, 'dataInicio', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data Fim (deixe vazio se atual)</label>
                      <input 
                        type="month"
                        value={exp.dataFim}
                        onChange={(e) => updateExperiencia(index, 'dataFim', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Descrição das Atividades</label>
                      <textarea 
                        value={exp.descricao}
                        onChange={(e) => updateExperiencia(index, 'descricao', e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                      />
                    </div>
                  </div>
                </div>
              ))}
              {experiencias.length === 0 && (
                <p className="text-gray-500 italic text-center py-4">Você ainda não adicionou nenhuma experiência.</p>
              )}
            </div>
          </section>

          <div className="pt-8 border-t">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full flex items-center justify-center py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-lg transition-all shadow-lg hover:shadow-indigo-500/30 disabled:opacity-70"
            >
              {loading ? (
                <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Processando com IA...</>
              ) : (
                <><Send className="w-6 h-6 mr-2" /> Gerar Currículo Mágico</>
              )}
            </button>
            <p className="text-center text-sm text-gray-500 mt-4">
              Seus dados básicos (Nome, Email e Telefone) serão integrados automaticamente.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
