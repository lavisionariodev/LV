const DEFAULT_BUCKET = 'seller-documents'

/**
 * @param {Record<string, unknown>} row
 * @param {import('@supabase/supabase-js').SupabaseClient | null | undefined} supabaseAdmin
 */
export async function mapSellerDocumentRow(row, supabaseAdmin) {
  let signedUrl = null
  if (row.storage_path && supabaseAdmin) {
    const { data } = await supabaseAdmin.storage
      .from(String(row.storage_bucket || DEFAULT_BUCKET))
      .createSignedUrl(String(row.storage_path), 60 * 10, { download: false })
    signedUrl = data?.signedUrl || null
  }

  return {
    id: row.id,
    sellerUserId: row.seller_user_id,
    documentType: row.document_type,
    displayName: row.display_name,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    fileSize: row.file_size,
    status: row.status,
    rejectionReason: row.rejection_reason,
    submittedAt: row.submitted_at,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    previewUrl: signedUrl,
    downloadUrl: signedUrl,
  }
}
