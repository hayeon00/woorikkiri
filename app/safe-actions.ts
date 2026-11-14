"use server";

import { runFormAction } from "@/lib/form-state";
import { createPost, updateAvatar, updatePost } from "./actions";

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
