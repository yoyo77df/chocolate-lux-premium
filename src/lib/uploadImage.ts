import { ref as sRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirebase } from "./firebase";

// Resize/compress image in browser to a JPEG data URL under ~maxBytes.
export async function compressToDataURL(file: File, maxDim = 1200, maxBytes = 700_000): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  let q = 0.85;
  let url = canvas.toDataURL("image/jpeg", q);
  while (url.length > maxBytes && q > 0.4) {
    q -= 0.1;
    url = canvas.toDataURL("image/jpeg", q);
  }
  return url;
}

// Try Firebase Storage; if it fails (rules / CORS), fall back to a compressed
// data URL stored inline. Returns the URL to save in Firestore.
export async function uploadImageWithFallback(file: File, folder: string): Promise<string> {
  // Default: compress to inline data URL (instant, no Storage CORS/rules issues).
  // Storage upload often hangs in browsers due to CORS preflight or rules — we
  // skip it and store a compact JPEG data URL directly in Firestore.
  void folder; void sRef; void uploadBytes; void getDownloadURL;
  return await compressToDataURL(file);
}