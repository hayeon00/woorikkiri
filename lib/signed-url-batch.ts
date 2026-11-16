import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * F4: 서명 주소를 한 번에 만들어 경로별로 돌려준다
 *
 * 피드는 프로필 사진 주소를 사람마다 createSignedUrl로 따로 만들었다.
 * 경로를 모아 createSignedUrls 한 번으로 만들면 요청이 1번으로 줄고,
 * 게시물 사진 주소 생성과 동시에 실행할 수 있다.
 *
 * 빈 경로·중복은 걸러내고, 실패한 경로는 결과에서 빠진다
 * (호출하는 쪽은 주소가 없으면 기본 아이콘을 보여준다).
 */
export async function signUrlsByPath(
    supabase: SupabaseClient,
    bucket: string,
    paths: ReadonlyArray<string | null | undefined>,
    expiresInSeconds: number
): Promise<Map<string, string>> {
    const uniquePaths = [
        ...new Set(
            paths.filter(
                (path): path is string =>
                    typeof path === "string" && path.length > 0
            )
        ),
    ];

    const urls = new Map<string, string>();

    if (uniquePaths.length === 0) {
        return urls;
    }

    const { data, error } = await supabase.storage
        .from(bucket)
        .createSignedUrls(uniquePaths, expiresInSeconds);

    if (error) {
        console.error(`${bucket} 서명 주소 일괄 생성 실패:`, error);
        return urls;
    }

    data?.forEach((item, index) => {
        if (item.signedUrl && !item.error) {
            urls.set(uniquePaths[index], item.signedUrl);
        }
    });

    return urls;
}
