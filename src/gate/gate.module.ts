import { Module } from "@nestjs/common"

import { GamePlayersModule } from "../game-players/game-players.module"
import { GateActionsService } from "./gate-actions.service"
import { GateController } from "./gate.controller"
import { GateService } from "./gate.service"

@Module({
    imports: [GamePlayersModule],
    controllers: [GateController],
    providers: [GateService, GateActionsService],
})
export class GateModule {}
