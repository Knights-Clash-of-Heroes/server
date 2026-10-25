import { DocumentBuilder, OpenAPIObject, SwaggerModule } from "@nestjs/swagger"
import { NestExpressApplication } from "@nestjs/platform-express"
import { NestFactory } from "@nestjs/core"
import { Logger } from "@nestjs/common"
import helmet from "helmet"

import { configHelper } from "./helpers/config.helper"
import { AppModule } from "./app.module"

async function createSwaggerSpec(document: OpenAPIObject) {
    const fs = await import("fs")

    document.servers = [
        {
            url: `http://localhost:${configHelper.app.port}`,
            description: "Dev",
        },
    ]

    await fs.promises.writeFile("./swagger-spec.json", JSON.stringify(document))
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule)

    app.useBodyParser("urlencoded", { limit: "5mb", extended: true })
    app.useBodyParser("json", { limit: "5mb" })

    if (configHelper.isDevelopment) {
        const httpLogger = new Logger("HttpLogger")

        app.use((request: { method: string; originalUrl: string }, _response: unknown, next: () => void) => {
            httpLogger.log(`${request.method} ${request.originalUrl.slice(0, 160)}`)
            next()
        })
    }

    app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }))
    app.enableCors(configHelper.app.cors)
    app.useGlobalPipes(configHelper.app.validationPipe)

    if (configHelper.isDevelopment) {
        const config = new DocumentBuilder()
            .setTitle(`${configHelper.app.metadata.name} - API Documentation`)
            .setVersion(configHelper.app.metadata.version)
            .addBearerAuth()
            .build()

        const document = SwaggerModule.createDocument(app, config)

        await createSwaggerSpec(document)

        SwaggerModule.setup("docs", app, document)
    }

    await app.listen(configHelper.app.port)
}

bootstrap()
