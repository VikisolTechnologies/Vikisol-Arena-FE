import { isRealMode } from "./mode";
import { apiFetch } from "./httpClient";

/**
 * Post photos and videos. Files go from the browser straight to Cloudinary using a short-lived
 * signature from arena-api (POST /media/upload-signature) - the API secret stays server-side,
 * and large videos never pass through arena-api's 10MB request limit. The backend then only
 * accepts media URLs from its own Cloudinary folder when the post is created.
 */

export const MAX_MEDIA_PER_POST = 4;
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
// Cloudinary's free plan caps a single video upload at 100MB.
export const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

export interface UploadSignature {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowedFormats: string;
  signature: string;
  uploadUrl: string;
}

export function getUploadSignature(): Promise<UploadSignature> {
  return apiFetch<UploadSignature>("/media/upload-signature", { method: "POST" });
}

export function isVideoFile(file: File) {
  return file.type.startsWith("video/");
}

/** Returns a problem to show the user, or null if the file can be uploaded. */
export function checkMediaFile(file: File): string | null {
  const video = isVideoFile(file);
  if (!video && !file.type.startsWith("image/")) return `${file.name} isn't a photo or video.`;
  if (video && file.size > MAX_VIDEO_BYTES) return `${file.name} is over 100MB - try a shorter clip.`;
  if (!video && file.size > MAX_IMAGE_BYTES) return `${file.name} is over 10MB.`;
  return null;
}

/**
 * Uploads one file and resolves to its delivery URL. XHR rather than fetch() purely for upload
 * progress, which matters for videos on a phone connection.
 */
export function uploadMedia(file: File, sig: UploadSignature | null, onProgress?: (fraction: number) => void): Promise<string> {
  // Mock mode has no Cloudinary - a local object URL is enough to preview and "post" it.
  if (!isRealMode() || !sig) {
    onProgress?.(1);
    return Promise.resolve(URL.createObjectURL(file));
  }
  return new Promise((resolve, reject) => {
    const form = new FormData();
    form.append("file", file);
    form.append("api_key", sig.apiKey);
    form.append("timestamp", String(sig.timestamp));
    form.append("folder", sig.folder);
    form.append("allowed_formats", sig.allowedFormats);
    form.append("signature", sig.signature);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", sig.uploadUrl);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      try {
        const res = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && res.secure_url) resolve(res.secure_url as string);
        else reject(new Error(res.error?.message ?? "Upload failed"));
      } catch {
        reject(new Error("Upload failed"));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed - check your connection."));
    xhr.send(form);
  });
}

export function isVideoUrl(url: string) {
  return url.includes("/video/upload/") || /\.(mp4|mov|webm)(\?|$)/i.test(url);
}

/**
 * Cloudinary delivers a resized, auto-format/quality version when a transformation is inserted
 * after /upload/ - a 12MP phone photo becomes a ~150KB WebP/AVIF for the feed. Non-Cloudinary
 * URLs (mock object URLs, older seeded images) pass through unchanged.
 */
export function mediaDisplayUrl(url: string, width = 1080) {
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  // Videos are always delivered as MP4 (an iPhone .mov doesn't play in Chrome/Android) -
  // Cloudinary picks the delivery format from the extension and transcodes on first request.
  if (isVideoUrl(url)) return url.replace("/upload/", `/upload/q_auto,w_${width},c_limit/`).replace(/\.(mov|webm)$/i, ".mp4");
  return url.replace("/upload/", `/upload/f_auto,q_auto,w_${width},c_limit/`);
}

/** A still frame for a video, used as its poster before it plays. */
export function videoPosterUrl(url: string, width = 1080) {
  if (!url.includes("res.cloudinary.com") || !isVideoUrl(url)) return undefined;
  return url.replace("/upload/", `/upload/so_0,f_jpg,q_auto,w_${width}/`).replace(/\.(mp4|mov|webm)$/i, ".jpg");
}
