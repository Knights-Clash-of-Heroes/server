# Knights Server

🇺🇸 English · 🇧🇷 [Português](./README.pt-br.md)

Minimal server that emulates the backend of the *Knights* Flash game client. It serves the recovered game files (CDN), answers the client's signed gateway and persists player state.

Built on the `backend-simple-app` template (NestJS 11, Prisma 7, SQLite). The protocol is documented in `../recovery/PROTOCOLO.md`.

## Table of contents

- [Stack](#stack)
- [Requirements](#requirements)
- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Endpoints](#endpoints)
- [Opening the client](#opening-the-client)
- [Project structure](#project-structure)
- [Database](#database)
- [Scripts](#scripts)
- [Tests](#tests)
- [Docker deployment](#docker-deployment)
- [Current status](#current-status)

## Stack

- **Framework:** NestJS 11 (Express), TypeScript
- **Database:** Prisma 7 with SQLite (`better-sqlite3`); PostgreSQL optional
- **Security:** Helmet, CORS, rate limiting (`@nestjs/throttler`)
- **Docs:** Swagger (development only)
- **Tests:** Jest + Supertest

## Requirements

- Node.js 20+
- npm
- Recovered game files in `../recovery/gameroom-cache`

## Quick start

```bash
npm install
cp .env.example .env     # adjust the values, especially the secrets
npm run db:generate
npm run db:migrate
npm run dev
```

The server listens on port **3003**. In development, Swagger is available at <http://localhost:3003/docs> (`npm run open-docs`).

On startup the server computes the md5 of every file in `GAME_CACHE_DIR` and matches it against the manifest. The log shows how many of the 18,529 resources it can serve.

## Environment variables

Use `.env.example` as a base. Change every secret before exposing the server.

| Variable | Description |
|---|---|
| `DATABASE_URL` | Database connection. SQLite: `file:./prisma/dev.db`. PostgreSQL: `postgresql://user:pass@host:5432/db?schema=public` |
| `JWT_PRIVATE_KEY` | JWT signing key |
| `ACCESS_SIGN_EXPIRES_IN` / `REFRESH_SIGN_EXPIRES_IN` | Access and refresh token lifetimes (e.g. `7d`, `30d`) |
| `BCRYPT_SALT_ROUNDS` | bcrypt rounds for passwords |
| `ENCRYPTION_ALGORITHM` / `ENCRYPTION_KEY` / `ENCRYPTION_IV` | Data encryption parameters |
| `ADMIN_DEFAULT_*` | Admin user created by the seed (`USERNAME`, `EMAIL`, `API_KEY`, `NAME`, `PASSWORD`) |
| `GAME_CACHE_DIR` | Folder with the recovered files (`../recovery/gameroom-cache`) |
| `GAME_SWF_FILE` | Client SWF file inside the cache (`f_0000a9`) |
| `GAME_MANIFEST_FILE` | Resource manifest file (`f_0000aa`) |
| `GAME_BUILD_SECRET` | Secret used for the gateway signature (`crc!json`) |

> In Docker the SQLite path is `file:./prisma/dev.db`; locally, outside Docker, you may need `file:../prisma/dev.db`.

## Endpoints

| Route | Purpose |
|---|---|
| `GET /current/get_launch_info.php` | Client version (`1703`), language (`Portuguese`) and `isNewPlayer` |
| `POST /current/json-gate.php` | Signed gateway (`crc!json`): `initialize`, `doAction`, `doBatchAction` and the other types |
| `GET /current/get_dummy.php`, `POST /current/track_visit.php`, `POST /current/statistics.php` | Trivial responses |
| `GET /cdn/:name_md5` | Recovered files. `game_1703.swf` and `game_1703_Portuguese_files` are mapped to the client and the manifest |
| `GET /cdn-stats` | How many resources exist out of those listed in the manifest |
| `GET /crossdomain.xml` | Open policy for Flash |

The game routes skip the rate limit (`SkipAllThrottle`) because the client makes several calls per second. The other routes follow the global limit (3 req/s and 100 req/min).

### Gateway types

| Type | Behavior |
|---|---|
| `initialize` | Creates or loads the player, renews the `sessionKey` and returns the full state |
| `doAction` | Runs `syncPlayer`/`refresh` and `saveSettings`; other methods are only logged |
| `doBatchAction` | Runs several `doAction` calls in sequence |
| `friendsGetInfo` | Empty friends list |
| `doFriendAction`, `doClanAction`, `globalMap` | Not implemented: respond `{}` |
| `breakMeCompletely` | Removes the player |

Gateway errors: `#PLAYER_NOT_FOUND`, `#INVALID_SESSION` and `#UNKNOWN_MESSAGE_TYPE`.

## Opening the client

The client reads the page parameters (flashvars). Values to point it at this server:

| Parameter | Value |
|---|---|
| `server` | `http://localhost:3003/current/` |
| `cdn` | `http://localhost:3003/cdn/` |
| `platform` | `sandbox` |
| `userID` | Any number, e.g. `1001` |

The game uses Stage3D, which Ruffle does not implement. You need the standalone Flash Player (projector), which accepts the parameters in the query string:

```
flashplayer.exe "http://localhost:3003/cdn/game_1703.swf?server=http://localhost:3003/current/&cdn=http://localhost:3003/cdn/&platform=sandbox&userID=1001"
```

## Project structure

```
src/
├── main.ts              # bootstrap: body parser, helmet, CORS, Swagger (dev)
├── app.module.ts        # modules and global throttler
├── gate/                # json-gate.php gateway: signature, actions, errors
├── game-players/        # player persistence and session
├── launch/              # get_launch_info.php and trivial routes
├── cdn/                 # serves the recovered files and the manifest
├── auth/                # JWT, API key, local login, roles (template)
├── users/               # user CRUD (template)
├── crypto/              # data encryption
├── prisma/              # PrismaService
├── common/              # decorators, guards, pipes
├── helpers/             # config, messages, regex
├── utils/               # CRC32, API key and username generation
└── generated/prisma/    # generated Prisma client (do not edit)
prisma/                  # schema, migrations and seed
test/                    # game e2e tests
```

## Database

Main models (`prisma/schema.prisma`):

- **`User`**: users of the admin API (`ADMIN` | `USER`), with email, username, API key and password.
- **`GamePlayer`**: game player identified by `platformId` (the client's `userID`), with a `sessionKey` and a JSON `state` (resources, level, settings, etc.).

Commands:

```bash
npm run db:generate   # generates the Prisma client in src/generated/prisma
npm run db:migrate    # applies migrations (dev)
npm run db:studio     # visual interface
npm run db:seed       # creates the default admin
```

To use PostgreSQL, change the `provider` in `prisma/schema.prisma` to `postgresql` and adjust `DATABASE_URL`.

## Scripts

| Script | Description |
|---|---|
| `npm run dev` / `start:dev` | Watch mode |
| `npm run start` | Start without watch |
| `npm run start:prod` | Run the build (`node dist/main`) |
| `npm run build` | Compile to `dist/` |
| `npm run format` / `format:check` | Prettier (write / check) |
| `npm run lint` | ESLint with auto-fix |

## Tests

```bash
npm run test        # unit tests (includes CRC32)
npm run test:e2e    # transport, session, batch and CDN
npm run test:cov    # coverage
```

The tests simulate the client using the same signature as the decompiled code. The e2e tests need the recovered files from `../recovery`, so they do not run in CI; the GitHub Actions workflow runs formatting, build and unit tests.

## Docker deployment

```bash
cp .env.example .env
docker-compose up -d --build
```

This starts the API on port `3003` with SQLite persisted in `./prisma` (volume). `docker-compose.yml` includes a commented-out PostgreSQL block.

The container must be able to see `GAME_CACHE_DIR`. Mount the recovered files folder as a volume and adjust the path in `.env`.

## Current status

- **Implemented:** signed transport, `initialize` (new player with starting resources), `syncPlayer`/`refresh`, `saveSettings`, batch actions, per-player session and SQLite persistence.
- **Discovery mode:** any other action responds `{}` and logs `Action not implemented: doAction.<name> <data>`. Running the client shows which actions it really calls and with which parameters.
- **Starting values** (`configHelper.game.startingState`) and `maxSceneId` (100000) are estimates, because the original balancing does not exist in the client.
- **Not tested with the real client.**
