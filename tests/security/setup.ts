// Node 20에는 전역 WebSocket이 없어 supabase-js(realtime) 초기화가 실패한다.
import WebSocket from "ws";

if (!("WebSocket" in globalThis)) {
    (globalThis as unknown as { WebSocket: unknown }).WebSocket = WebSocket;
}
