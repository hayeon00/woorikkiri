"use client";

import { useState } from "react";

import { toast } from "@/lib/toast";

type InviteLinkButtonProps = {
    inviteCode: string;
    /** 공유 문구에 넣을 공간 이름 */
    groupName?: string;
    /** pill: 설정 화면용 작은 버튼, chip: 피드 상단, block: 넓은 버튼 */
    variant?: "pill" | "chip" | "block";
};

const STYLES = {
    pill: "rounded-full border border-gray-200 bg-white px-3 py-2 text-[12px] font-bold transition hover:bg-gray-50 active:scale-95",
    chip: "flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-gray-950 px-3.5 text-[12px] font-black text-white transition hover:bg-black active:scale-95",
    // 어두운 안내 카드 위에 놓이는 넓은 버튼
    block: "flex h-11 w-full items-center justify-center gap-2 rounded-[14px] bg-white text-[13px] font-black text-gray-950 transition hover:bg-gray-100 active:scale-[0.98]",
} as const;

export function InviteLinkButton({
    inviteCode,
    groupName,
    variant = "pill",
}: InviteLinkButtonProps) {
    const [fallbackUrl, setFallbackUrl] =
        useState<string | null>(null);

    const handleInvite = async () => {
        const inviteUrl =
            `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`;

        const text = groupName
            ? `우리끼리 '${groupName}' 공간에 초대할게요!`
            : "우리끼리 공간에 초대할게요!";

        // 1) 휴대폰: 카카오톡 등으로 바로 보낼 수 있는 공유 창
        if (
            typeof navigator.share === "function" &&
            window.matchMedia("(pointer: coarse)").matches
        ) {
            try {
                await navigator.share({ title: "우리끼리 초대", text, url: inviteUrl });
                return;
            } catch (error) {
                // 사용자가 공유 창을 닫은 경우는 조용히 끝낸다
                if (error instanceof DOMException && error.name === "AbortError") {
                    return;
                }
            }
        }

        // 2) 링크 복사
        try {
            await navigator.clipboard.writeText(inviteUrl);
            toast.success("초대 링크를 복사했어요. 친구에게 보내주세요.");
            return;
        } catch {
            // 3) 복사도 안 되면 직접 복사할 수 있게 보여준다
            setFallbackUrl(inviteUrl);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={handleInvite}
                className={STYLES[variant]}
            >
                {variant !== "pill" && <ShareIcon />}
                {variant === "pill" ? "초대 링크 보내기" : "친구 초대"}
            </button>

            {fallbackUrl && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label="초대 링크"
                    className="fixed inset-0 z-[90] flex items-end justify-center bg-black/40 p-4 sm:items-center"
                    onClick={() => setFallbackUrl(null)}
                >
                    <div
                        className="w-full max-w-[400px] rounded-[24px] bg-white p-5"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <p className="text-[16px] font-black">초대 링크</p>
                        <p className="mt-1 text-[13px] text-gray-500">
                            아래 링크를 길게 눌러 복사한 뒤 친구에게 보내주세요.
                        </p>
                        <input
                            readOnly
                            value={fallbackUrl}
                            onFocus={(event) => event.currentTarget.select()}
                            autoFocus
                            className="mt-4 w-full rounded-[12px] bg-gray-100 px-3 py-3 text-[14px] text-gray-800 outline-none"
                        />
                        <button
                            type="button"
                            onClick={() => setFallbackUrl(null)}
                            className="mt-4 h-11 w-full rounded-full bg-gray-950 text-[14px] font-black text-white"
                        >
                            닫기
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

function ShareIcon() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
                d="M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 12v6a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}
