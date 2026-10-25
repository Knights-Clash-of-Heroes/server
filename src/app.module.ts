import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler"
import { ConfigModule } from "@nestjs/config"
import { APP_GUARD } from "@nestjs/core"
import { Module } from "@nestjs/common"

import { LaunchModule } from "./launch/launch.module"
import { UsersModule } from "./users/users.module"
import { GateModule } from "./gate/gate.module"
import { AuthModule } from "./auth/auth.module"
import { CdnModule } from "./cdn/cdn.module"

@Module({
    imports: [
        ThrottlerModule.forRoot({
            throttlers: [
                {
                    name: "short",
                    ttl: 1000,
                    limit: 3,
                },
                {
                    name: "long",
                    ttl: 60000,
                    limit: 100,
                },
            ],
        }),
        ConfigModule.forRoot({ isGlobal: true }),
        AuthModule,
        UsersModule,
        LaunchModule,
        CdnModule,
        GateModule,
    ],
    providers: [
        {
            provide: APP_GUARD,
            useClass: ThrottlerGuard,
        },
    ],
})
export class AppModule {}
