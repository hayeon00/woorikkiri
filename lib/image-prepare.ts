import { isAllowedImageType, MAX_IMAGE_BYTES } from "@/lib/upload-rules";

/**
 * 업로드 전 사진 정리 (브라우저 전용)
 *
 * 휴대폰 원본 사진은 5MB를 넘는 경우가 많아 그대로 올리면 거절된다.
 * 긴 변 2048px, JPEG 85% 정도로 줄이면 화면에서는 차이가 거의 없고
 * 업로드도 빨라진다. 줄일 수 없는 경우(HEIC를 못 읽는 브라우저 등)는 원본을 그대로 둔다.
 */

const MAX_EDGE = 2048;
const QUALITY = 0.85;
/** 이보다 작고 픽셀도 작으면 손대지 않는다. */
const SKIP_BELOW_BYTES = 1.5 * 1024 * 1024;

const EXTENSION_TYPES: Record<string, string> = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    heic: "image/heic",
    heif: "image/heif",
};

/** 일부 안드로이드·HEIC 파일은 file.type이 비어 있어 확장자로 보완한다. */
export function detectImageType(file: File): string {
    if (file.type) return file.type;
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    return EXTENSION_TYPES[extension] ?? "";
}

function withType(file: File, type: string) {
    if (file.type === type) return file;
    return new File([file], file.name, { type, lastModified: file.lastModified });
}

function toJpegName(name: string) {
    const base = name.replace(/\.[^.]+$/, "") || "photo";
    return `${base}.jpg`;
}

async function shrink(file: File): Promise<File | null> {
    if (typeof createImageBitmap !== "function") return null;

    let bitmap: ImageBitmap;
    try {
        bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
        return null; // 이 브라우저가 읽을 수 없는 형식
    }

    try {
        const longEdge = Math.max(bitmap.width, bitmap.height);
        if (file.size <= SKIP_BELOW_BYTES && longEdge <= MAX_EDGE) return null;

        const scale = Math.min(1, MAX_EDGE / longEdge);
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) return null;

        // 투명 PNG가 검게 변하지 않도록 흰 배경
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, width, height);
        context.drawImage(bitmap, 0, 0, width, height);

        const blob = await new Promise<Blob | null>((resolve) =>
            canvas.toBlob(resolve, "image/jpeg", QUALITY)
        );
        if (!blob || blob.size >= file.size) return null;

        return new File([blob], toJpegName(file.name), {
            type: "image/jpeg",
            lastModified: file.lastModified,
        });
    } finally {
        bitmap.close();
    }
}

export type PreparedImage =
    | { ok: true; file: File }
    | { ok: false; reason: "type" | "size" };

export async function prepareImageForUpload(file: File): Promise<PreparedImage> {
    const type = detectImageType(file);
    if (!isAllowedImageType(type)) return { ok: false, reason: "type" };

    const typed = withType(file, type);

    // GIF는 줄이면 움직임이 사라지므로 그대로 둔다.
    const prepared = type === "image/gif" ? null : await shrink(typed);
    const result = prepared ?? typed;

    if (result.size > MAX_IMAGE_BYTES) return { ok: false, reason: "size" };
    return { ok: true, file: result };
}
