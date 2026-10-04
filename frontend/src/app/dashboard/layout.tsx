"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { Bot, FileText, LayoutDashboard, LogOut, Settings } from "lucide-react";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (loading) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex-shrink-0 flex flex-col z-20 shadow-sm">
        <div className="h-20 flex items-center px-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center font-bold text-xl text-white shadow-lg shadow-indigo-500/30">
              I
            </div>
            <span className="font-bold text-xl text-gray-900 dark:text-white tracking-tight">Impulso IA</span>
          </div>
        </div>
        
        <nav className="p-4 flex flex-col gap-2 flex-1">
          <Link 
            href="/dashboard" 
            className={`flex items-center px-4 py-3 rounded-xl transition-colors text-sm font-medium ${pathname === '/dashboard' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <LayoutDashboard className="w-5 h-5 mr-3 opacity-70" />
            Painel Inicial
          </Link>

          <Link 
            href="/dashboard/curriculo" 
            className={`flex items-center px-4 py-3 rounded-xl transition-colors text-sm font-medium ${pathname === '/dashboard/curriculo' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
          >
            <FileText className="w-5 h-5 mr-3 opacity-70" />
            Gerador de Currículo
          </Link>

          <a 
            href="https://wa.me/5511999999999?text=Oi%20IA!%20Quero%20treinar%20para%20uma%20entrevista."
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center px-4 py-3 rounded-xl transition-colors text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            <Bot className="w-5 h-5 mr-3 opacity-70" />
            IA Recrutadora
          </a>

          <div className="mt-auto space-y-2 border-t border-gray-200 dark:border-gray-800 pt-4">
            <Link 
              href="/dashboard/perfil" 
              className={`flex items-center px-4 py-3 rounded-xl transition-colors text-sm font-medium ${pathname === '/dashboard/perfil' ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              <Settings className="w-5 h-5 mr-3 opacity-70" />
              Configurações
            </Link>
            
            <button 
              onClick={handleLogout} 
              className="w-full flex items-center text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium text-gray-600 dark:text-gray-400"
            >
              <LogOut className="w-5 h-5 mr-3 opacity-70" />
              Sair da Conta
            </button>
          </div>
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {/* Top Navbar */}
        <header className="h-20 border-b border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md flex items-center justify-end px-8 shrink-0 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {user ? user.nomeCompleto : "Carregando..."}
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center font-bold text-indigo-700 dark:text-indigo-300">
              {user?.nomeCompleto?.charAt(0) || "U"}
            </div>
          </div>
        </header>

        {/* Scrollable Page Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          {children}
        </div>
      </main>
    </div>
  );
}
