import { Module } from "@nestjs/common"

import { GamePlayersService } from "./game-players.service"
import { PrismaModule } from "../prisma/prisma.module"

@Module({
    imports: [PrismaModule],
    providers: [GamePlayersService],
    exports: [GamePlayersService],
})
export class GamePlayersModule {}
