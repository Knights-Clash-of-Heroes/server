import { IsNotEmpty, IsNumberString, IsOptional, IsString, MaxLength } from "class-validator"
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger"

export class GateRequestDto {
    @ApiProperty({ example: "Knights.initialize", description: "Knights. prefix followed by the message type" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    cmd!: string

    @ApiProperty({ description: "Player ID on the social network" })
    @IsString()
    @IsNotEmpty()
    @MaxLength(64)
    pid!: string

    @ApiPropertyOptional({ description: "Game ID (player_id returned by initialize)" })
    @IsOptional()
    @IsNumberString()
    gid?: string

    @ApiProperty({ description: "Decimal CRC32 of pid + cmd + data" })
    @IsNumberString()
    sig!: string

    @ApiProperty({ description: "Message body as JSON" })
    @IsString()
    @IsNotEmpty()
    data!: string

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    XDEBUG_PROFILE?: string
}
