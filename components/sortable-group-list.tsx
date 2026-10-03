"use client";

import {
    Children,
    ReactNode,
    useEffect,
    useState,
    useTransition,
} from "react";

import {
    closestCenter,
    DndContext,
    DragEndEvent,
    PointerSensor,
    TouchSensor,
    useSensor,
    useSensors,
} from "@dnd-kit/core";

import {
    arrayMove,
    SortableContext,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

type GroupItem = {
    id: number;
    name: string;
};

export function SortableGroupList({
                                      groups,
                                      updateAction,
                                      children,
                                  }: {
    groups: GroupItem[];
    updateAction: (
        groupIds: number[]
    ) => Promise<void>;
    children: ReactNode;
}) {
    const [items, setItems] =
        useState(groups);

    const [isPending, startTransition] =
        useTransition();

    useEffect(() => {
        setItems(groups);
    }, [groups]);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 180,
                tolerance: 6,
            },
        })
    );

    const childArray =
        Children.toArray(children);

    function handleDragEnd(
        event: DragEndEvent
    ) {
        const { active, over } =
            event;

        if (
            !over ||
            active.id === over.id
        ) {
            return;
        }

        const oldIndex =
            items.findIndex(
                (item) =>
                    item.id ===
                    Number(active.id)
            );

        const newIndex =
            items.findIndex(
                (item) =>
                    item.id ===
                    Number(over.id)
            );

        if (
            oldIndex === -1 ||
            newIndex === -1
        ) {
            return;
        }

        const previousItems =
            items;

        const nextItems =
            arrayMove(
                items,
                oldIndex,
                newIndex
            );

        setItems(nextItems);

        startTransition(async () => {
            try {
                await updateAction(
                    nextItems.map(
                        (item) => item.id
                    )
                );
            } catch (error) {
                console.error(
                    "공간 순서 저장 실패:",
                    error
                );

                setItems(
                    previousItems
                );

                alert(
                    "공간 순서를 저장하지 못했어요."
                );
            }
        });
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={
                closestCenter
            }
            onDragEnd={
                handleDragEnd
            }
        >
            <SortableContext
                items={items.map(
                    (item) => item.id
                )}
                strategy={
                    verticalListSortingStrategy
                }
            >
                <div
                    className={
                        isPending
                            ? "opacity-80"
                            : ""
                    }
                >
                    {items.map(
                        (item) => {
                            const originalIndex =
                                groups.findIndex(
                                    (group) =>
                                        group.id ===
                                        item.id
                                );

                            const child =
                                childArray[
                                    originalIndex
                                    ];

                            if (!child) {
                                return null;
                            }

                            return (
                                <SortableGroup
                                    key={
                                        item.id
                                    }
                                    id={
                                        item.id
                                    }
                                >
                                    {child}
                                </SortableGroup>
                            );
                        }
                    )}
                </div>
            </SortableContext>
        </DndContext>
    );
}

function SortableGroup({
                           id,
                           children,
                       }: {
    id: number;
    children: ReactNode;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
    });

    const style = {
        transform:
            CSS.Transform.toString(
                transform
            ),
        transition,
        zIndex: isDragging
            ? 30
            : undefined,
        position: isDragging
            ? ("relative" as const)
            : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className={
                isDragging
                    ? "relative rounded-2xl bg-white shadow-[0_12px_35px_rgba(0,0,0,0.12)]"
                    : "relative"
            }
        >
            {children}

            <button
                type="button"
                aria-label="공간 순서 이동"
                title="드래그해서 공간 순서 변경"
                {...attributes}
                {...listeners}
                onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                }}
                className="absolute right-1 top-1/2 z-20 flex h-10 w-9 -translate-y-1/2 touch-none cursor-grab items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 active:scale-95 active:cursor-grabbing"
            >
                <DragHandleIcon />
            </button>
        </div>
    );
}

function DragHandleIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
            />
        </svg>
    );
}