import { createClient } from '@/utils/supabase/client'
import type { Profile } from '@/types/database'

export async function updateMyProfile(
  userId: string,
  updates: Partial<Pick<Profile, 'full_name' | 'phone' | 'emergency_contact' | 'vehicle' | 'qualifications' | 'licences'>>
): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}
