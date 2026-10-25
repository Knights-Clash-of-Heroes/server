import { Injectable } from "@nestjs/common"

import { randomBytes } from "node:crypto"

import { InputJsonObject } from "../generated/prisma/internal/prismaNamespace"
import { GamePlayerState } from "./entities/game-player-state.entity"
import { PrismaService } from "../prisma/prisma.service"
import { GamePlayer } from "../generated/prisma/client"
import { configHelper } from "../helpers/config.helper"

const secondsPerDay = 86400

@Injectable()
export class GamePlayersService {
    constructor(private readonly prismaService: PrismaService) {}

    async exists(platformId: string) {
        const count = await this.prismaService.gamePlayer.count({ where: { platformId: platformId } })

        return count > 0
    }

    async findByPlatformId(platformId: string) {
        return await this.prismaService.gamePlayer.findUnique({ where: { platformId: platformId } })
    }

    async findOrCreate(platformId: string, name: string) {
        const existing = await this.findByPlatformId(platformId)

        if (existing) {
            return { player: existing, created: false }
        }

        const player = await this.prismaService.gamePlayer.create({
            data: {
                platformId: platformId,
                name: name,
                sessionKey: this.generateSessionKey(),
                state: this.toJson(this.createInitialState()),
            },
        })

        return { player: player, created: true }
    }

    async renewSession(player: GamePlayer) {
        return await this.prismaService.gamePlayer.update({
            where: { id: player.id },
            data: { sessionKey: this.generateSessionKey() },
        })
    }

    async saveState(player: GamePlayer, state: GamePlayerState) {
        return await this.prismaService.gamePlayer.update({
            where: { id: player.id },
            data: { state: this.toJson(state) },
        })
    }

    async remove(platformId: string) {
        await this.prismaService.gamePlayer.deleteMany({ where: { platformId: platformId } })
    }

    readState(player: GamePlayer) {
        return player.state as unknown as GamePlayerState
    }

    private toJson(state: GamePlayerState) {
        return state as unknown as InputJsonObject
    }

    private createInitialState(): GamePlayerState {
        return {
            ...configHelper.game.startingState,
            sync: 0,
            day: Math.floor(Date.now() / 1000 / secondsPerDay),
            maxSceneId: configHelper.game.firstSceneId,
            tutorial: 0,
            settings: {},
        }
    }

    private generateSessionKey() {
        return randomBytes(16).toString("hex")
    }
}
