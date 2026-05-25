import { NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'

async function deleteStorageFolder(
  admin: ReturnType<typeof createAdminClient>,
  bucket: string,
  prefix: string,
): Promise<void> {
  const { data: items, error } = await admin.storage.from(bucket).list(prefix)
  if (error) {
    console.error(`[account/delete] list ${bucket}/${prefix} failed:`, error.message)
    return
  }
  if (!items || items.length === 0) return

  const filePaths: string[] = []
  const folderNames: string[] = []

  for (const item of items) {
    // id が null のものはサブフォルダ
    if (item.id === null) {
      folderNames.push(item.name)
    } else {
      filePaths.push(`${prefix}/${item.name}`)
    }
  }

  if (filePaths.length > 0) {
    const { error: removeError } = await admin.storage.from(bucket).remove(filePaths)
    if (removeError) {
      console.error(`[account/delete] remove from ${bucket} failed:`, removeError.message, filePaths)
    }
  }

  for (const folderName of folderNames) {
    await deleteStorageFolder(admin, bucket, `${prefix}/${folderName}`)
  }
}

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  // avatars/<userId>/ 以下を削除
  await deleteStorageFolder(admin, 'avatars', user.id)

  // posts/<userId>/ 以下を再帰的に削除（<userId>/<postId>/<index>.<ext>）
  await deleteStorageFolder(admin, 'posts', user.id)

  // Auth ユーザー削除（profiles.id → auth.users(id) ON DELETE CASCADE で DB データも全削除）
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id)

  if (deleteError) {
    console.error('[account/delete] deleteUser error:', deleteError.message)
    return NextResponse.json({ error: deleteError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
