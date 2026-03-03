import { supabase } from './supabaseClient'

async function requireUserId() {
  const { data } = await supabase.auth.getUser()
  const user_id = data?.user?.id
  if (!user_id) throw new Error('Not authenticated')
  return user_id
}

export async function listCharacters() {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', user_id)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function upsertCharacter(character) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('characters')
    .upsert({ ...character, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteCharacter(id) {
  const { error } = await supabase.from('characters').delete().eq('id', id)
  if (error) throw error
}

export async function listDofusForCharacter(character_id) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('dofus_progress')
    .select('id, character_id, dofus_name, status')
    .eq('user_id', user_id)
    .eq('character_id', character_id)
    .order('dofus_name', { ascending: true })
  if (error) throw error
  return data
}

export async function listObjectivesForCharacter(character_id) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('objective_progress')
    .select('id, character_id, objective_name, status')
    .eq('user_id', user_id)
    .eq('character_id', character_id)
    .order('objective_name', { ascending: true })
  if (error) throw error
  return data
}

export async function listItemsForCharacter(character_id) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('items')
    .select('id, character_id, name, category, comment')
    .eq('user_id', user_id)
    .eq('character_id', character_id)
    .order('name', { ascending: true })
  if (error) throw error
  return data
}

export async function setProgress(table, id, status) {
  const { data, error } = await supabase
    .from(table)
    .update({ status })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addProgressRow(table, row) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from(table)
    .insert({ ...row, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function addItem(row) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('items')
    .insert({ ...row, user_id })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) throw error
}
