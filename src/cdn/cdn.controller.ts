import { Controller, Get, Header, NotFoundException, Param, StreamableFile } from "@nestjs/common"
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"

import { createReadStream } from "node:fs"

import { SkipAllThrottle } from "../common/decorators/skip-all-throttle.decorator"
import { messagesHelper } from "../helpers/messages.helper"
import { CdnService } from "./cdn.service"

const crossDomainPolicy = `<?xml version="1.0"?><cross-domain-policy><allow-access-from domain="*"/></cross-domain-policy>`

@ApiTags("cdn")
@SkipAllThrottle()
@Controller()
export class CdnController {
    constructor(private readonly cdnService: CdnService) {}

    @Get("cdn/:fileName")
    @ApiOperation({ summary: "Serves a recovered game file by its name in the name_md5 format" })
    @ApiResponse({ status: 200, description: "Raw file content" })
    @ApiResponse({ status: 404, description: "File not recovered" })
    getFile(@Param("fileName") fileName: string) {
        const entry = this.cdnService.find(fileName)

        if (!entry) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({ name: "Resource", value: fileName, property: "name" }),
            )
        }

        return new StreamableFile(createReadStream(entry.filePath), { type: this.cdnService.contentTypeOf(entry) })
    }

    @Get("cdn-stats")
    @ApiOperation({ summary: "Summary of how many resources are available" })
    @ApiResponse({ status: 200, description: "Count of served and missing files" })
    getStats() {
        return this.cdnService.stats
    }

    @Get("crossdomain.xml")
    @Header("Content-Type", "text/x-cross-domain-policy")
    @ApiOperation({ summary: "Cross-domain access policy required by Flash" })
    @ApiResponse({ status: 200, description: "Policy XML" })
    getCrossDomainPolicy() {
        return crossDomainPolicy
    }
}
