# Servidor do Knights

🇺🇸 [English](./README.md) · 🇧🇷 Português

Servidor mínimo que emula o backend do cliente Flash do jogo *Knights*. Serve os arquivos recuperados do jogo (CDN), responde ao gateway assinado do cliente e persiste o estado dos jogadores.

Construído sobre o template `backend-simple-app` (NestJS 11, Prisma 7, SQLite). O protocolo está documentado em `../recovery/PROTOCOLO.md`.

## Sumário

- [Stack](#stack)
- [Requisitos](#requisitos)
- [Início rápido](#início-rápido)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Endpoints](#endpoints)
- [Abrir o cliente](#abrir-o-cliente)
- [Estrutura do projeto](#estrutura-do-projeto)
- [Banco de dados](#banco-de-dados)
- [Scripts](#scripts)
- [Testes](#testes)
- [Deploy com Docker](#deploy-com-docker)
- [Estado atual](#estado-atual)

## Stack

- **Framework:** NestJS 11 (Express), TypeScript
- **Banco:** Prisma 7 com SQLite (`better-sqlite3`); PostgreSQL opcional
- **Segurança:** Helmet, CORS, rate limit (`@nestjs/throttler`)
- **Docs:** Swagger (apenas em desenvolvimento)
- **Testes:** Jest + Supertest

## Requisitos

- Node.js 20+
- npm
- Arquivos recuperados do jogo em `../recovery/gameroom-cache`

## Início rápido

```bash
npm install
cp .env.example .env     # ajuste os valores, principalmente os segredos
npm run db:generate
npm run db:migrate
npm run dev
```

O servidor sobe na porta **3003**. Em desenvolvimento, o Swagger fica em <http://localhost:3003/docs> (`npm run open-docs`).

Na subida, o servidor calcula o md5 de cada arquivo de `GAME_CACHE_DIR` e cruza com o manifesto. O log mostra quantos dos 18.529 recursos ele consegue servir.

## Variáveis de ambiente

Use `.env.example` como base. Troque todos os segredos antes de expor o servidor.

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Conexão do banco. SQLite: `file:./prisma/dev.db`. PostgreSQL: `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_PRIVATE_KEY` | Chave de assinatura dos JWT |
| `ACCESS_SIGN_EXPIRES_IN` / `REFRESH_SIGN_EXPIRES_IN` | Validade dos tokens de acesso e refresh (ex.: `7d`, `30d`) |
| `BCRYPT_SALT_ROUNDS` | Rounds do bcrypt para senhas |
| `ENCRYPTION_ALGORITHM` / `ENCRYPTION_KEY` / `ENCRYPTION_IV` | Parâmetros da criptografia de dados |
| `ADMIN_DEFAULT_*` | Usuário admin criado pelo seed (`USERNAME`, `EMAIL`, `API_KEY`, `NAME`, `PASSWORD`) |
| `GAME_CACHE_DIR` | Pasta com os arquivos recuperados (`../recovery/gameroom-cache`) |
| `GAME_SWF_FILE` | Arquivo do cliente SWF dentro do cache (`f_0000a9`) |
| `GAME_MANIFEST_FILE` | Arquivo do manifesto de recursos (`f_0000aa`) |
| `GAME_BUILD_SECRET` | Segredo usado na assinatura (`crc!json`) do gateway |

> Em Docker, o caminho do SQLite é `file:./prisma/dev.db`; localmente, fora do Docker, pode ser necessário `file:../prisma/dev.db`.

## Endpoints

| Rota | Função |
|---|---|
| `GET /current/get_launch_info.php` | Versão do cliente (`1703`), idioma (`Portuguese`) e `isNewPlayer` |
| `POST /current/json-gate.php` | Gateway assinado (`crc!json`): `initialize`, `doAction`, `doBatchAction` e demais tipos |
| `GET /current/get_dummy.php`, `POST /current/track_visit.php`, `POST /current/statistics.php` | Respostas triviais |
| `GET /cdn/:nome_md5` | Arquivos recuperados. `game_1703.swf` e `game_1703_Portuguese_files` são mapeados para o cliente e o manifesto |
| `GET /cdn-stats` | Quantos recursos existem entre os que o manifesto lista |
| `GET /crossdomain.xml` | Política aberta para o Flash |

As rotas do jogo ignoram o limite de requisições (`SkipAllThrottle`), porque o cliente faz várias chamadas por segundo. As demais seguem o limite global (3 req/s e 100 req/min).

### Tipos do gateway

| Tipo | Comportamento |
|---|---|
| `initialize` | Cria ou recupera o jogador, renova a `sessionKey` e devolve o estado completo |
| `doAction` | Executa `syncPlayer`/`refresh` e `saveSettings`; outros métodos viram log |
| `doBatchAction` | Executa várias `doAction` em sequência |
| `friendsGetInfo` | Lista vazia de amigos |
| `doFriendAction`, `doClanAction`, `globalMap` | Não implementados: respondem `{}` |
| `breakMeCompletely` | Remove o jogador |

Erros do gateway: `#PLAYER_NOT_FOUND`, `#INVALID_SESSION` e `#UNKNOWN_MESSAGE_TYPE`.

## Abrir o cliente

O cliente lê os parâmetros da página (flashvars). Valores para apontar para este servidor:

| Parâmetro | Valor |
|---|---|
| `server` | `http://localhost:3003/current/` |
| `cdn` | `http://localhost:3003/cdn/` |
| `platform` | `sandbox` |
| `userID` | Qualquer número, ex.: `1001` |

O jogo usa Stage3D, que o Ruffle não implementa. É preciso o Flash Player standalone (projector), que aceita os parâmetros na query:

```
flashplayer.exe "http://localhost:3003/cdn/game_1703.swf?server=http://localhost:3003/current/&cdn=http://localhost:3003/cdn/&platform=sandbox&userID=1001"
```

## Estrutura do projeto

```
src/
├── main.ts              # bootstrap: body parser, helmet, CORS, Swagger (dev)
├── app.module.ts        # módulos e throttler global
├── gate/                # gateway json-gate.php: assinatura, ações, erros
├── game-players/        # persistência e sessão dos jogadores
├── launch/              # get_launch_info.php e rotas triviais
├── cdn/                 # serve os arquivos recuperados e o manifesto
├── auth/                # JWT, API key, login local, roles (template)
├── users/               # CRUD de usuários (template)
├── crypto/              # criptografia de dados
├── prisma/              # PrismaService
├── common/              # decorators, guards, pipes
├── helpers/             # config, mensagens, regex
├── utils/               # CRC32, geração de API key e username
└── generated/prisma/    # cliente Prisma gerado (não editar)
prisma/                  # schema, migrations e seed
test/                    # testes e2e do jogo
```

## Banco de dados

Modelos principais (`prisma/schema.prisma`):

- **`User`**: usuários da API administrativa (`ADMIN` | `USER`), com e-mail, username, API key e senha.
- **`GamePlayer`**: jogador do jogo, identificado por `platformId` (o `userID` do cliente), com `sessionKey` e `state` em JSON (recursos, nível, configurações etc.).

Comandos:

```bash
npm run db:generate   # gera o cliente Prisma em src/generated/prisma
npm run db:migrate    # aplica migrations (dev)
npm run db:studio     # interface visual
npm run db:seed       # cria o admin padrão
```

Para usar PostgreSQL, troque o `provider` em `prisma/schema.prisma` para `postgresql` e ajuste `DATABASE_URL`.

## Scripts

| Script | Descrição |
|---|---|
| `npm run dev` / `start:dev` | Modo watch |
| `npm run start` | Inicia sem watch |
| `npm run start:prod` | Roda o build (`node dist/main`) |
| `npm run build` | Compila para `dist/` |
| `npm run lint` | ESLint com correção automática |
| `npm run format` | Prettier |

## Testes

```bash
npm run test        # unitários (inclui CRC32)
npm run test:e2e    # transporte, sessão, batch e CDN
npm run test:cov    # cobertura
```

Os testes simulam o cliente usando a mesma assinatura do código decompilado.

## Deploy com Docker

```bash
cp .env.example .env
docker-compose up -d --build
```

Sobe a API na porta `3003` com o SQLite persistido em `./prisma` (volume). O `docker-compose.yml` traz um bloco comentado para PostgreSQL.

O container precisa enxergar `GAME_CACHE_DIR`. Monte a pasta de arquivos recuperados como volume e ajuste o caminho no `.env`.

## Estado atual

- **Implementado:** transporte assinado, `initialize` (jogador novo com recursos iniciais), `syncPlayer`/`refresh`, `saveSettings`, lote de ações, sessão por jogador e persistência em SQLite.
- **Modo descoberta:** qualquer outra ação responde `{}` e registra no log `Ação não implementada: doAction.<nome> <dados>`. Ao rodar o cliente, isso mostra quais ações ele realmente chama e com quais parâmetros.
- **Valores iniciais** (`configHelper.game.startingState`) e `maxSceneId` (100000) são estimativas, porque o balanceamento original não existe no cliente.
- **Não testado com o cliente real.**
