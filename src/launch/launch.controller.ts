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
    @ApiOperation({ summary: "Launch information: client version, language and maintenance" })
    @ApiResponse({ status: 200, description: "Launch object read by the GameLoader" })
    async getLaunchInfo(@Query() query: LaunchInfoQueryDto) {
        return await this.launchService.getLaunchInfo(query.player_id)
    }

    @Get("get_dummy.php")
    @ApiOperation({ summary: "Maintenance check" })
    @ApiResponse({ status: 200, description: "Always no maintenance" })
    getDummy() {
        return "0"
    }

    @Post("track_visit.php")
    @HttpCode(200)
    @ApiOperation({ summary: "Loading step statistics (ignored)" })
    @ApiResponse({ status: 200, description: "No content" })
    trackVisit() {
        return ""
    }

    @Post("statistics.php")
    @HttpCode(200)
    @ApiOperation({ summary: "Client metrics (ignored)" })
    @ApiResponse({ status: 200, description: "No content" })
    statistics() {
        return ""
    }
}
