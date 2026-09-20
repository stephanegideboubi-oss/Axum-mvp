import { useState } from "react";
import { uploadFile } from "../api/uploads";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // keep in sync with the backend's multer limit

export function useFileUpload() {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File): Promise<string> {
    if (file.size > MAX_FILE_BYTES) {
      const message = "That file is too large (max 5MB).";
      setError(message);
      throw new Error(message);
    }
    setUploading(true);
    setError(null);
    try {
      const { url } = await uploadFile(file);
      return url;
    } catch (err: any) {
      const message = err?.response?.data?.error ?? "Could not upload this file";
      setError(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }

  return { upload, uploading, error, setError };
}
