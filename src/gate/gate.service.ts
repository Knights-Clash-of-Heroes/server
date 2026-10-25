import { Injectable, Logger } from "@nestjs/common"

import { GateActionsService } from "./gate-actions.service"
import { configHelper } from "../helpers/config.helper"
import { GateRequestDto } from "./dto/gate-request.dto"
import { GateError } from "./gate.error"
import { crc32 } from "../utils/crc32"

@Injectable()
export class GateService {
    private readonly logger = new Logger(GateService.name)
    private readonly commandPrefix = "Knights."

    constructor(private readonly gateActionsService: GateActionsService) {}

    async handle(request: GateRequestDto) {
        const payload = await this.process(request)

        return this.sign(request.pid, request.sig, payload)
    }

    sign(playerId: string, requestSignature: string, payload: Record<string, unknown>) {
        const body = JSON.stringify(payload)

        return `${crc32(playerId + requestSignature + body)}!${body}`
    }

    private async process(request: GateRequestDto): Promise<Record<string, unknown>> {
        try {
            if (String(crc32(request.pid + request.cmd + request.data)) !== request.sig) {
                throw new GateError("#INCORRECT_REQUEST_SIGNATURE")
            }

            if (!request.cmd.startsWith(this.commandPrefix)) {
                throw new GateError("#UNKNOWN_COMMAND")
            }

            const type = request.cmd.slice(this.commandPrefix.length)
            const data = this.parseData(request.data)
            const result = await this.gateActionsService.execute(type, request.pid, data)

            return { serverTime: Math.floor(Date.now() / 1000), ...result }
        } catch (error) {
            if (error instanceof GateError) {
                return { error: error.message }
            }

            this.logger.error(`Failure in ${request.cmd}`, error instanceof Error ? error.stack : String(error))

            return { error: "#SERVER_ERROR", errorLog: configHelper.isDevelopment ? String(error) : undefined }
        }
    }

    private parseData(raw: string) {
        try {
            const parsed = JSON.parse(raw)

            if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
                throw new GateError("#INCORRECT_REQUEST_DATA")
            }

            return parsed as Record<string, unknown>
        } catch (error) {
            if (error instanceof GateError) {
                throw error
            }

            throw new GateError("#INCORRECT_REQUEST_DATA")
        }
    }
}
