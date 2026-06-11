import { useState } from "react";
import { useSopPdfUpload } from "./useSopPdfUpload";

export default function SopUploadForm() {
  const { isUploading, progress, error, result, startUpload } = useSopPdfUpload();
  const [sopId, setSopId] = useState("");
  const [category, setCategory] = useState("general");
  const [title, setTitle] = useState("");

  async function onFileChange(file: File | null) {
    if (!file || !sopId) return;
    await startUpload({
      file,
      sopId,
      title: title || undefined,
      category,
      upsert: false,
    });
  }

  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 480 }}>
      <input
        value={sopId}
        onChange={(e) => setSopId(e.target.value)}
        placeholder="SOP ID"
        disabled={isUploading}
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (optional)"
        disabled={isUploading}
      />
      <input
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        placeholder="Category"
        disabled={isUploading}
      />
      <input
        type="file"
        accept="application/pdf"
        disabled={isUploading || !sopId}
        onChange={(e) => onFileChange(e.target.files?.[0] ?? null)}
      />

      <div>{isUploading ? `Uploading ${progress}%` : "Idle"}</div>
      {error ? <div style={{ color: "crimson" }}>{error}</div> : null}
      {result ? (
        <div style={{ color: "green" }}>
          Uploaded ✓ docId={result.sopDocumentId} path={result.path}
        </div>
      ) : null}
    </div>
  );
}
