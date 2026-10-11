"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { limparDadosLocaisDaConta } from "@/components/curriculo/armazenamento";
import { ApiError, EVENTO_SESSAO_EXPIRADA, fetchApi } from "./api";
import type { Usuario, UsuarioSessao } from "./tipos";

export interface DadosLogin {
  email: string;
  senha: string;
}

/** Corpo de POST /auth/cadastro — o consentimento precisa ser marcado pelo usuário. */
export interface DadosCadastro {
  nomeCompleto: string;
  email: string;
  senha: string;
  /** Com ou sem máscara; a API normaliza para 55 + DDD + número. */
  telefone: string;
  aceiteTermos: true;
}

interface AuthContextData {
  /** Usuário logado (dados de GET /me) ou null para visitante. */
  user: Usuario | null;
  /** true só enquanto a primeira verificação de sessão está em andamento. */
  loading: boolean;
  /**
   * true quando a sessão de quem estava usando o painel acabou sem ele pedir (vencida, encerrada em outra
   * aba ou pela troca de senha em outro aparelho). O painel leva ao login com "proximo" e o login avisa.
   */
  sessaoExpirada: boolean;
  /** Relê a sessão na API (GET /me — o fetchApi já tenta renovar no 401). */
  carregarSessao: () => Promise<Usuario | null>;
  login: (dados: DadosLogin) => Promise<Usuario>;
  cadastrar: (dados: DadosCadastro) => Promise<Usuario>;
  /** Encerra a sessão e apaga deste navegador os dados locais da conta (rascunho, foto do currículo…). */
  logout: () => Promise<void>;
  /**
   * Atualiza o usuário em memória (ex.: depois de PATCH /me). null encerra a sessão local e apaga os
   * dados locais da conta (ex.: depois de excluir a conta).
   */
  atualizarUsuario: (usuario: Usuario | null) => void;
}

const AuthContext = createContext<AuthContextData | null>(null);

/** GET /me sem mexer em estado: null quando não há sessão válida. */
async function buscarUsuario(): Promise<Usuario | null> {
  try {
    return await fetchApi<Usuario>("/me");
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessaoExpirada, setSessaoExpirada] = useState(false);
  // Cada leitura recebe um número; só a mais recente pode gravar (evita uma resposta antiga
  // sobrescrever o login que acabou de acontecer).
  const ultimaLeitura = useRef(0);
  // Espelho do usuário para o ouvinte do evento de sessão expirada (registrado uma vez só)
  const usuarioAtual = useRef<Usuario | null>(null);
  // Depois de sair/excluir a conta, a limpeza roda de novo quando as telas do painel já foram
  // desmontadas — assim nenhum salvamento automático pendente grava o rascunho de volta.
  const limparAposSair = useRef(false);

  useEffect(() => {
    usuarioAtual.current = user;
    if (user || !limparAposSair.current) return;
    limparAposSair.current = false;
    limparDadosLocaisDaConta();
  }, [user]);

  const carregarSessao = useCallback(async () => {
    const leitura = ++ultimaLeitura.current;
    const usuario = await buscarUsuario();
    if (leitura === ultimaLeitura.current) {
      setUser(usuario);
      setLoading(false);
    }
    return usuario;
  }, []);

  useEffect(() => {
    const leitura = ++ultimaLeitura.current;
    buscarUsuario().then((usuario) => {
      if (leitura !== ultimaLeitura.current) return;
      setUser(usuario);
      setLoading(false);
    });
  }, []);

  // A API recusou a renovação da sessão: quem estava logado volta a ser visitante (sem isso o painel
  // ficava "logado" com todas as requisições falhando e o login mandava de volta para o painel).
  useEffect(() => {
    function aoExpirar() {
      if (!usuarioAtual.current) return;
      ultimaLeitura.current++;
      setSessaoExpirada(true);
      setUser(null);
      setLoading(false);
    }
    window.addEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
    return () => window.removeEventListener(EVENTO_SESSAO_EXPIRADA, aoExpirar);
  }, []);

  /** Depois de login/cadastro os cookies já estão gravados: busca o perfil completo. */
  const concluirEntrada = useCallback(async () => {
    const usuario = await carregarSessao();
    if (!usuario) {
      throw new ApiError("Entramos na sua conta, mas não conseguimos carregar seus dados. Atualize a página.", 0);
    }
    setSessaoExpirada(false);
    return usuario;
  }, [carregarSessao]);

  const login = useCallback(
    async (dados: DadosLogin) => {
      await fetchApi<UsuarioSessao>("/auth/login", { method: "POST", body: JSON.stringify(dados) });
      return concluirEntrada();
    },
    [concluirEntrada],
  );

  const cadastrar = useCallback(
    async (dados: DadosCadastro) => {
      await fetchApi<UsuarioSessao>("/auth/cadastro", { method: "POST", body: JSON.stringify(dados) });
      return concluirEntrada();
    },
    [concluirEntrada],
  );

  const logout = useCallback(async () => {
    ultimaLeitura.current++;
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // Mesmo se a API falhar, a sessão local é encerrada
    } finally {
      // Computador compartilhado (escola, lan house): nada da pessoa fica no navegador
      limparDadosLocaisDaConta();
      limparAposSair.current = true;
      setSessaoExpirada(false);
      setUser(null);
      setLoading(false);
    }
  }, []);

  const atualizarUsuario = useCallback((usuario: Usuario | null) => {
    ultimaLeitura.current++;
    if (!usuario) {
      limparDadosLocaisDaConta();
      limparAposSair.current = true;
    }
    setSessaoExpirada(false);
    setUser(usuario);
    setLoading(false);
  }, []);

  const valor = useMemo<AuthContextData>(
    () => ({ user, loading, sessaoExpirada, carregarSessao, login, cadastrar, logout, atualizarUsuario }),
    [user, loading, sessaoExpirada, carregarSessao, login, cadastrar, logout, atualizarUsuario],
  );

  return <AuthContext value={valor}>{children}</AuthContext>;
}

export function useAuth(): AuthContextData {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return contexto;
}
