import { Injectable, Logger, OnModuleInit } from "@nestjs/common"

import { createHash } from "node:crypto"
import { promises as fs } from "node:fs"
import { inflateSync } from "node:zlib"
import * as path from "node:path"

import { configHelper } from "../helpers/config.helper"

type ManifestResource = {
    md5: string
    size: number
    type: string
}

type CdnEntry = {
    filePath: string
    type: string
}

const contentTypes: Record<string, string> = {
    swf: "application/x-shockwave-flash",
    json: "application/json",
    xml: "application/xml",
    mp3: "audio/mpeg",
}

@Injectable()
export class CdnService implements OnModuleInit {
    private readonly logger = new Logger(CdnService.name)
    private readonly entries = new Map<string, CdnEntry>()
    private readonly misses = new Set<string>()
    private totalResources = 0

    async onModuleInit() {
        await this.buildIndex()
    }

    find(fileName: string) {
        const entry = this.entries.get(fileName)

        if (!entry && !this.misses.has(fileName)) {
            this.misses.add(fileName)
            this.logger.warn(`Recurso não recuperado: ${fileName}`)
        }

        return entry
    }

    contentTypeOf(entry: CdnEntry) {
        return contentTypes[entry.type] || "application/octet-stream"
    }

    get stats() {
        return {
            served: this.entries.size,
            manifestResources: this.totalResources,
            missesSeen: this.misses.size,
        }
    }

    private async buildIndex() {
        const { cacheDir, gameSwfFile, manifestFile, cdnPrefix, clientVersion, locale } = configHelper.game
        const md5ToPath = new Map<string, string>()
        const names = await fs.readdir(cacheDir).catch(() => [] as string[])

        for (const name of names) {
            const filePath = path.join(cacheDir, name)
            const content = await fs.readFile(filePath)

            md5ToPath.set(createHash("md5").update(content).digest("hex"), filePath)
        }

        const manifestPath = path.join(cacheDir, manifestFile)
        const manifestContent = await fs.readFile(manifestPath).catch(() => null)

        if (!manifestContent) {
            this.logger.error(`Manifesto não encontrado em ${manifestPath}`)
            return
        }

        this.entries.set(`${cdnPrefix}_${clientVersion}_${locale}_files`, { filePath: manifestPath, type: "bin" })
        this.entries.set(`${cdnPrefix}_${clientVersion}.swf`, {
            filePath: path.resolve(cacheDir, gameSwfFile),
            type: "swf",
        })

        const manifest = JSON.parse(inflateSync(manifestContent).toString("utf-8")) as {
            resources: Record<string, ManifestResource>
        }

        for (const [name, resource] of Object.entries(manifest.resources)) {
            this.totalResources++

            const filePath = md5ToPath.get(resource.md5)

            if (filePath) {
                this.entries.set(`${name}_${resource.md5}`, { filePath: filePath, type: resource.type })
            }
        }

        this.logger.log(`CDN: ${this.entries.size} arquivos servidos de ${this.totalResources + 2} esperados`)
    }
}
