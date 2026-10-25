import { crc32 } from "./crc32"

describe("crc32", () => {
    it("should return the CRC-32 reference value", () => {
        expect(crc32("123456789")).toBe(0xcbf43926)
    })

    it("should return zero for empty text", () => {
        expect(crc32("")).toBe(0)
    })

    it("should compute over the UTF-8 bytes", () => {
        expect(crc32("Knight in action")).toBe(crc32(Buffer.from("Knight in action", "utf-8").toString("utf-8")))
    })
})
