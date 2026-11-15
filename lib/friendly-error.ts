/**
 * 사용자에게 보여줄 오류 문구
 *
 * Supabase·브라우저 오류는 영어 기술 문구("Failed to fetch",
 * "The object exceeded the maximum allowed size" 등)라 그대로 보여주면
 * 사용자가 무엇을 해야 할지 알 수 없다. 알려진 경우만 바꾸고,
 * 서버 액션이 이미 한국어로 만든 문구는 그대로 둔다.
 */

const RULES: { test: RegExp; message: string }[] = [
    {
        test: /failed to fetch|network ?error|load failed|networkerror|fetch failed|timed? ?out/i,
        message: "인터넷 연결이 불안정해요. 연결을 확인한 뒤 다시 시도해주세요.",
    },
    {
        test: /exceeded the maximum allowed size|payload too large|entity too large|413/i,
        message: "사진 용량이 너무 커요. 다른 사진을 선택해주세요.",
    },
    {
        test: /mime type|invalid_mime|not supported|unsupported/i,
        message: "지원하지 않는 사진 형식이에요. JPG나 PNG 사진을 선택해주세요.",
    },
    {
        test: /jwt expired|invalid jwt|auth session missing|not authenticated|refresh token/i,
        message: "로그인이 만료됐어요. 다시 로그인해주세요.",
    },
    {
        test: /row-level security|permission denied|unauthorized|403/i,
        message: "이 작업을 할 권한이 없어요. 공간에서 나가졌는지 확인해주세요.",
    },
    {
        test: /rate limit|too many requests|429/i,
        message: "요청이 너무 많아요. 잠시 후 다시 시도해주세요.",
    },
];

const HANGUL = /[가-힣]/;

export function friendlyErrorMessage(
    error: unknown,
    fallback = "문제가 생겼어요. 잠시 후 다시 시도해주세요."
): string {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        return "인터넷에 연결되어 있지 않아요. 연결을 확인한 뒤 다시 시도해주세요.";
    }

    const raw =
        error instanceof Error
            ? error.message
            : typeof error === "string"
                ? error
                : "";

    if (!raw) return fallback;

    // 서버에서 이미 한국어로 안내한 문구는 그대로
    if (HANGUL.test(raw)) return raw;

    return RULES.find((rule) => rule.test.test(raw))?.message ?? fallback;
}
