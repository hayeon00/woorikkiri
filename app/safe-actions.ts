"use server";

import { runFormAction } from "@/lib/form-state";
import {
    createComment,
    createPost,
    deleteComment,
    deletePost,
    updateAvatar,
    updatePost,
} from "./actions";

/**
 * 클라이언트 컴포넌트에서 직접 부르는 서버 액션의 래퍼.
 *
 * 운영 빌드에서는 throw된 메시지가 감춰지므로, 서버에서 오류를 잡아
 * FormState로 돌려준다. 클라이언트는 throwIfFailed()로 다시 Error로 바꿔
 * 기존 catch 처리(메시지 표시)를 그대로 쓴다.
 */

export async function createPostSafe(formData: FormData) {
    return runFormAction(() => createPost(formData));
}

export async function updateAvatarSafe(formData: FormData) {
    return runFormAction(() => updateAvatar(formData));
}

export async function updatePostSafe(formData: FormData) {
    return runFormAction(() => updatePost(formData));
}

/**
 * 댓글·답글 등록 (A3)
 *
 * 실패 이유("답글을 작성할 댓글을 찾을 수 없습니다." 등)를 운영 빌드에서도
 * 클라이언트에 전달해, 댓글 창이 토스트로 안내하고 입력 내용을 되돌릴 수 있게 한다.
 */
export async function createCommentSafe(formData: FormData) {
    return runFormAction(() => createComment(formData));
}

/** 폼 값이 양의 정수 ID가 아니면 null (기존처럼 조용히 무시하기 위함) */
function positiveId(value: FormDataEntryValue | null): number | null {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

/**
 * 게시글·댓글 삭제 (A1)
 *
 * 예전에는 삭제 실패(두 번 누름, 연결 끊김 등)가 그대로 throw되어
 * 피드 전체가 오류 화면으로 바뀌었다. 결과값으로 돌려주면
 * 화면은 그대로 두고 토스트로만 안내할 수 있다.
 */
export async function deletePostSafe(formData: FormData) {
    return runFormAction(async () => {
        const postId = positiveId(formData.get("post_id"));
        if (postId === null) return;
        await deletePost(postId);
    });
}

export async function deleteCommentSafe(formData: FormData) {
    return runFormAction(async () => {
        const commentId = positiveId(formData.get("comment_id"));
        if (commentId === null) return;
        await deleteComment(commentId);
    });
}
