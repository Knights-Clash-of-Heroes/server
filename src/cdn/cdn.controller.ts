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
    @ApiOperation({ summary: "Serve um arquivo recuperado do jogo pelo nome no formato nome_md5" })
    @ApiResponse({ status: 200, description: "Conteúdo bruto do arquivo" })
    @ApiResponse({ status: 404, description: "Arquivo não recuperado" })
    getFile(@Param("fileName") fileName: string) {
        const entry = this.cdnService.find(fileName)

        if (!entry) {
            throw new NotFoundException(
                messagesHelper.OBJECT_NOT_FOUND({ name: "Recurso", value: fileName, property: "nome" }),
            )
        }

        return new StreamableFile(createReadStream(entry.filePath), { type: this.cdnService.contentTypeOf(entry) })
    }

    @Get("cdn-stats")
    @ApiOperation({ summary: "Resumo de quantos recursos estão disponíveis" })
    @ApiResponse({ status: 200, description: "Contagem de arquivos servidos e ausentes" })
    getStats() {
        return this.cdnService.stats
    }

    @Get("crossdomain.xml")
    @Header("Content-Type", "text/x-cross-domain-policy")
    @ApiOperation({ summary: "Política de acesso entre domínios exigida pelo Flash" })
    @ApiResponse({ status: 200, description: "XML da política" })
    getCrossDomainPolicy() {
        return crossDomainPolicy
    }
}
