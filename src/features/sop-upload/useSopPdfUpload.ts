import { useCallback, useState } from "react";
import { uploadSopPdf } from "./uploadSopPdf";
import type { UploadPdfInput, UploadPdfResult } from "./types";

type State = {
  isUploading: boolean;
  progress: number;
  error: string | null;
  result: UploadPdfResult | null;
};

export function useSopPdfUpload() {
  const [state, setState] = useState<State>({
    isUploading: false,
    progress: 0,
    error: null,
    result: null,
  });

  const startUpload = useCallback(async (input: UploadPdfInput) => {
    setState({ isUploading: true, progress: 0, error: null, result: null });

    try {
      const result = await uploadSopPdf(input, (percent) => {
        setState((s) => ({ ...s, progress: percent }));
      });

      setState({ isUploading: false, progress: 100, error: null, result });
      return result;
    } catch (e: any) {
      setState({
        isUploading: false,
        progress: 0,
        error: e?.message ?? "Upload failed",
        result: null,
      });
      throw e;
    }
  }, []);

  return {
    ...state,
    startUpload,
  };
}
