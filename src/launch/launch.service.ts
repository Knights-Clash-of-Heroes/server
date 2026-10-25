import { Injectable } from "@nestjs/common"

import { GamePlayersService } from "../game-players/game-players.service"
import { configHelper } from "../helpers/config.helper"

@Injectable()
export class LaunchService {
    constructor(private readonly gamePlayersService: GamePlayersService) {}

    async getLaunchInfo(platformId?: string) {
        const existing = platformId ? await this.gamePlayersService.exists(platformId) : false

        return {
            version: configHelper.game.gameVersion,
            client: configHelper.game.clientVersion,
            locale: configHelper.game.locale,
            dummy: 0,
            timeLeft: 0,
            isNewPlayer: !existing,
            patchRoot: {},
        }
    }
}
