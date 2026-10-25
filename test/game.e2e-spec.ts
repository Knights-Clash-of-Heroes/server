import { Test, TestingModule } from "@nestjs/testing"
import { INestApplication } from "@nestjs/common"
import { App } from "supertest/types"
import * as request from "supertest"

import { inflateSync } from "node:zlib"
import { existsSync } from "node:fs"

import { GamePlayersService } from "../src/game-players/game-players.service"
import { GamePlayersModule } from "../src/game-players/game-players.module"
import { configHelper } from "../src/helpers/config.helper"
import { LaunchModule } from "../src/launch/launch.module"
import { GateModule } from "../src/gate/gate.module"
import { CdnModule } from "../src/cdn/cdn.module"
import { crc32 } from "../src/utils/crc32"

type StoredPlayer = {
    id: number
    platformId: string
    name: string
    sessionKey: string
    state: Record<string, unknown>
    createdAt: Date
    updatedAt: Date
}

class InMemoryGamePlayersService {
    private readonly players = new Map<string, StoredPlayer>()
    private nextId = 1
    private nextSession = 1

    async exists(platformId: string) {
        return this.players.has(platformId)
    }

    async findByPlatformId(platformId: string) {
        return this.players.get(platformId) || null
    }

    async findOrCreate(platformId: string, name: string) {
        const existing = this.players.get(platformId)

        if (existing) {
            return { player: existing, created: false }
        }

        const player: StoredPlayer = {
            id: this.nextId++,
            platformId: platformId,
            name: name,
            sessionKey: `session-${this.nextSession++}`,
            state: {
                ...configHelper.game.startingState,
                sync: 0,
                day: 1,
                maxSceneId: configHelper.game.firstSceneId,
                tutorial: 0,
                settings: {},
            },
            createdAt: new Date(),
            updatedAt: new Date(),
        }

        this.players.set(platformId, player)

        return { player: player, created: true }
    }

    async renewSession(player: StoredPlayer) {
        player.sessionKey = `session-${this.nextSession++}`

        return player
    }

    async saveState(player: StoredPlayer, state: Record<string, unknown>) {
        player.state = state

        return player
    }

    async remove(platformId: string) {
        this.players.delete(platformId)
    }

    readState(player: StoredPlayer) {
        return player.state
    }
}

function buildGateBody(playerId: string, type: string, data: Record<string, unknown>, gameId = 0) {
    const cmd = `Knights.${type}`
    const json = JSON.stringify(data)
    const sig = String(crc32(playerId + cmd + json))

    return { body: { cmd: cmd, pid: playerId, gid: String(gameId), sig: sig, data: json }, sig: sig }
}

function parseSignedResponse(playerId: string, requestSig: string, text: string) {
    const separator = text.indexOf("!")

    expect(separator).toBeGreaterThan(0)
    expect(separator).toBeLessThan(12)

    const body = text.slice(separator + 1)

    expect(String(crc32(playerId + requestSig + body))).toBe(text.slice(0, separator))

    return JSON.parse(body) as Record<string, any>
}

describe("Servidor do jogo (e2e)", () => {
    let app: INestApplication<App>
    const playerId = "100001234567890"

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [GamePlayersModule, LaunchModule, GateModule, CdnModule],
        })
            .overrideProvider(GamePlayersService)
            .useClass(InMemoryGamePlayersService)
            .compile()

        app = moduleFixture.createNestApplication()
        app.useGlobalPipes(configHelper.app.validationPipe)
        await app.init()
    })

    afterAll(async () => {
        await app.close()
    })

    it("get_launch_info.php informa a versão do cliente e jogador novo", async () => {
        const response = await request(app.getHttpServer())
            .get("/current/get_launch_info.php")
            .query({ player_id: playerId, rsig: "123" })
            .expect(200)

        expect(response.body).toMatchObject({
            version: configHelper.game.gameVersion,
            client: configHelper.game.clientVersion,
            locale: configHelper.game.locale,
            isNewPlayer: true,
            dummy: 0,
        })
    })

    it("rejeita requisição com assinatura inválida e assina o erro", async () => {
        const { body, sig } = buildGateBody(playerId, "initialize", {})
        const response = await request(app.getHttpServer())
            .post("/current/json-gate.php")
            .type("form")
            .send({ ...body, sig: "1" })
            .expect(200)

        const parsed = parseSignedResponse(playerId, "1", response.text)

        expect(parsed.error).toBe("#INCORRECT_REQUEST_SIGNATURE")
        expect(sig).not.toBe("1")
    })

    it("initialize cria o jogador e devolve o estado assinado", async () => {
        const { body, sig } = buildGateBody(playerId, "initialize", {
            authType: "social",
            authKey: "qualquer",
            userName: "Arthur Pendragon",
            newDay: false,
        })
        const response = await request(app.getHttpServer())
            .post("/current/json-gate.php")
            .type("form")
            .send(body)
            .expect(200)
        const parsed = parseSignedResponse(playerId, sig, response.text)

        expect(parsed.error).toBeUndefined()
        expect(parsed.new_player).toBe(true)
        expect(parsed.player.player_id).toBe(1)
        expect(parsed.player.level).toBe(1)
        expect(parsed.playerStats.userName).toBe("Arthur Pendragon")
        expect(typeof parsed.sessionKey).toBe("string")
        expect(typeof parsed.serverTime).toBe("number")
        expect(parsed.quests).toEqual({ active: {}, completed: {}, failed: {}, order: [] })
    })

    it("aceita doAction com a sessão correta e recusa sessão errada", async () => {
        const init = buildGateBody(playerId, "initialize", { userName: "Arthur Pendragon" })
        const initResponse = parseSignedResponse(
            playerId,
            init.sig,
            (await request(app.getHttpServer()).post("/current/json-gate.php").type("form").send(init.body)).text,
        )

        const good = buildGateBody(
            playerId,
            "doAction",
            { method: "syncPlayer", sessionKey: initResponse.sessionKey, ctr: 1 },
            1,
        )
        const goodResponse = await request(app.getHttpServer())
            .post("/current/json-gate.php")
            .type("form")
            .send(good.body)

        expect(parseSignedResponse(playerId, good.sig, goodResponse.text).player.player_id).toBe(1)

        const bad = buildGateBody(playerId, "doAction", { method: "syncPlayer", sessionKey: "errada", ctr: 2 }, 1)
        const badResponse = await request(app.getHttpServer())
            .post("/current/json-gate.php")
            .type("form")
            .send(bad.body)

        expect(parseSignedResponse(playerId, bad.sig, badResponse.text).error).toBe("#INVALID_SESSION")
    })

    it("doBatchAction responde cada item com a mesma chave", async () => {
        const init = buildGateBody(playerId, "initialize", {})
        const initResponse = parseSignedResponse(
            playerId,
            init.sig,
            (await request(app.getHttpServer()).post("/current/json-gate.php").type("form").send(init.body)).text,
        )

        const batch = buildGateBody(
            playerId,
            "doBatchAction",
            {
                batchlist: { "0": { method: "syncPlayer" }, "1": { method: "metodoDesconhecido" } },
                sessionKey: initResponse.sessionKey,
            },
            1,
        )
        const response = await request(app.getHttpServer()).post("/current/json-gate.php").type("form").send(batch.body)
        const parsed = parseSignedResponse(playerId, batch.sig, response.text)

        expect(Object.keys(parsed.batchResponse)).toEqual(["0", "1"])
        expect(parsed.batchResponse["0"].player.player_id).toBe(1)
        expect(parsed.batchResponse["1"]).toEqual({})
    })

    it("recusa comando sem o prefixo Knights.", async () => {
        const cmd = "Outro.initialize"
        const json = "{}"
        const sig = String(crc32(playerId + cmd + json))
        const response = await request(app.getHttpServer())
            .post("/current/json-gate.php")
            .type("form")
            .send({ cmd: cmd, pid: playerId, gid: "0", sig: sig, data: json })

        expect(parseSignedResponse(playerId, sig, response.text).error).toBe("#UNKNOWN_COMMAND")
    })

    it("serve crossdomain.xml permissivo", async () => {
        const response = await request(app.getHttpServer()).get("/crossdomain.xml").expect(200)

        expect(response.text).toContain("allow-access-from")
    })

    const hasCache = existsSync(configHelper.game.cacheDir)
    const cdnTest = hasCache ? it : it.skip

    cdnTest("o CDN serve o manifesto e o cliente recuperados", async () => {
        const { cdnPrefix, clientVersion, locale } = configHelper.game
        const manifestResponse = await request(app.getHttpServer())
            .get(`/cdn/${cdnPrefix}_${clientVersion}_${locale}_files`)
            .buffer(true)
            .parse((res, callback) => {
                const chunks: Buffer[] = []

                res.on("data", (chunk: Buffer) => chunks.push(chunk))
                res.on("end", () => callback(null, Buffer.concat(chunks)))
            })
            .expect(200)

        const manifest = JSON.parse(inflateSync(manifestResponse.body as Buffer).toString("utf-8"))

        expect(Object.keys(manifest.resources).length).toBeGreaterThan(18000)

        const swfResponse = await request(app.getHttpServer()).get(`/cdn/${cdnPrefix}_${clientVersion}.swf`).expect(200)

        expect(swfResponse.headers["content-type"]).toContain("application/x-shockwave-flash")
        await request(app.getHttpServer()).get("/cdn/recurso_inexistente").expect(404)
    })
})
