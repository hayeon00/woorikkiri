"use client";

import {
    useState,
    useTransition,
} from "react";

type GroupItem = {
    id: number;
    name: string;
};

export function GroupOrderEditor({
                                     groups,
                                     updateAction,
                                 }: {
    groups: GroupItem[];
    updateAction: (
        groupIds: number[]
    ) => Promise<void>;
}) {
    const [items, setItems] =
        useState(groups);

    const [editing, setEditing] =
        useState(false);

    const [isPending, startTransition] =
        useTransition();

    function move(
        index: number,
        direction: -1 | 1
    ) {
        const nextIndex =
            index + direction;

        if (
            nextIndex < 0 ||
            nextIndex >= items.length
        ) {
            return;
        }

        setItems((current) => {
            const next = [...current];

            [
                next[index],
                next[nextIndex],
            ] = [
                next[nextIndex],
                next[index],
            ];

            return next;
        });
    }

    function cancel() {
        setItems(groups);
        setEditing(false);
    }

    function save() {
        const groupIds =
            items.map(
                (item) => item.id
            );

        startTransition(
            async () => {
                try {
                    await updateAction(
                        groupIds
                    );

                    setEditing(false);
                } catch (error) {
                    console.error(
                        "공간 순서 저장 실패:",
                        error
                    );

                    alert(
                        "공간 순서를 저장하지 못했어요."
                    );
                }
            }
        );
    }

    if (!editing) {
        return (
            <button
                type="button"
                onClick={() =>
                    setEditing(true)
                }
                className="rounded-full bg-gray-100 px-3 py-2 text-[11px] font-bold text-gray-600 transition hover:bg-gray-200"
            >
                순서 변경
            </button>
        );
    }

    return (
        <div className="border-t border-gray-100 px-3 pb-4 pt-3">
            <div className="rounded-[20px] bg-gray-50 p-3">
                <div className="flex items-center justify-between gap-3 px-1 pb-3">
                    <div>
                        <p className="text-[12px] font-black">
                            공간 순서 변경
                        </p>

                        <p className="mt-1 text-[10px] leading-4 text-gray-400">
                            가장 위 공간이
                            로그인 후 기본으로
                            열려요.
                        </p>
                    </div>

                    <span className="rounded-full bg-white px-2.5 py-1 text-[9px] font-black text-gray-400">
                        맨 위 = 기본
                    </span>
                </div>

                <div className="space-y-2">
                    {items.map(
                        (
                            item,
                            index
                        ) => (
                            <div
                                key={
                                    item.id
                                }
                                className="flex min-h-14 items-center gap-3 rounded-[16px] border border-black/[0.04] bg-white px-3"
                            >
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-black text-gray-500">
                                    {index +
                                        1}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <p className="truncate text-[12px] font-black">
                                            {
                                                item.name
                                            }
                                        </p>

                                        {index ===
                                            0 && (
                                                <span className="shrink-0 rounded-full bg-gray-950 px-2 py-0.5 text-[8px] font-black text-white">
                                                기본
                                            </span>
                                            )}
                                    </div>
                                </div>

                                <div className="flex shrink-0 gap-1">
                                    <button
                                        type="button"
                                        aria-label={`${item.name} 위로 이동`}
                                        disabled={
                                            index ===
                                            0 ||
                                            isPending
                                        }
                                        onClick={() =>
                                            move(
                                                index,
                                                -1
                                            )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-600 disabled:opacity-25"
                                    >
                                        ↑
                                    </button>

                                    <button
                                        type="button"
                                        aria-label={`${item.name} 아래로 이동`}
                                        disabled={
                                            index ===
                                            items.length -
                                            1 ||
                                            isPending
                                        }
                                        onClick={() =>
                                            move(
                                                index,
                                                1
                                            )
                                        }
                                        className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-100 text-sm font-black text-gray-600 disabled:opacity-25"
                                    >
                                        ↓
                                    </button>
                                </div>
                            </div>
                        )
                    )}
                </div>

                <div className="mt-3 flex gap-2">
                    <button
                        type="button"
                        onClick={cancel}
                        disabled={
                            isPending
                        }
                        className="h-11 flex-1 rounded-xl bg-white text-[11px] font-bold text-gray-500"
                    >
                        취소
                    </button>

                    <button
                        type="button"
                        onClick={save}
                        disabled={
                            isPending
                        }
                        className="h-11 flex-[1.5] rounded-xl bg-gray-950 text-[11px] font-black text-white disabled:opacity-50"
                    >
                        {isPending
                            ? "저장 중..."
                            : "이 순서로 저장"}
                    </button>
                </div>
            </div>
        </div>
    );
}