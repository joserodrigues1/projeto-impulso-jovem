import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Sparkles, BrainCircuit, Lightbulb, MessageSquare, CheckCircle, TrendingUp, Code, Globe, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white selection:bg-indigo-500 selection:text-white transition-colors duration-300">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-lg text-white shadow-lg shadow-indigo-500/20">
              I
            </div>
            <span className="font-bold text-xl tracking-tight">Impulso IA</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600 dark:text-zinc-300">
            <Link href="#funcionalidades" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Funcionalidades</Link>
            <Link href="#dicas-ia" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Dicas de IA</Link>
            <Link href="#sobre" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Sobre o Projeto</Link>
          </nav>
          <div className="flex items-center gap-2 sm:gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" className="text-gray-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white font-semibold">
                Entrar
              </Button>
            </Link>
            <Link href="/registro">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 sm:px-6 shadow-md shadow-indigo-500/20 font-semibold transition-transform hover:scale-105">
                Cadastre-se
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center px-6 pt-40 pb-32 text-center relative overflow-hidden">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-sm font-medium text-indigo-700 dark:text-indigo-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Sparkles className="w-4 h-4" />
            Sua Carreira Potencializada por Inteligência Artificial
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-5xl mb-6 animate-in fade-in zoom-in-95 duration-700 leading-tight">
            Descubra o seu verdadeiro <br className="hidden md:block" /> potencial com a <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-pink-400">IA</span> 🚀.
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in duration-1000 delay-150">
            Pare de perder oportunidades. Desenvolva seu <strong>letramento digital</strong>, treine para entrevistas difíceis no WhatsApp e crie um currículo matador em segundos.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in duration-1000 delay-300">
            <Link href="/registro">
              <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/30 group">
                Começar Minha Jornada
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link href="#funcionalidades">
              <Button size="lg" variant="outline" className="h-14 px-8 text-lg rounded-full border-gray-200 dark:border-white/10 dark:hover:bg-white/5 transition-all">
                Conhecer Mais
              </Button>
            </Link>
          </div>

          {/* Decorative Background */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] md:w-[1000px] h-[600px] md:h-[1000px] bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-fuchsia-500/20 rounded-full blur-[100px] -z-10 pointer-events-none" />
        </section>

        {/* Letramento Digital / Dicas */}
        <section id="dicas-ia" className="px-6 py-24 bg-gray-50 dark:bg-zinc-900/50 border-y border-gray-200 dark:border-white/5">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-sm font-bold text-indigo-600 dark:text-indigo-400 tracking-wider uppercase mb-3">Letramento Digital</h2>
              <h3 className="text-3xl md:text-4xl font-bold">Aprenda a falar com a Inteligência Artificial</h3>
              <p className="mt-4 text-gray-600 dark:text-zinc-400 max-w-2xl mx-auto">
                Saber como escrever os comandos certos (Prompts) é a habilidade mais valorizada do futuro. Veja como a IA pode te ajudar no dia a dia:
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3">O Prompt Perfeito</h4>
                <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4">
                  Em vez de perguntar "Faça meu currículo", experimente dar contexto para a IA trabalhar:
                </p>
                <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 text-sm italic text-gray-700 dark:text-gray-300">
                  "Sou um jovem buscando o primeiro emprego como Jovem Aprendiz. Gosto muito de tecnologia e facilidade com computadores. Crie um resumo profissional de 3 linhas focado nisso."
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Lightbulb className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3">Estude para Entrevistas</h4>
                <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4">
                  A IA pode ser o seu professor particular. Antes de uma entrevista, peça para ela te testar:
                </p>
                <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 text-sm italic text-gray-700 dark:text-gray-300">
                  "Vou fazer uma entrevista para assistente administrativo amanhã. Me faça as 5 perguntas mais comuns dessa área, uma de cada vez, e avalie minhas respostas."
                </div>
              </div>

              <div className="bg-white dark:bg-zinc-900 p-8 rounded-3xl border border-gray-200 dark:border-white/10 shadow-sm hover:shadow-xl transition-all group">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <BrainCircuit className="w-6 h-6" />
                </div>
                <h4 className="text-xl font-bold mb-3">Revisão e Correção</h4>
                <p className="text-gray-600 dark:text-zinc-400 text-sm mb-4">
                  Não envie e-mails ou mensagens importantes com erros. Deixe a IA ser seu revisor:
                </p>
                <div className="bg-gray-50 dark:bg-black/50 p-4 rounded-xl border border-gray-100 dark:border-white/5 text-sm italic text-gray-700 dark:text-gray-300">
                  "Revise o texto abaixo. Corrija os erros de português e torne o tom mais profissional e amigável: [cole seu texto aqui]"
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="funcionalidades" className="px-6 py-24 bg-white dark:bg-zinc-950">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Ferramentas para o seu sucesso</h2>
            
            <div className="grid lg:grid-cols-2 gap-12 items-center mb-24">
              <div className="order-2 lg:order-1 p-8 md:p-12 rounded-3xl bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm w-fit">
                    <Bot className="text-blue-500 w-6 h-6" />
                    <span className="font-medium">"Qual seu maior defeito?"</span>
                  </div>
                  <div className="flex items-center gap-3 bg-indigo-600 text-white p-4 rounded-2xl shadow-sm w-fit ml-auto">
                    <span className="font-medium">"Sou muito perfeccionista às vezes..."</span>
                  </div>
                  <div className="flex items-center gap-3 bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm max-w-sm">
                    <Bot className="text-blue-500 w-6 h-6 shrink-0" />
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      <strong>Dica:</strong> Essa resposta é muito clichê. Tente citar um defeito real que você está trabalhando para melhorar!
                    </span>
                  </div>
                </div>
              </div>
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6">
                  <Bot className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Treine direto no WhatsApp</h3>
                <p className="text-gray-600 dark:text-zinc-400 text-lg mb-6 leading-relaxed">
                  O nervosismo é o maior inimigo na hora da entrevista. Nosso <strong>Recrutador Virtual IA</strong> conduz simulações de entrevistas realistas direto no seu WhatsApp.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Conversa fluida por texto ou áudio
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Feedback detalhado ao final (pontos fortes e fracos)
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Relatórios salvos no seu Painel
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="w-16 h-16 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6">
                  <FileText className="w-8 h-8" />
                </div>
                <h3 className="text-3xl font-bold mb-4">Construtor Mágico de Currículo</h3>
                <p className="text-gray-600 dark:text-zinc-400 text-lg mb-6 leading-relaxed">
                  Não sabe como formatar ou quais palavras usar no seu currículo? Esqueça os templates complicados do Word.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Preencha um formulário super simples
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> A IA reescreve suas experiências para destacar seus pontos fortes
                  </li>
                  <li className="flex items-center gap-3 text-gray-700 dark:text-gray-300">
                    <CheckCircle className="w-5 h-5 text-indigo-500" /> Gere um PDF lindo, moderno e pronto para enviar
                  </li>
                </ul>
              </div>
              <div className="p-8 md:p-12 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 flex items-center justify-center relative">
                 <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-xl shadow-2xl p-6 border border-gray-100 dark:border-white/5">
                    <div className="h-4 w-1/3 bg-gray-200 dark:bg-zinc-800 rounded mb-6"></div>
                    <div className="space-y-3 mb-8">
                      <div className="h-3 w-full bg-gray-100 dark:bg-zinc-800 rounded"></div>
                      <div className="h-3 w-5/6 bg-gray-100 dark:bg-zinc-800 rounded"></div>
                      <div className="h-3 w-4/6 bg-gray-100 dark:bg-zinc-800 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-indigo-100 dark:bg-indigo-500/20 rounded-full"></div>
                      <div className="h-6 w-20 bg-indigo-100 dark:bg-indigo-500/20 rounded-full"></div>
                    </div>
                 </div>
                 <div className="absolute -right-4 -bottom-4 bg-green-500 text-white p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-bounce">
                    <Sparkles className="w-6 h-6" />
                    <span className="font-bold">PDF Gerado!</span>
                 </div>
              </div>
            </div>
          </div>
        </section>

        {/* Sobre o Projeto */}
        <section id="sobre" className="px-6 py-24 bg-gray-900 text-white border-t border-gray-800">
          <div className="max-w-4xl mx-auto text-center">
            <TrendingUp className="w-16 h-16 text-indigo-400 mx-auto mb-8" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Sobre o Impulso Jovem IA</h2>
            <p className="text-gray-300 text-lg leading-relaxed mb-10">
              Este projeto nasceu com uma missão clara: <strong>democratizar o acesso à Inteligência Artificial</strong> para jovens que estão ingressando no mercado de trabalho. Acreditamos que a tecnologia não deve ser uma barreira, mas sim um trampolim. Ao unir letramento digital e ferramentas práticas de empregabilidade, estamos construindo pontes para o futuro.
            </p>
            <div className="flex justify-center gap-4">
               <Button variant="outline" className="border-gray-700 hover:bg-gray-800 hover:text-white bg-transparent">
                  <Code className="w-5 h-5 mr-2" />
                  Código Fonte
               </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 dark:text-zinc-500 border-t border-gray-200 dark:border-white/10 mt-auto bg-gray-50 dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-gray-900 dark:text-white">
            <div className="w-6 h-6 rounded bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-xs text-white">I</div>
            Impulso IA
          </div>
          <p className="text-sm">© 2026 Impulso Jovem. Transformando carreiras com IA.</p>
          <div className="flex gap-4">
             <Link href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors"><Globe className="w-5 h-5" /></Link>
             <Link href="#" className="hover:text-indigo-600 dark:hover:text-white transition-colors"><Code className="w-5 h-5" /></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
