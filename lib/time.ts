/**
 * 시간 표시 (항상 한국 시간 기준)
 *
 * 서버(Vercel)는 UTC로 동작하므로 timeZone을 지정하지 않으면
 * 서버에서 렌더링한 시간이 9시간 어긋난다.
 */

const TIME_ZONE = "Asia/Seoul";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function seoulDateKey(date: Date) {
    // 예: "2026-11-15"
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);
}

function formatTime(date: Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: TIME_ZONE,
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

/** 전체 날짜·시간. 예: "2026년 11월 15일 오후 7:01" (title 속성용) */
export function formatFullDateTime(value: string | Date) {
    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(new Date(value));
}

/**
 * 읽기 쉬운 상대 시간.
 *   방금 전 / 5분 전 / 3시간 전 / 어제 오후 7:01 / 11월 3일 / 2025년 11월 3일
 */
export function formatRelativeTime(
    value: string | Date,
    now: Date = new Date()
) {
    const date = new Date(value);
    const diff = now.getTime() - date.getTime();

    if (Number.isNaN(diff)) return "";

    if (diff < MINUTE) return "방금 전";
    if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;

    const today = seoulDateKey(now);
    const day = seoulDateKey(date);

    if (day === today && diff < 24 * HOUR) {
        return `${Math.floor(diff / HOUR)}시간 전`;
    }

    const yesterday = seoulDateKey(new Date(now.getTime() - 24 * HOUR));
    if (day === yesterday) return `어제 ${formatTime(date)}`;

    const sameYear = day.slice(0, 4) === today.slice(0, 4);

    return new Intl.DateTimeFormat("ko-KR", {
        timeZone: TIME_ZONE,
        year: sameYear ? undefined : "numeric",
        month: "long",
        day: "numeric",
    }).format(date);
}
