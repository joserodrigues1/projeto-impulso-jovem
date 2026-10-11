/**
 * Ponto de entrada do container do frontend (substitui o `node server.js` do build standalone).
 *
 * O proxy de rewrites do Next (`/api-proxy/*` → API) repassa os headers da requisição, mas não
 * informa o IP de quem conectou. Sem isso a API enxerga todo mundo com o IP do container do Next
 * (o rate limit vira um balde único para o site inteiro) e aceitaria um X-Forwarded-For forjado.
 *
 * Aqui o X-Forwarded-For é SOBRESCRITO com o IP real antes de o Next tratar a requisição:
 * - padrão: o IP do socket (acesso direto à porta 3000);
 * - CONFIAR_PROXY_REVERSO=true: há um Nginx/Caddy na frente — usa o último IP do X-Forwarded-For,
 *   que é o que esse proxy acrescentou (o resto da lista pode ter sido forjado pelo cliente).
 */
/* eslint-disable @typescript-eslint/no-require-imports -- roda direto no Node (CommonJS), como o server.js gerado pelo Next */
'use strict';

const http = require('node:http');

const confiarProxyReverso = process.env.CONFIAR_PROXY_REVERSO === 'true';

function ipDoCliente(req) {
  if (confiarProxyReverso) {
    const ultimo = String(req.headers['x-forwarded-for'] ?? '')
      .split(',')
      .pop()
      .trim();
    if (ultimo) return ultimo;
  }
  return req.socket?.remoteAddress ?? '';
}

const criarServidor = http.createServer;
http.createServer = function (...args) {
  const i = args.findIndex((a) => typeof a === 'function');
  if (i >= 0) {
    const tratar = args[i];
    args[i] = function (req, res) {
      const ip = ipDoCliente(req);
      if (ip) req.headers['x-forwarded-for'] = ip;
      else delete req.headers['x-forwarded-for'];
      return tratar.call(this, req, res);
    };
  }
  return criarServidor.apply(this, args);
};

require('./server.js');
