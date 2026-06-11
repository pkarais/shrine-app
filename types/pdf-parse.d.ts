declare module "pdf-parse/lib/pdf-parse.js" {
  interface PdfParseResult {
    text: string
    numpages: number
    numrender: number
    info: unknown
    metadata: unknown
    version: string
  }
  const pdfParse: (data: Buffer | Uint8Array) => Promise<PdfParseResult>
  export default pdfParse
}
