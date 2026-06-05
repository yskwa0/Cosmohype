import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runTryOn } from '@/lib/aiFitting/provider'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    personImagePath?: string
    garmentImagePath?: string
    sourceType?: string
  }

  const { personImagePath, garmentImagePath, sourceType = 'upload' } = body
  if (!personImagePath || !garmentImagePath) {
    return NextResponse.json({ error: '画像パスが不足しています' }, { status: 400 })
  }

  // FASHN.ai に渡す短時間有効な signed URL を生成（15分）
  const [personSigned, garmentSigned] = await Promise.all([
    supabase.storage.from('ai-tryons').createSignedUrl(personImagePath, 900),
    supabase.storage.from('ai-tryons').createSignedUrl(garmentImagePath, 900),
  ])

  if (!personSigned.data?.signedUrl || !garmentSigned.data?.signedUrl) {
    return NextResponse.json({ error: '署名付きURLの生成に失敗しました' }, { status: 500 })
  }

  // DBには path を保存する（URL は期限切れになるため）
  const { data: tryon, error: insertError } = await supabase
    .from('virtual_tryons')
    .insert({
      user_id: user.id,
      person_image_url: personImagePath,
      garment_image_url: garmentImagePath,
      source_type: sourceType,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !tryon) {
    return NextResponse.json({ error: 'レコード作成に失敗しました' }, { status: 500 })
  }

  // FASHN.ai プロバイダー呼び出し（signed URL を渡す）
  const result = await runTryOn({
    personImageUrl: personSigned.data.signedUrl,
    garmentImageUrl: garmentSigned.data.signedUrl,
    tryonId: tryon.id,
  })

  if (result.success) {
    // 結果画像も path で保存する（将来: FASHN.ai → Storage に保存して path を使う）
    await supabase
      .from('virtual_tryons')
      .update({ status: 'completed', result_image_url: result.resultImageUrl })
      .eq('id', tryon.id)

    return NextResponse.json({ id: tryon.id, status: 'completed' })
  } else {
    await supabase
      .from('virtual_tryons')
      .update({ status: 'failed', error_message: result.error })
      .eq('id', tryon.id)

    return NextResponse.json(
      { id: tryon.id, status: 'failed', error: result.error },
      { status: 422 }
    )
  }
}

// 自分の試着履歴を取得（最新10件）
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('virtual_tryons')
    .select('id, status, result_image_url, garment_image_url, created_at, source_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tryons: data })
}
