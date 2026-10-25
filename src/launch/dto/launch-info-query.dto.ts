import { IsOptional, IsString, MaxLength } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class LaunchInfoQueryDto {
    @ApiPropertyOptional({ description: "Player ID on the social network" })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    player_id?: string

    @ApiPropertyOptional({ description: "Random number used by the client to avoid caching" })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    rsig?: string
}
