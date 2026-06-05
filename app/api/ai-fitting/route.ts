import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { runTryOn } from '@/lib/aiFitting/provider'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    personImageUrl?: string
    garmentImageUrl?: string
    sourceType?: string
  }

  const { personImageUrl, garmentImageUrl, sourceType = 'upload' } = body
  if (!personImageUrl || !garmentImageUrl) {
    return NextResponse.json({ error: '画像URLが不足しています' }, { status: 400 })
  }

  // pending レコードを作成
  const { data: tryon, error: insertError } = await supabase
    .from('virtual_tryons')
    .insert({
      user_id: user.id,
      person_image_url: personImageUrl,
      garment_image_url: garmentImageUrl,
      source_type: sourceType,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !tryon) {
    return NextResponse.json({ error: 'レコード作成に失敗しました' }, { status: 500 })
  }

  // FASHN.ai プロバイダー呼び出し
  const result = await runTryOn({
    personImageUrl,
    garmentImageUrl,
    tryonId: tryon.id,
  })

  if (result.success) {
    await supabase
      .from('virtual_tryons')
      .update({ status: 'completed', result_image_url: result.resultImageUrl })
      .eq('id', tryon.id)

    return NextResponse.json({ id: tryon.id, status: 'completed', resultImageUrl: result.resultImageUrl })
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
    .select('id, status, result_image_url, created_at, source_type')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tryons: data })
}
