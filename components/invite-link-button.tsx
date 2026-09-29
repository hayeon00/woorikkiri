"use client";

import { useState } from "react";

export function InviteLinkButton({
                                     inviteCode,
                                 }: {
    inviteCode: string;
}) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const inviteUrl =
            `${window.location.origin}/join/${encodeURIComponent(inviteCode)}`;

        try {
            await navigator.clipboard.writeText(
                inviteUrl
            );

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 2000);
        } catch {
            window.prompt(
                "아래 초대 링크를 복사해주세요.",
                inviteUrl
            );
        }
    };

    return (
        <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-gray-200 bg-white px-3 py-2 text-[11px] font-bold transition hover:bg-gray-50"
        >
            {copied
                ? "복사 완료 ✓"
                : "초대 링크 복사"}
        </button>
    );
}