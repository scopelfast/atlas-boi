# Demo pública — Atlas Boi (ngrok / túnel)

Guia rápido para expor a aplicação na internet e enviar a URL a um testador (celular, outra rede, cliente).

---

## Resumo em uma linha

Na **raiz do projeto**, com PostgreSQL e `backend/.env` ok:

```bash
npm run demo:full:ngrok
```

Um terminal sobe **backend + frontend (produção) + ngrok** e imprime a URL pública.

---

## O que roda onde

| Serviço | Porta | Função |
|---------|-------|--------|
| **Backend** (NestJS) | `3004` | API, banco, login, KPIs |
| **Frontend** (Next.js) | `3000` | Interface |
| **Ngrok** | — | Repassa `https://....ngrok-free.dev` → `localhost:3000` |

O ngrok **não substitui** o frontend. Ele só cria um túnel até o que já está rodando na sua máquina.

A API é acessada pelo browser via proxy do Next (`/api/...` → `localhost:3004`). Por isso **não precisa** túnel separado no backend.

---

## Pré-requisitos (fazer uma vez)

### 1. Banco e backend

- PostgreSQL rodando
- Arquivo `backend/.env` configurado (copie de `backend/.env.example` se necessário)
- Migrações aplicadas (`cd backend && npm run prisma:migrate`)

### 2. Ngrok (conta gratuita)

1. Crie conta: https://dashboard.ngrok.com/signup  
2. Instale (Windows): `winget install Ngrok.Ngrok`  
3. Configure o token (substitua pelo seu):

```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

### 3. Dependências na raiz

```bash
npm install
```

---

## Comando recomendado (1 terminal)

```bash
npm run demo:full:ngrok
```

### O que esse comando faz

1. Sobe o **backend** na porta `3004` (se ainda não estiver rodando)
2. Compila o **frontend** se não existir build (`frontend/.next`)
3. Sobe o **frontend em produção** na porta `3000` (`next start`)
4. Abre o **túnel ngrok** e exibe a URL pública

**Ctrl+C** encerra túnel e os processos que o script iniciou. Se backend/frontend já estavam rodando antes, eles são **reutilizados** (não são mortos).

### Outros comandos (escolha **um**, não rode todos)

| Comando | Quando usar |
|---------|-------------|
| `npm run demo:full` | Túnel automático: ngrok se tiver authtoken, senão localtunnel |
| `npm run demo:full:ngrok` | **Recomendado** — força ngrok |
| `npm run demo:full:cf` | Força Cloudflare Tunnel (`cloudflared`) |

---

## Login demo

| Campo | Valor |
|-------|--------|
| E-mail | `admin@atlas.local` |
| Senha | `admin123` |

---

## Enviar para o testador

1. Copie a URL `https://....ngrok-free.dev/login` que aparece no terminal (sempre com **`/login`**)  
2. Envie por WhatsApp, e-mail, etc.  
3. Orientações úteis:
   - Na **1ª visita** (ngrok free): toque em **Visit Site**
   - Abra no **Chrome ou Safari** — evite o preview embutido do WhatsApp
   - **Não envie `/dashboard`** sem login — use sempre **`/login`**
   - **Desative tradução automática** se o menu aparecer cortado ou com textos estranhos
   - **Tela branca no celular?** Toque Visit Site → recarregue 1x. Se persistir: `npm run demo:full:cf` (Cloudflare, sem aviso ngrok)

---

## Celular — tela branca

Causas comuns:

| Sintoma | Solução |
|---------|---------|
| Tela branca ao abrir ngrok | Toque **Visit Site** na 1ª visita |
| Abriu `/dashboard` sem login | Use **`/login`** na URL |
| Branco depois de Visit Site | **Recarregue** a página uma vez (SW ngrok) |
| Ainda branco | Pare e rode `npm run demo:full:cf` (Cloudflare Tunnel) |
| Preview do WhatsApp | Abrir no Chrome/Safari (⋮ → Abrir no navegador) |

A app inclui um **service worker** (`ngrok-sw.js`) que adiciona o header `ngrok-skip-browser-warning` nos arquivos JavaScript — necessário no plano gratuito do ngrok.

---

## Fiz correções no código — sobe normalmente?

**Sim**, com um detalhe importante:

### Só backend (`backend/src/...`)

O `demo:full` usa `npm run dev` no backend (watch mode).  
**Salve o arquivo** → Nest recompila sozinho → **não precisa** reiniciar o comando.

### Frontend (`frontend/...`)

O demo usa **modo produção** (`next build` + `next start`).  
Mudanças no frontend **não aparecem** até recompilar.

**Fluxo após alterar o frontend:**

```bash
# Ctrl+C para parar o demo:full (se estiver rodando)

npm run demo:build          # recompila o frontend
npm run demo:full:ngrok       # sobe tudo de novo
```

Ou, numa linha:

```bash
npm run demo:build && npm run demo:full:ngrok
```

> **Dica:** se algo parecer “cache antigo”, apague `frontend/.next` e rode `demo:build` de novo.

### Backend + frontend

Recompile o frontend (`demo:build`) e rode `demo:full:ngrok` outra vez. O backend em watch já pega as mudanças da API sozinho se o processo continuar rodando; na prática, reiniciar o `demo:full` inteiro é o mais simples.

---

## Desenvolvimento local (sem túnel)

Para codar no dia a dia, use dois terminais:

```bash
# Terminal 1
cd backend && npm run dev

# Terminal 2
cd frontend && npm run dev
```

Acesse: http://localhost:3000  

**Não use** `next dev` + ngrok para teste no celular — o Fast Refresh pode causar erros de DOM (`removeChild`) no mobile. Para demo externa, prefira sempre `demo:full` / `demo:full:ngrok`.

---

## Modo manual (3 terminais) — alternativa

Se preferir controlar cada peça:

```bash
# Terminal 1 — API
cd backend && npm run dev

# Terminal 2 — frontend produção
npm run demo

# Terminal 3 — túnel
npm run tunnel:ngrok
```

Equivalente ao `demo:full:ngrok`, mas em terminais separados.

---

## Scripts disponíveis (referência)

| Script | Descrição |
|--------|-----------|
| `npm run demo:full` | Backend + frontend prod + túnel (auto) |
| `npm run demo:full:ngrok` | Idem, força ngrok |
| `npm run demo:full:cf` | Idem, força cloudflared |
| `npm run demo` | Só frontend produção (porta 3000) |
| `npm run demo:build` | Só compila o frontend |
| `npm run tunnel` | Só túnel (exige frontend na 3000) |
| `npm run tunnel:ngrok` | Só túnel ngrok |
| `npm run tunnel:cf` | Só túnel Cloudflare |

Arquivos: `scripts/demo-full.mjs`, `scripts/demo-public.mjs`, `scripts/tunnel-public.mjs`

---

## Problemas comuns

### Build do frontend falha

O modo produção roda `next build`. Erros de TypeScript **bloqueiam** o demo (diferente do `next dev`).

Corrija o erro, depois:

```bash
npm run demo:build
npm run demo:full:ngrok
```

### “Nada escutando na porta 3000”

O frontend não subiu. Verifique erros de build acima ou se outra coisa ocupa a porta 3000.

### Ngrok pede authtoken (ERR_NGROK_4018)

```bash
ngrok config add-authtoken SEU_TOKEN
```

### Página “Carregando...” eternamente

- Confirme backend na 3004 e frontend na 3000
- Abra a URL no navegador completo, não no preview do WhatsApp
- Toque em **Visit Site** na página de aviso do ngrok

### UI diferente no celular (menu cortado, “Painel”, textos estranhos)

- **Tradução automática** do navegador — desative
- Mesmo código; ngrok só repassa o localhost
- Use `demo:full:ngrok` (produção), não `next dev` + túnel

### URL ngrok muda a cada execução

No plano gratuito, a URL muda quando você reinicia o ngrok. Envie a nova URL ao testador.

---

## Checklist rápido

- [ ] PostgreSQL rodando  
- [ ] `backend/.env` configurado  
- [ ] `ngrok config add-authtoken` feito  
- [ ] `npm run demo:full:ngrok` na raiz  
- [ ] URL copiada e enviada ao testador  
- [ ] Após mudanças no frontend: `npm run demo:build` antes de subir de novo  
