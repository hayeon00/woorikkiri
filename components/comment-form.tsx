"use client";

import {
    useEffect,
    useRef,
    useState,
} from "react";

type Member = {
    userId: string;
    nickname: string;
    avatarUrl: string | null;
};

type ReplyTarget = {
    commentId: number;
    userId: string;
    nickname: string;
} | null;

type CommentFormProps = {
    postId: number;
    avatarUrl: string | null;
    currentUserId: string;
    members: Member[];

    createAction: (
        formData: FormData
    ) => void | Promise<void>;

    replyTarget?: ReplyTarget;
    onCancelReply?: () => void;
    onSubmitted?: () => void;
};

export function CommentForm({
                                postId,
                                avatarUrl,
                                currentUserId,
                                members,
                                createAction,
                                replyTarget = null,
                                onCancelReply,
                                onSubmitted,
                            }: CommentFormProps) {
    const formRef =
        useRef<HTMLFormElement>(null);

    const inputRef =
        useRef<HTMLInputElement>(null);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const [
        mentionQuery,
        setMentionQuery,
    ] = useState<string | null>(
        null
    );

    // ========================================
    // 사용자가 자동완성에서 직접 선택한 멘션만 저장
    // ========================================

    const [
        selectedMentions,
        setSelectedMentions,
    ] = useState<Member[]>([]);

    // ========================================
    // 답글 선택
    //
    // @닉네임은 입력창에 보여주지만
    // mention_user_ids에는 넣지 않는다.
    // 서버에서는 parent_id를 보고 reply로 판단한다.
    // ========================================

    useEffect(() => {
        if (!replyTarget) {
            return;
        }

        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        input.value =
            `@${replyTarget.nickname} `;

        // 답글 대상은 직접 멘션이 아님
        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        input.focus();

        const length =
            input.value.length;

        input.setSelectionRange(
            length,
            length
        );
    }, [replyTarget]);

    // ========================================
    // 멘션 자동완성 후보
    // ========================================

    const mentionCandidates =
        mentionQuery === null
            ? []
            : members
                .filter(
                    (member) => {
                        // 자기 자신 제외
                        if (
                            member.userId ===
                            currentUserId
                        ) {
                            return false;
                        }

                        const query =
                            mentionQuery
                                .trim()
                                .toLowerCase();

                        if (!query) {
                            return true;
                        }

                        return member.nickname
                            .toLowerCase()
                            .includes(
                                query
                            );
                    }
                )
                .slice(
                    0,
                    5
                );

    // ========================================
    // 입력 변경
    // ========================================

    function handleInputChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const value =
            event.target.value;

        // ========================================
        // 이미 선택했던 멘션 중
        // 실제 입력창에서 삭제된 멘션 제거
        // ========================================

        setSelectedMentions(
            (current) =>
                current.filter(
                    (member) =>
                        value.includes(
                            `@${member.nickname}`
                        )
                )
        );

        // ========================================
        // 현재 커서 앞에서 @ 입력 중인지 확인
        // ========================================

        const cursor =
            event.target
                .selectionStart ??
            value.length;

        const beforeCursor =
            value.slice(
                0,
                cursor
            );

        const match =
            beforeCursor.match(
                /(?:^|\s)@([^\s@]*)$/
            );

        if (!match) {
            setMentionQuery(
                null
            );

            return;
        }

        setMentionQuery(
            match[1]
        );
    }

    // ========================================
    // 직접 멘션 선택
    // ========================================

    function selectMention(
        member: Member
    ) {
        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        const value =
            input.value;

        const cursor =
            input.selectionStart ??
            value.length;

        const before =
            value.slice(
                0,
                cursor
            );

        const after =
            value.slice(
                cursor
            );

        const replaced =
            before.replace(
                /(?:^|\s)@([^\s@]*)$/,
                (match) => {
                    const prefix =
                        match.startsWith(
                            " "
                        )
                            ? " "
                            : "";

                    return `${prefix}@${member.nickname} `;
                }
            );

        input.value =
            replaced +
            after;

        // 직접 자동완성에서 선택한 사람만
        // 실제 mention_user_ids로 전달
        setSelectedMentions(
            (current) => {
                if (
                    current.some(
                        (item) =>
                            item.userId ===
                            member.userId
                    )
                ) {
                    return current;
                }

                return [
                    ...current,
                    member,
                ];
            }
        );

        setMentionQuery(
            null
        );

        requestAnimationFrame(
            () => {
                input.focus();

                const position =
                    replaced.length;

                input.setSelectionRange(
                    position,
                    position
                );
            }
        );
    }

    // ========================================
    // 답글 취소
    // ========================================

    function handleCancelReply() {
        formRef.current?.reset();

        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        onCancelReply?.();
    }

    // ========================================
    // 등록
    // ========================================

    async function handleSubmit(
        formData: FormData
    ) {
        if (isSubmitting) {
            return;
        }

        const content =
            String(
                formData.get(
                    "content"
                ) ?? ""
            ).trim();

        if (!content) {
            return;
        }

        // ========================================
        // 서버 응답을 기다리기 전에
        // 입력창을 즉시 비워서
        // 댓글 등록 체감 속도를 높인다.
        // ========================================

        setIsSubmitting(
            true
        );

        formRef.current?.reset();

        setSelectedMentions(
            []
        );

        setMentionQuery(
            null
        );

        onSubmitted?.();

        try {
            await createAction(
                formData
            );
        } catch (error) {
            console.error(
                "댓글 등록 실패:",
                error
            );

            // 등록에 실패했을 경우
            // 사용자가 작성했던 내용을 복원한다.
            const input =
                inputRef.current;

            if (input) {
                input.value =
                    content;

                input.focus();

                const length =
                    input.value.length;

                input.setSelectionRange(
                    length,
                    length
                );
            }
        } finally {
            setIsSubmitting(
                false
            );
        }
    }

    return (
        <div className="sticky bottom-0 z-20 mt-4 border-t border-black/[0.05] bg-white/95 px-1 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 backdrop-blur-xl">
            {/* ========================================
                답글 작성 중
            ======================================== */}

            {replyTarget && (
                <div className="mb-2 ml-9 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <p className="min-w-0 truncate text-[10px] text-gray-500">
                        <strong className="font-black text-blue-500">
                            @
                            {
                                replyTarget.nickname
                            }
                        </strong>

                        <span>
                            {" "}
                            님에게 답글 작성 중
                        </span>
                    </p>

                    <button
                        type="button"
                        onClick={
                            handleCancelReply
                        }
                        className="ml-3 shrink-0 text-[10px] font-bold text-gray-400 transition hover:text-gray-700"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* ========================================
                멘션 자동완성

                sticky 입력창 바로 위에 표시
            ======================================== */}

            {mentionCandidates.length >
                0 && (
                    <div className="absolute bottom-[calc(100%+6px)] left-9 right-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                        {mentionCandidates.map(
                            (
                                member
                            ) => (
                                <button
                                    key={
                                        member.userId
                                    }
                                    type="button"
                                    onMouseDown={(
                                        event
                                    ) => {
                                        event.preventDefault();
                                    }}
                                    onClick={() =>
                                        selectMention(
                                            member
                                        )
                                    }
                                    className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition hover:bg-gray-50"
                                >
                                    {member.avatarUrl ? (
                                        <img
                                            src={
                                                member.avatarUrl
                                            }
                                            alt=""
                                            className="h-7 w-7 shrink-0 rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                                            <UserIcon />
                                        </div>
                                    )}

                                    <span className="min-w-0 flex-1 truncate text-[12px] font-bold text-gray-700">
                                    {
                                        member.nickname
                                    }
                                </span>

                                    <span className="shrink-0 text-[11px] font-black text-blue-500">
                                    @
                                </span>
                                </button>
                            )
                        )}
                    </div>
                )}

            {/* ========================================
                댓글 입력
            ======================================== */}

            <form
                ref={
                    formRef
                }
                action={
                    handleSubmit
                }
                className="flex items-center gap-2"
            >
                <input
                    type="hidden"
                    name="post_id"
                    value={
                        postId
                    }
                />

                {replyTarget && (
                    <input
                        type="hidden"
                        name="parent_id"
                        value={
                            replyTarget.commentId
                        }
                    />
                )}

                {/* 직접 선택한 멘션만 서버로 전송 */}
                {selectedMentions.map(
                    (
                        member
                    ) => (
                        <input
                            key={
                                member.userId
                            }
                            type="hidden"
                            name="mention_user_ids"
                            value={
                                member.userId
                            }
                        />
                    )
                )}

                {/* 내 프로필 */}
                {avatarUrl ? (
                    <img
                        src={
                            avatarUrl
                        }
                        alt="내 프로필"
                        className="h-7 w-7 shrink-0 rounded-full object-cover"
                    />
                ) : (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-400">
                        <UserIcon />
                    </div>
                )}

                <div className="flex min-w-0 flex-1 items-center rounded-full bg-[#f5f5f5]">
                    <input
                        ref={
                            inputRef
                        }
                        type="text"
                        name="content"
                        maxLength={
                            300
                        }
                        required
                        disabled={
                            isSubmitting
                        }
                        onChange={
                            handleInputChange
                        }
                        placeholder={
                            isSubmitting
                                ? "등록 중..."
                                : replyTarget
                                    ? `${replyTarget.nickname}님에게 답글...`
                                    : "댓글 남기기..."
                        }
                        autoComplete="off"
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[16px] outline-none placeholder:text-gray-400 disabled:opacity-60 sm:text-[13px]"
                    />

                    <button
                        type="submit"
                        disabled={
                            isSubmitting
                        }
                        aria-label={
                            isSubmitting
                                ? "댓글 등록 중"
                                : replyTarget
                                    ? "답글 등록"
                                    : "댓글 등록"
                        }
                        className="mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-950 text-white transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        {isSubmitting ? (
                            <LoadingIcon />
                        ) : (
                            <ArrowUpIcon />
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}

function UserIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <circle
                cx="12"
                cy="8"
                r="4"
                stroke="currentColor"
                strokeWidth="1.8"
            />

            <path
                d="M4 21a8 8 0 0 1 16 0"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
            />
        </svg>
    );
}

function ArrowUpIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
        >
            <path
                d="M12 19V5M5 12l7-7 7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
            className="animate-spin"
        >
            <circle
                cx="12"
                cy="12"
                r="9"
                stroke="currentColor"
                strokeWidth="2"
                className="opacity-25"
            />

            <path
                d="M21 12a9 9 0 0 0-9-9"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}