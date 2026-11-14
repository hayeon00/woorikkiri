import { unstable_rethrow } from "next/navigation";

/**
 * 서버 액션 오류를 사용자에게 보여주기 위한 도우미
 *
 * Next.js 운영 빌드는 서버 액션이 throw한 오류의 메시지를 감추고
 * digest만 클라이언트에 보낸다. 그래서 `throw new Error("초대코드가 ...")`
 * 같은 안내가 사용자에게 보이지 않고 기본 오류 화면이 뜬다.
 *
 * 폼용 래퍼(app/form-actions.ts)는 서버에서 오류를 잡아 FormState로
 * 돌려주고, ActionForm이 그 메시지를 화면에 보여준다.
 */

export type FormState = {
    status: "idle" | "success" | "error";
    message: string | null;
    /** 같은 메시지가 연속으로 와도 다시 표시되도록 구분하는 값 */
    at: number;
};

export const initialFormState: FormState = {
    status: "idle",
    message: null,
    at: 0,
};

export const GENERIC_ERROR_MESSAGE =
    "요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.";

const HANGUL = /[가-힣]/;

/**
 * 앱이 의도해서 던진 안내 문구(한국어)만 그대로 보여주고,
 * DB·라이브러리 내부 오류(영어)는 일반 문구로 바꾼다.
 */
export function toUserMessage(error: unknown): string {
    if (error instanceof Error && HANGUL.test(error.message)) {
        return error.message;
    }
    return GENERIC_ERROR_MESSAGE;
}

export async function runFormAction(
    action: () => Promise<unknown>,
    successMessage: string | null = null
): Promise<FormState> {
    try {
        await action();
        return {
            status: "success",
            message: successMessage,
            at: Date.now(),
        };
    } catch (error) {
        // redirect(), notFound() 등 Next.js 제어 흐름은 그대로 통과시킨다.
        unstable_rethrow(error);

        if (!(error instanceof Error && HANGUL.test(error.message))) {
            console.error("폼 처리 중 예상하지 못한 오류:", error);
        }

        return {
            status: "error",
            message: toUserMessage(error),
            at: Date.now(),
        };
    }
}
