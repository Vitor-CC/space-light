# Publicar a Space Light na Vercel (com Turso) — Locaweb só para domínio e e-mail

> Guia prático — deploy da aplicação Next.js na **Vercel**, banco no **Turso**,
> mantendo a **Locaweb** apenas para o domínio e o e-mail corporativo.

## Como fica a arquitetura

```text
Visitante
   │  https://www.spacelightengenharia.com.br
   ▼
Vercel  ──►  aplicação Next.js (site + portais + API)
   │
   └──►  Turso (banco de dados SQLite na nuvem)

Locaweb  ──►  continua com o DOMÍNIO (DNS) e o E-MAIL (MX/SPF) — nada muda no e-mail
```

- **Vercel:** roda a aplicação, gera HTTPS automático, faz deploy a cada push no GitHub.
- **Turso:** guarda todos os dados (clientes, instrutores, treinamentos, certificados…).
- **Locaweb:** só aponta o domínio para a Vercel. **Os registros de e-mail não são tocados.**

## O que já foi adaptado no código

Estas mudanças já estão feitas no projeto (você não precisa mexer):

- Novo motor de banco compatível com serverless: `db/libsql-adapter.ts` (Turso/libSQL).
- Seleção automática do banco em `db/index.ts`: usa **Turso** quando `TURSO_DATABASE_URL`
  está definida; caso contrário, **SQLite local** (para desenvolvimento).
- `better-sqlite3` passou a ser carregado de forma preguiçosa (nunca é carregado na Vercel).
- `@libsql/client` adicionado ao `package.json`.
- Script para gerar as credenciais do admin: `scripts/generate-admin-credentials.mjs`.
- Modelo de variáveis: `.env.example`.

As **tabelas do banco se criam sozinhas** no primeiro acesso (o código roda
`CREATE TABLE IF NOT EXISTS`), então **não há passo de migração manual**.

---

## Pré-requisitos (contas)

Todas gratuitas para começar, mas o cadastro costuma pedir **cartão de crédito internacional**:

- [ ] Conta no **GitHub** (para hospedar o código).
- [ ] Conta na **Vercel** (login com o GitHub facilita).
- [ ] Conta no **Turso** (https://turso.tech).
- [ ] Acesso ao painel de **DNS do domínio** na Locaweb.

---

## Passo 1 — Criar o banco no Turso

**Pelo site (mais simples):**

1. Acesse https://turso.tech e crie a conta.
2. Crie um banco (Database). Escolha a região mais próxima do Brasil
   (ex.: `gru` / São Paulo, se disponível).
3. Copie a **Database URL** (algo como `libsql://space-light-xxxx.turso.io`).
4. Gere um **token de acesso** (Auth Token) e copie o valor.

**Ou pelo terminal (Turso CLI):**

```bash
turso db create space-light --location gru
turso db show space-light --url
turso db tokens create space-light
```

Guarde os dois valores (URL e token) — eles viram variáveis de ambiente na Vercel.

---

## Passo 2 — Enviar o código para o GitHub

O projeto já é um repositório git, mas o `origin` atual aponta para o ambiente de
origem (OpenAI Sites). Vamos criar um repositório **privado** no GitHub e enviar para lá.

1. No GitHub, crie um repositório **privado** (ex.: `space-light`), sem README.
2. No computador, dentro da pasta `site/`:

```bash
git remote rename origin origem-antiga
git remote add origin https://github.com/SEU-USUARIO/space-light.git
git add .
git commit -m "Adapta o banco para Turso/libSQL (deploy na Vercel)"
git push -u origin main
```

> O `.gitignore` já impede o envio de `node_modules`, `.env*`, `.dev.vars`, `data/` e
> arquivos de build. Confirme que **nenhum segredo** (senhas, tokens) foi para o commit.

---

## Passo 3 — Importar o projeto na Vercel

1. Na Vercel, clique em **Add New… → Project** e selecione o repositório do GitHub.
2. Em **Root Directory**, escolha a pasta **`site`** (o app não está na raiz do repo).
3. Framework: a Vercel detecta **Next.js** automaticamente. Não mude os comandos de build.
4. **Ainda não clique em Deploy** — primeiro configure as variáveis (Passo 4).

---

## Passo 4 — Configurar as variáveis de ambiente na Vercel

Em **Settings → Environment Variables**, adicione (ambiente **Production** e **Preview**):

| Variável | Valor |
|---|---|
| `TURSO_DATABASE_URL` | a URL do Passo 1 (`libsql://…`) |
| `TURSO_AUTH_TOKEN` | o token do Passo 1 |
| `AUTH_SESSION_SECRET` | um segredo longo e aleatório (gere um novo para produção) |
| `SPACE_ADMIN_EMAIL` | e-mail do administrador (ex.: `gestao@spacelightengenharia.com.br`) |
| `SPACE_ADMIN_PASSWORD_HASH` | gerado pelo script abaixo |
| `SPACE_ADMIN_PASSWORD_SALT` | gerado pelo script abaixo |

### Gerar o hash/salt da senha do admin

Na pasta `site/`, rode (troque pela senha real, forte):

```bash
node scripts/generate-admin-credentials.mjs "SuaSenhaForteAqui"
```

Copie `SPACE_ADMIN_PASSWORD_HASH` e `SPACE_ADMIN_PASSWORD_SALT` impressos para a Vercel.
**Nunca** coloque a senha em texto puro no código ou no repositório.

### Gerar o AUTH_SESSION_SECRET

Qualquer string longa e aleatória serve. Exemplo:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

---

## Passo 5 — Primeiro deploy e verificação

1. Clique em **Deploy**. Aguarde o build terminar.
2. Abra a URL provisória da Vercel (`https://space-light-xxxx.vercel.app`).
3. Verifique:
   - a **home** carrega;
   - faça login com o admin em `/empresa` (ou pela tela de login) → deve entrar;
   - o primeiro acesso do admin deve pedir **troca de senha**.
4. Se algo falhar, veja **Deployments → (o deploy) → Logs** na Vercel.

> As tabelas são criadas automaticamente no primeiro acesso ao banco. Não é preciso
> rodar migração.

---

## Passo 6 — Apontar o domínio da Locaweb para a Vercel

> ⚠️ **Não altere registros MX, SPF, DKIM ou DMARC.** Eles controlam o e-mail e devem
> permanecer como estão na Locaweb.

1. Na Vercel: **Settings → Domains → Add** e informe `www.spacelightengenharia.com.br`
   (e também o domínio “nu” `spacelightengenharia.com.br`). A Vercel mostrará os
   registros DNS que você precisa criar.
2. No painel de **DNS da Locaweb**, crie **apenas**:
   - registro **CNAME** para `www` apontando para `cname.vercel-dns.com` (valor exato
     que a Vercel indicar); e
   - para o domínio nu (apex), o registro **A** (ou ALIAS/ANAME) que a Vercel indicar.
3. Aguarde a propagação (minutos a algumas horas).
4. A Vercel emite o **HTTPS** automaticamente quando o DNS estiver correto.
5. Depois de funcionar, atualize `APP_URL` (se usada) e reteste login e cadastros.

---

## Passo 7 — Checklist antes de divulgar

- [ ] Home abre em HTTPS no domínio final.
- [ ] Imagens e menus funcionam; versão mobile ok.
- [ ] Admin entra em `/empresa`; cliente não consegue abrir `/empresa`.
- [ ] Cadastro de cliente fica **pendente** e só entra após aprovação.
- [ ] Instrutor consegue se cadastrar e acessar `/instrutor`.
- [ ] QR Code de treinamento leva à página de participação correta.
- [ ] E-mail corporativo continua funcionando (envie e receba um teste).
- [ ] Nenhum segredo aparece no repositório ou nos logs.

---

## Desenvolvimento local (continua igual)

Sem `TURSO_DATABASE_URL`, o app usa um arquivo SQLite local automaticamente:

```bash
pnpm install
pnpm dev
```

Para testar **contra o Turso** localmente, crie um `.env.local` a partir do
`.env.example` e preencha `TURSO_DATABASE_URL` e `TURSO_AUTH_TOKEN`.

---

## Pontos de atenção / próximos passos

- **Upload de arquivos (documentos e certificados):** hoje o app só grava *metadados*.
  Quando o upload real for implementado, na Vercel isso deve usar **Vercel Blob** (ou
  um S3/R2) — o disco da Vercel é efêmero e não serve para guardar arquivos.
- **Backups do Turso:** o Turso mantém histórico/point-in-time nos planos pagos.
  Vale configurar/backup periódico quando houver dados reais.
- **Se o build da Vercel falhar ao compilar `better-sqlite3`:** ele não é usado em
  produção; se necessário, movê-lo de `dependencies` para `optionalDependencies`
  resolve, mantendo o desenvolvimento local funcionando.
