"use client";

import {
    PointerEvent as ReactPointerEvent,
    useEffect,
    useRef,
    useState,
} from "react";

type AvatarEditorProps = {
    updateAction: (
        formData: FormData
    ) => void | Promise<void>;
};

const OUTPUT_SIZE = 800;

export function AvatarEditor({
                                 updateAction,
                             }: AvatarEditorProps) {
    const [imageUrl, setImageUrl] =
        useState<string | null>(null);

    const [fileName, setFileName] =
        useState("avatar.jpg");

    const [zoom, setZoom] =
        useState(1);

    const [position, setPosition] =
        useState({
            x: 0,
            y: 0,
        });

    const [isSaving, setIsSaving] =
        useState(false);

    const imageRef =
        useRef<HTMLImageElement | null>(
            null
        );

    const previewRef =
        useRef<HTMLDivElement | null>(
            null
        );

    const dragRef = useRef({
        dragging: false,
        startX: 0,
        startY: 0,
        positionX: 0,
        positionY: 0,
    });

    useEffect(() => {
        return () => {
            if (imageUrl) {
                URL.revokeObjectURL(
                    imageUrl
                );
            }
        };
    }, [imageUrl]);

    function handleFileChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        if (
            !file.type.startsWith(
                "image/"
            )
        ) {
            alert(
                "이미지 파일을 선택해주세요."
            );
            return;
        }

        if (
            file.size >
            5 * 1024 * 1024
        ) {
            alert(
                "프로필 사진은 5MB 이하만 가능합니다."
            );
            return;
        }

        if (imageUrl) {
            URL.revokeObjectURL(
                imageUrl
            );
        }

        setImageUrl(
            URL.createObjectURL(file)
        );

        setFileName(
            file.name ||
            "avatar.jpg"
        );

        setZoom(1);

        setPosition({
            x: 0,
            y: 0,
        });
    }

    function handlePointerDown(
        event: ReactPointerEvent<HTMLDivElement>
    ) {
        if (!imageUrl) {
            return;
        }

        event.currentTarget.setPointerCapture(
            event.pointerId
        );

        dragRef.current = {
            dragging: true,
            startX: event.clientX,
            startY: event.clientY,
            positionX: position.x,
            positionY: position.y,
        };
    }

    function handlePointerMove(
        event: ReactPointerEvent<HTMLDivElement>
    ) {
        if (
            !dragRef.current
                .dragging
        ) {
            return;
        }

        const nextX =
            dragRef.current
                .positionX +
            (event.clientX -
                dragRef.current
                    .startX);

        const nextY =
            dragRef.current
                .positionY +
            (event.clientY -
                dragRef.current
                    .startY);

        setPosition({
            x: nextX,
            y: nextY,
        });
    }

    function handlePointerUp(
        event: ReactPointerEvent<HTMLDivElement>
    ) {
        dragRef.current.dragging =
            false;

        if (
            event.currentTarget.hasPointerCapture(
                event.pointerId
            )
        ) {
            event.currentTarget.releasePointerCapture(
                event.pointerId
            );
        }
    }

    function handleReset() {
        setZoom(1);

        setPosition({
            x: 0,
            y: 0,
        });
    }

    function handleCancel() {
        if (imageUrl) {
            URL.revokeObjectURL(
                imageUrl
            );
        }

        setImageUrl(null);

        setZoom(1);

        setPosition({
            x: 0,
            y: 0,
        });
    }

    async function createCroppedFile() {
        const image =
            imageRef.current;

        const preview =
            previewRef.current;

        if (
            !image ||
            !preview
        ) {
            throw new Error(
                "사진을 불러오지 못했습니다."
            );
        }

        const naturalWidth =
            image.naturalWidth;

        const naturalHeight =
            image.naturalHeight;

        if (
            !naturalWidth ||
            !naturalHeight
        ) {
            throw new Error(
                "사진 크기를 확인할 수 없습니다."
            );
        }

        const previewSize =
            preview.clientWidth;

        if (!previewSize) {
            throw new Error(
                "미리보기 크기를 확인할 수 없습니다."
            );
        }

        /*
         * object-cover와 같은 방식:
         * 정사각형 미리보기 영역을
         * 사진이 완전히 덮도록 기본 배율 계산.
         */
        const coverScale =
            Math.max(
                previewSize /
                naturalWidth,
                previewSize /
                naturalHeight
            );

        const displayScale =
            coverScale * zoom;

        /*
         * 화면 가운데를 기준으로
         * 사용자가 움직인 위치를
         * 원본 이미지 좌표로 변환한다.
         */
        const sourceSize =
            previewSize /
            displayScale;

        const sourceCenterX =
            naturalWidth / 2 -
            position.x /
            displayScale;

        const sourceCenterY =
            naturalHeight / 2 -
            position.y /
            displayScale;

        let sourceX =
            sourceCenterX -
            sourceSize / 2;

        let sourceY =
            sourceCenterY -
            sourceSize / 2;

        /*
         * 원본 이미지 밖으로
         * 나가지 않도록 마지막 보정.
         */
        sourceX = Math.max(
            0,
            Math.min(
                sourceX,
                naturalWidth -
                sourceSize
            )
        );

        sourceY = Math.max(
            0,
            Math.min(
                sourceY,
                naturalHeight -
                sourceSize
            )
        );

        const canvas =
            document.createElement(
                "canvas"
            );

        canvas.width =
            OUTPUT_SIZE;

        canvas.height =
            OUTPUT_SIZE;

        const context =
            canvas.getContext("2d");

        if (!context) {
            throw new Error(
                "사진 편집을 시작할 수 없습니다."
            );
        }

        context.drawImage(
            image,
            sourceX,
            sourceY,
            sourceSize,
            sourceSize,
            0,
            0,
            OUTPUT_SIZE,
            OUTPUT_SIZE
        );

        const blob =
            await new Promise<Blob | null>(
                (resolve) => {
                    canvas.toBlob(
                        resolve,
                        "image/jpeg",
                        0.9
                    );
                }
            );

        if (!blob) {
            throw new Error(
                "사진을 저장하지 못했습니다."
            );
        }

        const baseName =
            fileName
                .replace(
                    /\.[^/.]+$/,
                    ""
                )
                .slice(0, 80) ||
            "avatar";

        return new File(
            [
                blob,
            ],
            `${baseName}-cropped.jpg`,
            {
                type: "image/jpeg",
            }
        );
    }

    async function handleSave() {
        if (
            !imageUrl ||
            isSaving
        ) {
            return;
        }

        setIsSaving(true);

        try {
            const croppedFile =
                await createCroppedFile();

            const formData =
                new FormData();

            formData.set(
                "avatar",
                croppedFile
            );

            await updateAction(
                formData
            );

            handleCancel();
        } catch (error) {
            console.error(
                "프로필 사진 저장 실패:",
                error
            );

            alert(
                error instanceof Error
                    ? error.message
                    : "프로필 사진을 저장하지 못했습니다."
            );
        } finally {
            setIsSaving(false);
        }
    }

    return (
        <div>
            <label className="text-[11px] font-bold text-gray-500">
                프로필 사진
            </label>

            {!imageUrl ? (
                <label className="mt-2 flex min-h-[52px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white px-4 text-xs font-bold text-gray-600 transition hover:bg-gray-50">
                    사진 선택

                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={
                            handleFileChange
                        }
                    />
                </label>
            ) : (
                <div className="mt-3">
                    {/* ========================================
                        사진 편집 영역
                    ======================================== */}

                    <div className="mx-auto w-full max-w-[360px]">
                        <div
                            ref={
                                previewRef
                            }
                            onPointerDown={
                                handlePointerDown
                            }
                            onPointerMove={
                                handlePointerMove
                            }
                            onPointerUp={
                                handlePointerUp
                            }
                            onPointerCancel={
                                handlePointerUp
                            }
                            className="relative aspect-square w-full touch-none select-none overflow-hidden rounded-full bg-gray-200 shadow-inner"
                        >
                            <img
                                ref={
                                    imageRef
                                }
                                src={
                                    imageUrl
                                }
                                alt="프로필 사진 위치 조정"
                                draggable={
                                    false
                                }
                                className="pointer-events-none absolute left-1/2 top-1/2 h-full w-full max-w-none object-cover"
                                style={{
                                    transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px)) scale(${zoom})`,
                                }}
                            />

                            {/* 원형 테두리 */}
                            <div className="pointer-events-none absolute inset-0 rounded-full border-[3px] border-white/90 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]" />

                            {/* 가운데 가이드 */}
                            <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-30">
                                <div className="h-px w-full bg-white" />
                                <div className="absolute h-full w-px bg-white" />
                            </div>
                        </div>

                        <p className="mt-3 text-center text-[10px] font-medium text-gray-400">
                            사진을 드래그해서
                            위치를 조정하세요.
                        </p>

                        {/* 확대 / 축소 */}
                        <div className="mt-4 flex items-center gap-3">
                            <span className="text-[16px] font-bold text-gray-400">
                                −
                            </span>

                            <input
                                type="range"
                                min="1"
                                max="3"
                                step="0.01"
                                value={
                                    zoom
                                }
                                onChange={(
                                    event
                                ) =>
                                    setZoom(
                                        Number(
                                            event
                                                .target
                                                .value
                                        )
                                    )
                                }
                                className="min-w-0 flex-1 accent-black"
                                aria-label="사진 확대 축소"
                            />

                            <span className="text-[16px] font-bold text-gray-700">
                                +
                            </span>
                        </div>

                        <div className="mt-2 flex justify-center">
                            <button
                                type="button"
                                onClick={
                                    handleReset
                                }
                                className="rounded-full px-3 py-1.5 text-[10px] font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                            >
                                위치 초기화
                            </button>
                        </div>
                    </div>

                    {/* 버튼 */}
                    <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                            type="button"
                            onClick={
                                handleCancel
                            }
                            disabled={
                                isSaving
                            }
                            className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                        >
                            취소
                        </button>

                        <button
                            type="button"
                            onClick={
                                handleSave
                            }
                            disabled={
                                isSaving
                            }
                            className="rounded-xl bg-black px-4 py-3 text-xs font-bold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {isSaving
                                ? "저장 중..."
                                : "이 사진으로 변경"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}