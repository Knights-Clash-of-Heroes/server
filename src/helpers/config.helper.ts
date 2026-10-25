import { ValidationPipe } from "@nestjs/common"
import { env } from "@marcuth/env"

import * as path from "node:path"

const isProduction = process.env.NODE_ENV === "production"

export const configHelper = {
    isProduction: isProduction,
    isDevelopment: !isProduction,
    app: {
        metadata: {
            name: "Bolierplate",
            version: "0.0.1",
        },
        port: process.env.PORT || 3003,
        validationPipe: new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        }),
        cors: {
            methods: "GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS",
            origin: env("CORS_ORIGIN", false) || true,
            credentials: true,
        },
    },
    pagination: {
        minPage: 1,
        defaultPage: 1,
        minPerPage: 2,
        defaultPerPage: 20,
        maxPerPage: 50,
    },
    users: {
        apiKey: {
            prefix: "dev_",
            randomCharsLength: 32,
        },
        minNameLength: 3,
        maxNameLength: 100,
        minUsernameLength: 4,
        maxUsernameLength: 16,
        maxEmailLength: 150,
        generatedUsernameLength: 8,
    },
    game: {
        routePrefix: "current",
        gameVersion: 1703,
        clientVersion: "1703",
        cdnPrefix: "game",
        firstSceneId: 100000,
        locale: "Portuguese",
        buildSecret: env("GAME_BUILD_SECRET", false) || "f4c24909c0b8a8338713799583167548",
        cacheDir: env("GAME_CACHE_DIR", false) || path.resolve(process.cwd(), "..", "recovery", "gameroom-cache"),
        gameSwfFile: env("GAME_SWF_FILE", false) || "f_0000a9",
        manifestFile: env("GAME_MANIFEST_FILE", false) || "f_0000aa",
        startingState: {
            level: 1,
            experience: 0,
            money: 1000,
            cash: 10,
            wood: 500,
            stone: 500,
            iron: 500,
            energy: 20,
            population: 10,
        },
    },
}
