"use client";

import {
    throwIfFailed,
    type FormState,
} from "@/lib/form-state";
import {
    useEffect,
    useRef,
    useState,
} from "react";
import { friendlyErrorMessage } from "@/lib/friendly-error";
import { toast } from "@/lib/toast";

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

export type OptimisticCommentInput = {
    tempId: string;
    content: string;
    createdAt: string;

    parentId: number | null;

    replyToUser: {
        userId: string;
        nickname: string;
    } | null;

    mentions: {
        userId: string;
        nickname: string;
    }[];
};

type CommentFormProps = {
    postId: number;
    avatarUrl: string | null;
    currentUserId: string;
    members: Member[];

    createAction: (
        formData: FormData
    ) => Promise<FormState>;

    replyTarget?: ReplyTarget;

    onCancelReply?: () => void;

    onSubmitted?: (
        comment: OptimisticCommentInput
    ) => void;

    /** 등록 실패 시: 임시 댓글을 지우고 답글 대상을 되돌린다 */
    onSubmitFailed?: (
        tempId: string,
        replyTarget: ReplyTarget
    ) => void;
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
                                onSubmitFailed,
                            }: CommentFormProps) {
    const formRef =
        useRef<HTMLFormElement>(null);

    const inputRef =
        useRef<HTMLInputElement>(null);

    const [
        isSubmitting,
        setIsSubmitting,
    ] = useState(false);

    const submittingRef =
        useRef(false);

    const [
        mentionQuery,
        setMentionQuery,
    ] = useState<
        string | null
    >(null);

    const [
        selectedMentions,
        setSelectedMentions,
    ] = useState<Member[]>([]);

    // 등록 실패로 답글 대상을 되돌리는 중이면 true.
    // 이때는 아래 효과가 입력창을 "@닉네임 "으로 덮어쓰지 않게 한다.
    const restoringReplyRef =
        useRef(false);

    // ========================================
    // 답글 선택
    // ========================================

    useEffect(() => {
        if (!replyTarget) {
            return;
        }

        if (restoringReplyRef.current) {
            restoringReplyRef.current = false;
            return;
        }

        const input =
            inputRef.current;

        if (!input) {
            return;
        }

        input.value =
            `@${replyTarget.nickname} `;

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
    // 멘션 후보
    // ========================================

    const mentionCandidates =
        mentionQuery === null
            ? []
            : members
                .filter(
                    (member) => {
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
                .slice(0, 5);

    // ========================================
    // 입력 변경
    // ========================================

    function handleInputChange(
        event: React.ChangeEvent<HTMLInputElement>
    ) {
        const value =
            event.target.value;

        setSelectedMentions(
            (current) =>
                current.filter(
                    (member) =>
                        value.includes(
                            `@${member.nickname}`
                        )
                )
        );

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
    // 멘션 선택
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
            replaced + after;

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
    // 댓글 등록
    // ========================================

    async function handleSubmit(
        formData: FormData
    ) {
        // 화면이 다시 그려지기 전에 연달아 눌려도 한 번만 보낸다.
        // 처리 중에 누른 Enter는 무시하고, 쓰던 글은 그대로 둔다.
        if (submittingRef.current) {
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

        const submittedReplyTarget =
            replyTarget;

        const submittedMentions = [
            ...selectedMentions,
        ];

        const tempId =
            crypto.randomUUID();

        // ========================================
        // 서버보다 먼저 화면에 댓글 표시
        // ========================================

        onSubmitted?.({
            tempId,
            content,

            createdAt:
                new Date().toISOString(),

            parentId:
                submittedReplyTarget
                    ?.commentId ??
                null,

            replyToUser:
                submittedReplyTarget
                    ? {
                        userId:
                        submittedReplyTarget.userId,

                        nickname:
                        submittedReplyTarget.nickname,
                    }
                    : null,

            mentions:
                submittedMentions.map(
                    (member) => ({
                        userId:
                        member.userId,

                        nickname:
                        member.nickname,
                    })
                ),
        });

        submittingRef.current = true;

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

        try {
            // 운영 빌드에서도 서버 안내 문구를 받도록 결과값으로 받는다
            throwIfFailed(
                await createAction(
                    formData
                )
            );
        } catch (error) {
            console.error(
                "댓글 등록 실패:",
                error
            );

            const reason =
                friendlyErrorMessage(
                    error,
                    "댓글을 등록하지 못했어요. 잠시 후 다시 시도해주세요."
                );

            // 보내는 동안 입력창은 열려 있으므로(A4), 그사이 새 글을 쓰기
            // 시작했으면(답글·멘션 선택 포함) 그 글을 덮어쓰지 않는다.
            // 실패한 글은 앞부분을 토스트로 알려준다.
            const isWritingNext =
                (inputRef.current?.value.trim() ?? "") !== "";

            if (isWritingNext) {
                const preview =
                    content.length > 20
                        ? `${content.slice(0, 20)}…`
                        : content;

                toast.error(
                    `${reason} (보내지 못한 댓글: "${preview}")`
                );

                onSubmitFailed?.(
                    tempId,
                    null
                );

                return;
            }

            toast.error(reason);

            // 답글 대상을 되돌릴 때 입력창이 "@닉네임 "으로 덮이지 않게
            if (submittedReplyTarget) {
                restoringReplyRef.current = true;
            }

            // 임시 댓글 제거 + 답글 대상 복구
            onSubmitFailed?.(
                tempId,
                submittedReplyTarget
            );

            // 작성 내용과 멘션 복구
            // (다시 보내면 처음 의도대로 답글·멘션이 함께 저장된다)
            setSelectedMentions(
                submittedMentions
            );

            const input =
                inputRef.current;

            if (input) {
                input.value =
                    content;
            }

            // 복구한 글 끝으로 커서를 옮긴다
            requestAnimationFrame(() => {
                const restoredInput =
                    inputRef.current;

                if (!restoredInput) {
                    return;
                }

                restoredInput.focus();

                const length =
                    restoredInput.value.length;

                restoredInput.setSelectionRange(
                    length,
                    length
                );
            });
        } finally {
            submittingRef.current = false;

            setIsSubmitting(
                false
            );
        }
    }

    // ========================================
    // 폼 제출
    //
    // <form action>을 쓰면 React가 처리 후 입력창을 자동으로 비워
    // 실패 시 되돌린 글까지 지워진다. 직접 제출을 처리한다.
    // ========================================

    function handleFormSubmit(
        event: React.FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        void handleSubmit(
            new FormData(
                event.currentTarget
            )
        );
    }

    return (
        <div className="sticky bottom-0 z-20 mt-4 border-t border-black/[0.05] bg-white/95 px-1 pb-[calc(env(safe-area-inset-bottom)+8px)] pt-3 backdrop-blur-xl">
            {/* 답글 작성 중 */}

            {replyTarget && (
                <div className="mb-2 ml-9 flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2">
                    <p className="min-w-0 truncate text-[12px] text-gray-500">
                        <strong className="font-black text-blue-500">
                            @{replyTarget.nickname}
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
                        className="ml-3 shrink-0 text-[12px] font-bold text-gray-400 transition hover:text-gray-700"
                    >
                        취소
                    </button>
                </div>
            )}

            {/* 멘션 자동완성 */}

            {mentionCandidates.length >
                0 && (
                    <div className="absolute bottom-[calc(100%+6px)] left-9 right-1 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
                        {mentionCandidates.map(
                            (member) => (
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

            {/* 댓글 입력 */}

            <form
                ref={
                    formRef
                }
                onSubmit={
                    handleFormSubmit
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

                {selectedMentions.map(
                    (member) => (
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
                        // A4: 보내는 동안에도 입력창은 잠그지 않는다.
                        // 잠그면 포커스를 잃어 휴대폰 키보드가 내려간다.
                        // 중복 전송은 아래 전송 버튼 잠금과 submittingRef로 막는다.
                        onChange={
                            handleInputChange
                        }
                        placeholder={
                            replyTarget
                                ? `${replyTarget.nickname}님에게 답글...`
                                : "댓글 남기기..."
                        }
                        autoComplete="off"
                        className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-[16px] outline-none placeholder:text-gray-400 sm:text-[13px]"
                    />

                    <button
                        type="submit"
                        disabled={
                            isSubmitting
                        }
                        // 버튼을 눌러도 입력창 포커스(키보드)를 빼앗지 않는다
                        onMouseDown={(event) =>
                            event.preventDefault()
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