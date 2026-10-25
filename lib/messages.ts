/**
 * Browser-side reads and writes for message templates and the message log.
 * Protected by the RLS in migration 029: members read templates, owner and
 * manager edit them; only owner and manager can read the log, and nobody can
 * write it from here. Sending goes through /api/messages/send.
 */

import { createClient } from '@/utils/supabase/client'
import { resolveTemplates, type ResolvedTemplate, type TemplateContent } from '@/lib/message-templates'
import type { CustomerMessage, MessageTemplateRow } from '@/types/database'

export async function listTemplateRows(tenantId: string): Promise<MessageTemplateRow[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('message_templates')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true })
  if (error) throw error
  return data ?? []
}

/** Built-ins merged with the business's edits and custom templates. */
export async function loadTemplates(tenantId: string): Promise<ResolvedTemplate[]> {
  return resolveTemplates(await listTemplateRows(tenantId))
}

/**
 * Save a template. A built-in is saved as an override row keyed by its
 * template_key; a custom template is inserted or updated by id.
 */
export async function saveTemplate(
  tenantId: string,
  userId: string | null,
  t: ResolvedTemplate,
  content: TemplateContent
): Promise<void> {
  const supabase = createClient()
  const fields = {
    name: content.name.trim() || 'Untitled template',
    category: t.key ? t.category : content.category,
    subject: content.subject,
    sms_body: content.sms_body,
    email_body: content.email_body,
    active: true,
    updated_at: new Date().toISOString(),
  }

  if (t.id) {
    const { error } = await supabase.from('message_templates').update(fields).eq('id', t.id)
    if (error) throw error
    return
  }

  const { error } = await supabase
    .from('message_templates')
    .insert({ ...fields, tenant_id: tenantId, template_key: t.key, created_by: userId })
  if (error) throw error
}

/** Drop the edits to a built-in so it goes back to the default wording. */
export async function restoreBuiltIn(templateId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('message_templates').delete().eq('id', templateId)
  if (error) throw error
}

export async function deleteCustomTemplate(templateId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('message_templates').delete().eq('id', templateId).is('template_key', null)
  if (error) throw error
}

export async function listJobMessages(jobId: string): Promise<CustomerMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .eq('job_id', jobId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function listRecentMessages(tenantId: string, limit = 50): Promise<CustomerMessage[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('customer_messages')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data ?? []
}
