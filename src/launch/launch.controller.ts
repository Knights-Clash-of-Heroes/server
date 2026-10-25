import { Controller, Get, HttpCode, Post, Query } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

import { SkipAllThrottle } from "../common/decorators/skip-all-throttle.decorator"
import { LaunchInfoQueryDto } from "./dto/launch-info-query.dto"
import { configHelper } from "../helpers/config.helper"
import { LaunchService } from "./launch.service"

@ApiTags("launch")
@SkipAllThrottle()
@Controller(configHelper.game.routePrefix)
export class LaunchController {
    constructor(private readonly launchService: LaunchService) {}

    @Get("get_launch_info.php")
    @ApiOperation({ summary: "Informações de arranque: versão do cliente, idioma e manutenção" })
    @ApiResponse({ status: 200, description: "Objeto de lançamento lido pelo GameLoader" })
    async getLaunchInfo(@Query() query: LaunchInfoQueryDto) {
        return await this.launchService.getLaunchInfo(query.player_id)
    }

    @Get("get_dummy.php")
    @ApiOperation({ summary: "Consulta de manutenção" })
    @ApiResponse({ status: 200, description: "Sempre sem manutenção" })
    getDummy() {
        return "0"
    }

    @Post("track_visit.php")
    @HttpCode(200)
    @ApiOperation({ summary: "Estatística de etapas do carregamento (ignorada)" })
    @ApiResponse({ status: 200, description: "Sem conteúdo" })
    trackVisit() {
        return ""
    }

    @Post("statistics.php")
    @HttpCode(200)
    @ApiOperation({ summary: "Métricas do cliente (ignoradas)" })
    @ApiResponse({ status: 200, description: "Sem conteúdo" })
    statistics() {
        return ""
    }
}
