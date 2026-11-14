-- ============================================================
-- S1 점검 (읽기 전용, SELECT만 포함)
--
-- 사진 경로의 폴더 주인과 게시물 작성자가 다른 행을 찾는다.
-- 결과가 0행이면 S1 취약점이 악용된 흔적이 없다는 뜻이다.
-- 결과가 있으면 삭제하지 말고 먼저 내용을 검토한다.
--
-- 실행: Supabase 대시보드 > SQL Editor (운영 DB에 쓰기 작업 없음)
-- 이 파일은 migrations 폴더 밖에 있어 `supabase db push`로 적용되지 않는다.
-- ============================================================

select
    'posts.image_path' as source,
    p.id               as post_id,
    p.group_id,
    p.user_id          as post_author,
    split_part(p.image_path, '/', 1) as path_owner,
    p.image_path,
    p.created_at
from public.posts p
where p.image_path is not null
  and p.user_id is not null
  and split_part(p.image_path, '/', 1) <> p.user_id::text

union all

select
    'post_images.image_path',
    p.id,
    p.group_id,
    p.user_id,
    split_part(pi.image_path, '/', 1),
    pi.image_path,
    pi.created_at
from public.post_images pi
join public.posts p on p.id = pi.post_id
where p.user_id is not null
  and split_part(pi.image_path, '/', 1) <> p.user_id::text

order by created_at desc;
