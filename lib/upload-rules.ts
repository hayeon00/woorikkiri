/**
 * 사진 업로드 허용 형식
 * Storage 버킷 설정(supabase/migrations/20261114150000_s6_storage_bucket_limits.sql)과 같게 유지한다.
 */
export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
] as const;

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export const IMAGE_TYPE_ERROR =
    "JPG, PNG, WEBP, GIF, HEIC 사진만 올릴 수 있어요.";

export function isAllowedImageType(type: string): boolean {
    return (ALLOWED_IMAGE_TYPES as readonly string[]).includes(type);
}
