import * as tus from "tus-js-client"
import { z } from "zod"
import { createClient } from "@/utils/supabase/client"
import type { UploadPdfInput, UploadPdfResult, UploadTokenResponse } from "./types"

const supabase = createClient()

const BUCKET = "operations-sops"
const MAX_PDF_BYTES = 25 * 1024 * 1024 // 25MB
const CHUNK_SIZE = 6 * 1024 * 1024 // Supabase TUS requirement

const uploadTokenSchema = z.object({
  token: z.string().min(1),
  path: z.string().min(1),
  bucket: z.string().optional(),
})

function assertPdf(file: File) {
  if (file.type !== "application/pdf") throw new Error("Only PDF files are allowed")
  if (file.size <= 0) throw new Error("Empty file is not allowed")
  if (file.size > MAX_PDF_BYTES) throw new Error("PDF exceeds max size limit")
}

async function getSessionAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw new Error(`Auth session error: ${error.message}`)
  if (!data.session?.access_token) throw new Error("Not authenticated")
  return {
    accessToken: data.session.access_token,
    userId: data.session.user.id,
  }
}

async function getSignedUploadToken(params: {
  fileName: string
  sopId: string
  upsert: boolean
  accessToken: string
}): Promise<UploadTokenResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

  const res = await fetch(`${supabaseUrl}/functions/v1/sops-pdf-upload-token`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      fileName: params.fileName,
      sopId: params.sopId,
      upsert: params.upsert,
    }),
  })

  const body = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(body?.error ?? "Failed to create signed upload token")
  }

  const parsed = uploadTokenSchema.safeParse(body)
  if (!parsed.success) throw new Error("Invalid token response from Edge Function")

  return parsed.data
}

function getTusEndpoint(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const projectRef = new URL(supabaseUrl).host.split(".")[0]
  return `https://${projectRef}.storage.supabase.co/storage/v1/upload/resumable`
}

async function tusUpload(args: {
  file: File
  path: string
  token: string
  accessToken: string
  anonKey: string
  upsert: boolean
  onProgress?: (percent: number, uploadedBytes: number, totalBytes: number) => void
}) {
  const endpoint = getTusEndpoint()

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(args.file, {
      endpoint,
      chunkSize: CHUNK_SIZE,
      retryDelays: [0, 1000, 3000, 5000, 10000],
      uploadDataDuringCreation: true,
      removeFingerprintOnSuccess: true,
      headers: {
        authorization: `Bearer ${args.accessToken}`,
        apikey: args.anonKey,
        "x-signature": args.token,
        ...(args.upsert ? { "x-upsert": "true" } : {}),
      },
      metadata: {
        bucketName: BUCKET,
        objectName: args.path,
        contentType: "application/pdf",
        cacheControl: "3600",
      },
      onError: (error) => reject(error),
      onProgress: (uploadedBytes, totalBytes) => {
        const percent = Math.round((uploadedBytes / totalBytes) * 100)
        args.onProgress?.(percent, uploadedBytes, totalBytes)
      },
      onSuccess: () => resolve(),
    })

    upload
      .findPreviousUploads()
      .then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0])
        }
        upload.start()
      })
      .catch(reject)
  })
}

async function insertSopDocumentRow(args: {
  title: string
  category: string
  description?: string
  path: string
  file: File
  userId: string
}) {
  const { data, error } = await supabase
    .from("sop_documents")
    .insert({
      title: args.title,
      category: args.category,
      description: args.description ?? null,
      source_type: "supabase",
      file_path: args.path,
      file_name: args.file.name,
      file_size: args.file.size,
      file_type: "application/pdf",
      uploaded_by: args.userId,
    })
    .select("id")
    .single()

  if (error) throw new Error(`DB insert failed: ${error.message}`)
  return data.id as string
}

export async function uploadSopPdf(
  input: UploadPdfInput,
  onProgress?: (percent: number, uploadedBytes: number, totalBytes: number) => void
): Promise<UploadPdfResult> {
  assertPdf(input.file)

  const { accessToken, userId } = await getSessionAccessToken()
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

  const tokenData = await getSignedUploadToken({
    fileName: input.file.name,
    sopId: input.sopId,
    upsert: Boolean(input.upsert),
    accessToken,
  })

  const bucket = tokenData.bucket ?? BUCKET

  await tusUpload({
    file: input.file,
    path: tokenData.path,
    token: tokenData.token,
    accessToken,
    anonKey,
    upsert: Boolean(input.upsert),
    onProgress,
  })

  const sopDocumentId = await insertSopDocumentRow({
    title: input.title?.trim() || input.file.name.replace(/\.pdf$/i, ""),
    category: input.category?.trim() || "general",
    description: input.description,
    path: tokenData.path,
    file: input.file,
    userId,
  })

  return {
    sopDocumentId,
    path: tokenData.path,
    bucket,
    bytesUploaded: input.file.size,
  }
}
