import { supabase } from './supabaseClient'

async function requireUserId() {
  const { data } = await supabase.auth.getUser()
  const user_id = data?.user?.id
  if (!user_id) throw new Error('Not authenticated')
  return user_id
}

// =============================
// CHARACTERS
// =============================

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

// =============================
// LEGACY PROGRESS (old tables)
// (on les garde pour ne pas casser le site)
// =============================

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

// =============================
// NEW PROGRESS (character_progress)
// (notre nouveau système "tableur")
// =============================

export async function listProgress(category) {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('character_progress')
    .select('id, character_id, category, key, status, value_int, updated_at')
    .eq('user_id', user_id)
    .eq('category', category)

  if (error) throw error
  return data || []
}

export async function upsertProgress({
  character_id,
  category,
  key,
  status = 'none',
  value_int = null
}) {
  const user_id = await requireUserId()

  const payload = {
    user_id,
    character_id,
    category,
    key,
    status,
    value_int
  }

  const { data, error } = await supabase
    .from('character_progress')
    .upsert(payload, { onConflict: 'user_id,character_id,category,key' })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function clearProgress({ character_id, category, key }) {
  const user_id = await requireUserId()

  const { error } = await supabase
    .from('character_progress')
    .delete()
    .eq('user_id', user_id)
    .eq('character_id', character_id)
    .eq('category', category)
    .eq('key', key)

  if (error) throw error
  return true
}

// =============================
// ITEMS
// =============================

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

// =============================
// ACCOUNT BANKS (Monnaie)
// =============================

export async function listAccountBanks() {
  const user_id = await requireUserId()
  const { data, error } = await supabase
    .from('account_banks')
    .select('id, account, value_int, updated_at')
    .eq('user_id', user_id)

  if (error) throw error
  return data || []
}

export async function upsertAccountBank({ account, value_int = 0 }) {
  const user_id = await requireUserId()

  const payload = {
    user_id,
    account: String(account),
    value_int: value_int ?? 0,
  }

  const { data, error } = await supabase
    .from('account_banks')
    .upsert(payload, { onConflict: 'user_id,account' })
    .select()
    .single()

  if (error) throw error
  return data
}