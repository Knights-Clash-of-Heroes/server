import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class GateRequestDto {
    @ApiProperty({ example: "Knights.initialize", description: "Prefixo Knights. seguido do tipo da mensagem" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    cmd!: string

    @ApiProperty({ description: "ID do jogador na rede social" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    pid!: string

    @ApiPropertyOptional({ description: "ID do jogo (player_id devolvido pelo initialize)" })
    @IsOptional()
    @IsNumberString()
    gid?: string

    @ApiProperty({ description: "CRC32 decimal de pid + cmd + data" })
    @IsNumberString()
    sig!: string

    @ApiProperty({ description: "Corpo da mensagem em JSON" })
    @IsString()
    @IsNotEmpty()
    data!: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    XDEBUG_PROFILE?: string
}
