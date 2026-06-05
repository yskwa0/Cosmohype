-- profiles に AI Fitting 用の全身写真カラムを追加
-- ai_fitting_body_image_url には Storage path を保存する（public URL ではない）
-- 例: {userId}/body/body.jpg
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS ai_fitting_body_image_url         text,
  ADD COLUMN IF NOT EXISTS ai_fitting_body_image_updated_at  timestamptz;

-- ai-tryons バケットは private のまま維持する。
-- 表示時は createSignedUrl で短時間有効な URL を生成して使用する。
