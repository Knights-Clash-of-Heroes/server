import { Injectable, Logger } from "@nestjs/common"

import { GamePlayersService } from "../game-players/game-players.service"
import { GameActionMethod, GateActionType } from "./gate-action.enum"
import { GamePlayer } from "../generated/prisma/client"
import { GateError } from "./gate.error"

type ActionData = Record<string, unknown>
type ActionResult = Record<string, unknown>

@Injectable()
export class GateActionsService {
    private readonly logger = new Logger(GateActionsService.name)

    constructor(private readonly gamePlayersService: GamePlayersService) {}

    async execute(type: string, platformId: string, data: ActionData): Promise<ActionResult> {
        if (type === GateActionType.Initialize) {
            return await this.initialize(platformId, data)
        }

        const player = await this.requirePlayer(platformId, data)

        switch (type) {
            case GateActionType.DoAction:
                return await this.doAction(platformId, data)
            case GateActionType.DoBatchAction:
                return await this.doBatchAction(platformId, data)
            case GateActionType.FriendsGetInfo:
                return { list: {} }
            case GateActionType.DoFriendAction:
            case GateActionType.DoClanAction:
            case GateActionType.GlobalMap:
                this.logNotImplemented(type, data)
                return {}
            case GateActionType.BreakMeCompletely:
                await this.gamePlayersService.remove(player.platformId)
                return {}
            default:
                throw new GateError("#UNKNOWN_MESSAGE_TYPE")
        }
    }

    private async initialize(platformId: string, data: ActionData): Promise<ActionResult> {
        const userName = typeof data.userName === "string" && data.userName ? data.userName : `Jogador ${platformId}`
        const { player: found, created } = await this.gamePlayersService.findOrCreate(platformId, userName)
        const player = await this.gamePlayersService.renewSession(found)

        return {
            sessionKey: player.sessionKey,
            new_player: created,
            ...this.buildStateBlocks(player),
            inventory: {},
            recipes: {},
            unlocks: {},
            researches: {},
            missions: {},
            pveMissions: {},
            deadUnits: {},
            interaction: {},
            globalRecipes: { today: {}, total: {} },
            heroes: {},
            payments: {},
            paymentsLog: [],
            clientVars: {},
            settings: this.gamePlayersService.readState(player).settings,
            dailyBonus: { day: 0 },
            quests: { active: {}, completed: {}, failed: {}, order: [] },
        }
    }

    private async doBatchAction(platformId: string, data: ActionData): Promise<ActionResult> {
        const batchList = (data.batchlist || {}) as Record<string, ActionData>
        const batchResponse: Record<string, ActionResult> = {}

        for (const key of Object.keys(batchList)) {
            batchResponse[key] = await this.doAction(platformId, batchList[key])
        }

        return { batchResponse: batchResponse }
    }

    private async doAction(platformId: string, data: ActionData): Promise<ActionResult> {
        const player = await this.requirePlayer(platformId)
        const method = String(data.method)

        switch (method) {
            case GameActionMethod.SyncPlayer:
            case GameActionMethod.Refresh:
                return this.buildStateBlocks(player)
            case GameActionMethod.SaveSettings:
                return await this.saveSettings(player, data)
            default:
                this.logNotImplemented(`doAction.${method}`, data)
                return {}
        }
    }

    private async saveSettings(player: GamePlayer, data: ActionData): Promise<ActionResult> {
        const state = this.gamePlayersService.readState(player)
        const incoming = data.data && typeof data.data === "object" ? (data.data as Record<string, unknown>) : {}

        await this.gamePlayersService.saveState(player, { ...state, settings: { ...state.settings, ...incoming } })

        return {}
    }

    private buildStateBlocks(player: GamePlayer): ActionResult {
        const state = this.gamePlayersService.readState(player)

        return {
            player: {
                player_id: player.id,
                sync: state.sync,
                level: state.level,
                experience: state.experience,
                power: 0,
                epower: 0,
                money: state.money,
                cash: state.cash,
                wood: state.wood,
                stone: state.stone,
                iron: state.iron,
                energy: state.energy,
                energyRestore: 0,
                population: state.population,
                adInfo: null,
            },
            storage: {
                wood: state.wood,
                stone: state.stone,
                iron: state.iron,
                population: state.population,
            },
            playerStats: {
                isPayingUser: false,
                maxSceneId: state.maxSceneId,
                tutorial: state.tutorial,
                day: state.day,
                creationDate: Math.floor(player.createdAt.getTime() / 1000),
                dayHourReset: 0,
                newDay: 0,
                userName: player.name,
                platform: "facebook",
                chatAuth: "",
                globalChatAuth: "",
                cscAuth: "",
                lastOnline: Math.floor(player.updatedAt.getTime() / 1000),
            },
        }
    }

    private async requirePlayer(platformId: string, data?: ActionData) {
        const player = await this.gamePlayersService.findByPlatformId(platformId)

        if (!player) {
            throw new GateError("#PLAYER_NOT_FOUND")
        }

        if (data && data.sessionKey !== player.sessionKey) {
            throw new GateError("#INVALID_SESSION")
        }

        return player
    }

    private logNotImplemented(name: string, data: ActionData) {
        this.logger.warn(`Ação não implementada: ${name} ${JSON.stringify(data)}`)
    }
}
