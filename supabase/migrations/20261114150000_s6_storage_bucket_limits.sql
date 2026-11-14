-- ============================================================
-- S6: 사진 버킷 업로드 형식 제한
--
-- 운영 버킷은 대시보드에서 만들어져 file_size_limit 5MB, allowed_mime_types
-- 'image/*'였다. image/*는 SVG(스크립트를 담을 수 있음)까지 허용하므로
-- 사진 형식만 허용하도록 좁힌다. 크기 제한(5MB)은 그대로 유지한다.
--
-- 버킷이 마이그레이션 밖에서 만들어졌기 때문에, 로컬·새 환경에서도 같은
-- 설정이 되도록 upsert한다. 운영에는 allowed_mime_types만 바뀐다.
-- (iPhone 사진을 위해 heic/heif 포함)
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('post-images', 'post-images', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']),
  ('avatars', 'avatars', false, 5242880,
   ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'])
ON CONFLICT (id) DO UPDATE
SET file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
