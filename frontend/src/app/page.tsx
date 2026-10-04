import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Bot, FileText, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-zinc-950 text-gray-900 dark:text-white selection:bg-indigo-500 selection:text-white transition-colors">
      {/* Navbar */}
      <header className="fixed top-0 w-full z-50 border-b border-gray-200 dark:border-white/10 bg-white/80 dark:bg-black/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center font-bold text-lg text-white">
              I
            </div>
            <span className="font-bold text-xl tracking-tight">Impulso IA</span>
          </div>
          <nav className="hidden md:flex gap-8 text-sm font-medium text-gray-600 dark:text-zinc-300">
            <Link href="#sobre" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Sobre o Projeto</Link>
            <Link href="#funcionalidades" className="hover:text-indigo-600 dark:hover:text-white transition-colors">Funcionalidades</Link>
          </nav>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="ghost" className="text-gray-600 dark:text-zinc-300 hover:text-indigo-600 dark:hover:text-white">
                Entrar
              </Button>
            </Link>
            <Link href="/registro">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
                Cadastre-se
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center relative overflow-hidden">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-50 dark:bg-white/5 border border-indigo-100 dark:border-white/10 text-sm text-indigo-700 dark:text-indigo-300 mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Sparkles className="w-4 h-4" />
          Inteligência Artificial para sua Carreira
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl mb-6 animate-in fade-in zoom-in-95 duration-700">
          O seu futuro potencializado por <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-pink-400">IA</span>.
        </h1>
        
        <p className="text-lg md:text-xl text-gray-600 dark:text-zinc-400 max-w-2xl mb-10 leading-relaxed animate-in fade-in duration-1000 delay-150">
          Desenvolva seu letramento digital, treine para entrevistas com nosso agente inteligente e gere um currículo impecável em segundos.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-in fade-in duration-1000 delay-300">
          <Link href="/registro">
            <Button size="lg" className="h-14 px-8 text-lg rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-500/20">
              Começar Agora
            </Button>
          </Link>
        </div>

        {/* Decorative elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-500/10 dark:bg-indigo-500/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      </main>

      {/* Features Grid */}
      <section id="funcionalidades" className="px-6 py-24 bg-gray-50 dark:bg-zinc-950 border-t border-gray-200 dark:border-white/5">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-16">Tudo o que você precisa para se destacar</h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:shadow-xl dark:hover:bg-white/10 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Bot className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Simulador de Entrevista com IA</h3>
              <p className="text-gray-600 dark:text-zinc-400 text-lg">
                Fique frente a frente com nosso recrutador virtual via WhatsApp. Pratique respostas, perca o nervosismo e receba feedbacks personalizados sobre o que melhorar.
              </p>
            </div>
            
            <div className="p-8 rounded-3xl bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:shadow-xl dark:hover:bg-white/10 transition-all duration-300 group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-8 h-8" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Construtor Mágico de Currículo</h3>
              <p className="text-gray-600 dark:text-zinc-400 text-lg">
                Não sabe que template usar? Apenas preencha suas experiências e habilidades, e deixe a Inteligência Artificial formatar e gerar o PDF perfeito para o seu perfil.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 text-center text-gray-500 dark:text-zinc-500 border-t border-gray-200 dark:border-white/10 mt-auto">
        <p>© 2026 Impulso IA. Plataforma de Letramento Digital e Carreira.</p>
      </footer>
    </div>
  );
}
