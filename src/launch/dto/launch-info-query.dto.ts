import { IsOptional, IsString, MaxLength } from "class-validator"
import { ApiPropertyOptional } from "@nestjs/swagger"

export class LaunchInfoQueryDto {
    @ApiPropertyOptional({ description: "ID do jogador na rede social" })
    @IsOptional()
    @IsString()
    @MaxLength(64)
    player_id?: string

    @ApiPropertyOptional({ description: "Número aleatório usado pelo cliente para evitar cache" })
    @IsOptional()
    @IsString()
    @MaxLength(32)
    rsig?: string
}
