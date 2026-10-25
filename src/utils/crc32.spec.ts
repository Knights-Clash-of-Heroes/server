import { crc32 } from "./crc32"

describe("crc32", () => {
    it("deve retornar o valor de referência do CRC-32", () => {
        expect(crc32("123456789")).toBe(0xcbf43926)
    })

    it("deve retornar zero para texto vazio", () => {
        expect(crc32("")).toBe(0)
    })

    it("deve calcular sobre os bytes UTF-8", () => {
        expect(crc32("Cavaleiro de ação")).toBe(crc32(Buffer.from("Cavaleiro de ação", "utf-8").toString("utf-8")))
    })
})
