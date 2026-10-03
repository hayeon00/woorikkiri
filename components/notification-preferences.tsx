"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "@/app/actions";

type Props = {
    initialPushEnabled: boolean;
    initialPostEnabled: boolean;
    initialLikeEnabled: boolean;
    initialCommentEnabled: boolean;
};

export function NotificationPreferences({
                                            initialPushEnabled,
                                            initialPostEnabled,
                                            initialLikeEnabled,
                                            initialCommentEnabled,
                                        }: Props) {
    const [pushEnabled, setPushEnabled] =
        useState(initialPushEnabled);

    const [postEnabled, setPostEnabled] =
        useState(initialPostEnabled);

    const [likeEnabled, setLikeEnabled] =
        useState(initialLikeEnabled);

    const [commentEnabled, setCommentEnabled] =
        useState(initialCommentEnabled);

    const [message, setMessage] =
        useState<string | null>(null);

    const [isPending, startTransition] =
        useTransition();

    function save(next: {
        pushEnabled: boolean;
        postEnabled: boolean;
        likeEnabled: boolean;
        commentEnabled: boolean;
    }) {
        setPushEnabled(next.pushEnabled);
        setPostEnabled(next.postEnabled);
        setLikeEnabled(next.likeEnabled);
        setCommentEnabled(next.commentEnabled);

        setMessage(null);

        startTransition(async () => {
            try {
                await updateNotificationPreferences(
                    next
                );

                setMessage("저장됐어요.");
            } catch (error) {
                console.error(error);

                setMessage(
                    "설정을 저장하지 못했어요."
                );
            }
        });
    }

    function changePush(
        checked: boolean
    ) {
        save({
            pushEnabled: checked,
            postEnabled,
            likeEnabled,
            commentEnabled,
        });
    }

    function changePost(
        checked: boolean
    ) {
        save({
            pushEnabled,
            postEnabled: checked,
            likeEnabled,
            commentEnabled,
        });
    }

    function changeLike(
        checked: boolean
    ) {
        save({
            pushEnabled,
            postEnabled,
            likeEnabled: checked,
            commentEnabled,
        });
    }

    function changeComment(
        checked: boolean
    ) {
        save({
            pushEnabled,
            postEnabled,
            likeEnabled,
            commentEnabled: checked,
        });
    }

    return (
        <div className="mt-5 overflow-hidden rounded-2xl border border-gray-100">
            <SettingRow
                title="푸시 알림"
                description="모든 푸시 알림을 한 번에 켜거나 꺼요."
                checked={pushEnabled}
                onChange={changePush}
                disabled={isPending}
            />

            <div
                className={
                    pushEnabled
                        ? ""
                        : "opacity-40"
                }
            >
                <SettingRow
                    title="새 게시물"
                    description="같은 공간에 새 게시물이 올라오면 알려줘요."
                    checked={postEnabled}
                    onChange={changePost}
                    disabled={
                        !pushEnabled ||
                        isPending
                    }
                />

                <SettingRow
                    title="좋아요"
                    description="내 게시물에 좋아요가 달리면 알려줘요."
                    checked={likeEnabled}
                    onChange={changeLike}
                    disabled={
                        !pushEnabled ||
                        isPending
                    }
                />

                <SettingRow
                    title="댓글"
                    description="내 게시물에 댓글이 달리면 알려줘요."
                    checked={commentEnabled}
                    onChange={changeComment}
                    disabled={
                        !pushEnabled ||
                        isPending
                    }
                />
            </div>

            {(message || isPending) && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-2.5 text-center text-[10px] font-medium text-gray-400">
                    {isPending
                        ? "저장 중..."
                        : message}
                </div>
            )}
        </div>
    );
}

function SettingRow({
                        title,
                        description,
                        checked,
                        onChange,
                        disabled,
                    }: {
    title: string;
    description: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
}) {
    return (
        <label className="flex cursor-pointer items-center gap-4 border-b border-gray-100 px-4 py-4 last:border-b-0">
            <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-gray-900">
                    {title}
                </p>

                <p className="mt-0.5 text-[10px] leading-4 text-gray-400">
                    {description}
                </p>
            </div>

            <input
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={(event) =>
                    onChange(
                        event.target.checked
                    )
                }
                className="peer sr-only"
            />

            <span className="relative h-7 w-12 shrink-0 rounded-full bg-gray-200 transition peer-checked:bg-black peer-disabled:cursor-not-allowed">
                <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
            </span>
        </label>
    );
}