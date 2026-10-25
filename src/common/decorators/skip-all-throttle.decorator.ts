import { SkipThrottle } from "@nestjs/throttler"
import { applyDecorators } from "@nestjs/common"

export function SkipAllThrottle() {
    return applyDecorators(SkipThrottle({ short: true, long: true, default: true }))
}
