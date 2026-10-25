const crcTable = (() => {
    const table = new Uint32Array(256)

    for (let index = 0; index < 256; index++) {
        let value = index

        for (let bit = 0; bit < 8; bit++) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
        }

        table[index] = value >>> 0
    }

    return table
})()

export function crc32(value: string): number {
    const bytes = Buffer.from(value, "utf-8")
    let crc = 0xffffffff

    for (const byte of bytes) {
        crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8)
    }

    return (crc ^ 0xffffffff) >>> 0
}
