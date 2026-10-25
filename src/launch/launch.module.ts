import { Module } from "@nestjs/common"

import { GamePlayersModule } from "../game-players/game-players.module"
import { LaunchController } from "./launch.controller"
import { LaunchService } from "./launch.service"

@Module({
    imports: [GamePlayersModule],
    controllers: [LaunchController],
    providers: [LaunchService],
})
export class LaunchModule {}
