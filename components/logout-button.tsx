"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import {
  browserPushEnvironment,
  deletePushSubscriptionForEndpoint,
  readCurrentPushEndpoint,
  unsubscribeCurrentPush,
} from "@/lib/push-subscription-cleanup";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();

    // 로그아웃 전에 이 기기의 푸시 구독을 해제한다 (S3)
    const pushEnv = browserPushEnvironment();
    const endpoint = await readCurrentPushEndpoint(pushEnv);
    if (endpoint) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        try {
          await deletePushSubscriptionForEndpoint(supabase, user.id, endpoint);
        } catch (error) {
          console.error("로그아웃 시 푸시 구독 삭제 실패:", error);
        }
      }
    }
    await unsubscribeCurrentPush(pushEnv);

    await supabase.auth.signOut();
    router.push("/auth/login");
  };

  return <Button onClick={logout}>Logout</Button>;
}
