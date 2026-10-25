import { Body, Controller, Header, HttpCode, Post } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

import { SkipAllThrottle } from "../common/decorators/skip-all-throttle.decorator"
import { configHelper } from "../helpers/config.helper"
import { GateRequestDto } from "./dto/gate-request.dto"
import { GateService } from "./gate.service"

@ApiTags("gate")
@SkipAllThrottle()
@Controller(configHelper.game.routePrefix)
export class GateController {
    constructor(private readonly gateService: GateService) {}

    @Post("json-gate.php")
    @HttpCode(200)
    @Header("Content-Type", "text/plain; charset=utf-8")
    @ApiOperation({ summary: "Game message gateway, with a signed response in the crc!json format" })
    @ApiResponse({ status: 200, description: "Text in the <crc>!<json> format" })
    async handle(@Body() request: GateRequestDto) {
        return await this.gateService.handle(request)
    }
}
