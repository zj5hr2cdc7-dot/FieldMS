import { createClient } from '@/utils/supabase/client'
import type { TenantBranding } from '@/types/forms'

const BUCKET = 'branding'

export const DEFAULT_BRANDING: Omit<TenantBranding, 'tenant_id' | 'created_at' | 'updated_at'> = {
  trading_name: null,
  acn: null,
  license_number: null,
  contractor_license: null,
  electrical_license: null,
  postal_address: null,
  business_address: null,
  social_links: {},
  primary_color: '#4a9c4a',
  secondary_color: '#1a2332',
  accent_color: '#0ea5e9',
  font_family: 'Inter',
  logo_path: null,
  watermark_path: null,
  header_image_path: null,
  footer_image_path: null,
  stamp_path: null,
  logo_position: 'right',
  paper_size: 'A4',
  show_page_numbers: true,
  show_watermark: false,
  doc_number_format: '{PREFIX}-{YYYY}-{SEQ4}',
  email_signature: null,
  footer_text: null,
}

export async function getBranding(tenantId: string): Promise<TenantBranding | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenant_branding')
    .select('*')
    .eq('tenant_id', tenantId)
    .single()
  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }
  return data as TenantBranding
}

export async function upsertBranding(
  tenantId: string,
  updates: Partial<Omit<TenantBranding, 'tenant_id' | 'created_at' | 'updated_at'>>
): Promise<TenantBranding> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenant_branding')
    .upsert({ tenant_id: tenantId, ...updates }, { onConflict: 'tenant_id' })
    .select()
    .single()
  if (error) throw error
  return data as TenantBranding
}

export type BrandingAssetKind = 'logo' | 'watermark' | 'header_image' | 'footer_image' | 'stamp'

export async function uploadBrandingAsset(
  tenantId: string,
  kind: BrandingAssetKind,
  file: File
): Promise<string> {
  const supabase = createClient()
  const ext = file.name.split('.').pop() ?? 'png'
  const path = `${tenantId}/${kind}_${Date.now()}.${ext}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  })
  if (error) throw error
  await upsertBranding(tenantId, { [`${kind}_path`]: path } as Partial<TenantBranding>)
  return path
}

export async function getBrandingAssetUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  const supabase = createClient()
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600)
  return data?.signedUrl ?? null
}
