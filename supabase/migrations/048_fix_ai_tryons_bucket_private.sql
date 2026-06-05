-- 047 で誤って public=true に設定された ai-tryons バケットを private に戻す
-- 冪等: 既に public=false の場合も安全に実行できる
UPDATE storage.buckets
SET public = false
WHERE id = 'ai-tryons';
