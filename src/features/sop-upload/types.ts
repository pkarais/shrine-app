export type UploadTokenResponse = {
  token: string
  path: string
  bucket?: string
}

export type UploadPdfInput = {
  file: File
  sopId: string
  title?: string
  category?: string
  description?: string
  upsert?: boolean
}

export type UploadPdfResult = {
  sopDocumentId: string
  path: string
  bucket: string
  bytesUploaded: number
}
