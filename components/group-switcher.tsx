"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type Group = {
    id: number;
    name: string;
};

type GroupSwitcherProps = {
    currentGroup: Group;
    groups: Group[];
};

export function GroupSwitcher({
                                  currentGroup,
                                  groups,
                              }: GroupSwitcherProps) {
    const [isOpen, setIsOpen] =
        useState(false);

    const containerRef =
        useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleOutsideClick(
            event: MouseEvent
        ) {
            if (
                containerRef.current &&
                !containerRef.current.contains(
                    event.target as Node
                )
            ) {
                setIsOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleOutsideClick
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleOutsideClick
            );
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className="relative min-w-0"
        >
            <button
                type="button"
                onClick={() =>
                    setIsOpen((value) => !value)
                }
                aria-expanded={isOpen}
                className="flex max-w-full items-center gap-1.5 text-left"
            >
                <span className="max-w-[230px] truncate text-[20px] font-black tracking-[-0.04em] sm:max-w-[360px] sm:text-[22px]">
                    {currentGroup.name}
                </span>

                {groups.length > 1 && (
                    <svg
                        width="15"
                        height="15"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={
                            isOpen
                                ? "shrink-0 rotate-180 text-gray-400 transition-transform"
                                : "shrink-0 text-gray-400 transition-transform"
                        }
                        aria-hidden="true"
                    >
                        <path
                            d="m7 9 5 5 5-5"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                    </svg>
                )}
            </button>

            {isOpen &&
                groups.length > 1 && (
                    <div className="absolute left-0 top-[calc(100%+12px)] z-50 w-[260px] overflow-hidden rounded-[20px] border border-black/[0.06] bg-white p-2 shadow-[0_18px_60px_rgba(0,0,0,0.14)]">
                        <p className="px-3 pb-2 pt-1 text-[10px] font-bold text-gray-400">
                            내 공간
                        </p>

                        <div className="max-h-[300px] overflow-y-auto">
                            {groups.map(
                                (group) => {
                                    const selected =
                                        group.id ===
                                        currentGroup.id;

                                    return (
                                        <a
                                            key={
                                                group.id
                                            }
                                            href={`/?group=${group.id}`}
                                            className={
                                                selected
                                                    ? "flex items-center justify-between rounded-[14px] bg-gray-950 px-3.5 py-3 text-[13px] font-black text-white"
                                                    : "flex items-center justify-between rounded-[14px] px-3.5 py-3 text-[13px] font-bold text-gray-700 transition hover:bg-gray-50"
                                            }
                                        >
                                            <span className="min-w-0 truncate">
                                                {
                                                    group.name
                                                }
                                            </span>

                                            {selected && (
                                                <svg
                                                    width="15"
                                                    height="15"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    className="ml-3 shrink-0"
                                                    aria-hidden="true"
                                                >
                                                    <path
                                                        d="m5 12 4 4L19 6"
                                                        stroke="currentColor"
                                                        strokeWidth="2.3"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                </svg>
                                            )}
                                        </a>
                                    );
                                }
                            )}
                        </div>

                        <div className="mt-2 border-t border-gray-100 pt-2">
                            <a
                                href="/settings"
                                className="flex items-center justify-between rounded-[14px] px-3.5 py-3 text-[12px] font-bold text-gray-500 transition hover:bg-gray-50"
                            >
                                공간 관리

                                <svg
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    aria-hidden="true"
                                >
                                    <path
                                        d="m9 18 6-6-6-6"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </a>
                        </div>
                    </div>
                )}
        </div>
    );
}