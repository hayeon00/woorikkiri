/**
 * 화면 하단 안내 메시지 (토스트)
 *
 * 어디서든 toast.success("...") 처럼 부르면 components/toaster.tsx가 표시한다.
 * 브라우저 alert()는 PWA에서 앱 흐름을 끊고 주소창 이름이 함께 떠서 쓰지 않는다.
 */

export type ToastKind = "success" | "error" | "info";

export type ToastItem = {
    id: number;
    kind: ToastKind;
    message: string;
};

type Listener = (item: ToastItem) => void;

const listeners = new Set<Listener>();
let nextId = 1;

function emit(kind: ToastKind, message: string) {
    const item = { id: nextId++, kind, message };
    listeners.forEach((listener) => listener(item));
}

export const toast = {
    success: (message: string) => emit("success", message),
    error: (message: string) => emit("error", message),
    info: (message: string) => emit("info", message),
};

export function subscribeToasts(listener: Listener) {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}
