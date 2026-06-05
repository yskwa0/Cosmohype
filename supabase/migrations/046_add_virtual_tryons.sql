-- virtual_tryons: AI Fitting のリクエスト履歴・結果を保存するテーブル
CREATE TABLE IF NOT EXISTS public.virtual_tryons (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id           uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  person_image_url  text        NOT NULL,
  garment_image_url text        NOT NULL,
  -- 'upload' | 'style_planet' : 服画像の出所。将来のSTYLE PLANET連携で使う
  source_type       text        NOT NULL DEFAULT 'upload',
  -- 'pending' | 'processing' | 'completed' | 'failed'
  status            text        NOT NULL DEFAULT 'pending',
  result_image_url  text,
  error_message     text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.virtual_tryons ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のレコードのみ参照可能
CREATE POLICY "virtual_tryons_select_own"
  ON public.virtual_tryons FOR SELECT
  USING (auth.uid() = user_id);

-- ユーザーは自分名義でのみ INSERT 可能
CREATE POLICY "virtual_tryons_insert_own"
  ON public.virtual_tryons FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- API Route (service role) が status / result を更新できる
CREATE POLICY "virtual_tryons_update_service"
  ON public.virtual_tryons FOR UPDATE
  USING (true);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_virtual_tryons_updated_at ON public.virtual_tryons;
CREATE TRIGGER trg_virtual_tryons_updated_at
  BEFORE UPDATE ON public.virtual_tryons
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ai-tryons Storage バケット（非公開）
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-tryons', 'ai-tryons', false)
ON CONFLICT (id) DO NOTHING;

-- ユーザーは自分のフォルダにのみアップロード可能
CREATE POLICY "ai_tryons_upload_own"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-tryons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- ユーザーは自分のオブジェクトのみ参照可能
CREATE POLICY "ai_tryons_select_own"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'ai-tryons'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
