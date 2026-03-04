import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui'
import { listCharacters, listProgress, upsertProgress, clearProgress } from '../data'

// Colonnes JETONS / monnaies — tu pourras modifier après
const CURRENCY_COLS = [
  { key: 'KOLIZETONS', label: 'KOLIZÉTONS' },
  { key: 'ROSES_DES_SABLES', label: 'ROSES DES SABLES' },
  { key: 'ALMATONS', label: 'ALMATONS' },
  { key: 'PEPITES', label: 'PÉPITES' },
  { key: 'GLACE', label: 'GLACE' },
  { key: 'ORICHOR', label: 'ORICHOR' },
  { key: 'JETONS_RIKIKI', label: 'JETONS (EVENT)' },
]

function normalizeAccount(a) {
  const s = (a ?? '').toString().trim()
  return s || 'Sans compte'
}

function clampInt(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.trunc(n))
}

export default function Jetons() {
  const [rows, setRows] = useState([])
  const [prog, setProg] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [savingKey, setSavingKey] = useState(null)

  async function refresh() {
    setLoading(true); setErr(null)
    try {
      const [chars, p] = await Promise.all([
        listCharacters(),
        listProgress('currency'),
      ])
      setRows(chars || [])
      setProg(p || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  // Map: character_id -> currencyKey -> value_int
  const progMap = useMemo(() => {
    const m = {}
    for (const r of (prog || [])) {
      if (!m[r.character_id]) m[r.character_id] = {}
      m[r.character_id][r.key] = (r.value_int ?? null)
    }
    return m
  }, [prog])

  // Group by account
  const grouped = useMemo(() => {
    const map = {}
    for (const c of rows) {
      const key = normalizeAccount(c.account)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }
    // sort accounts 1..6 then others
    const keys = []
    for (let i = 1; i <= 6; i++) if (map[String(i)]?.length) keys.push(String(i))
    if (map['Sans compte']?.length) keys.push('Sans compte')
    for (const k of Object.keys(map).sort((a, b) => a.localeCompare(b, 'fr'))) {
      if (!keys.includes(k)) keys.push(k)
    }
    // sort characters by name inside
    keys.forEach(k => map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')))
    return { map, keys }
  }, [rows])

  async function saveValue(character_id, currencyKey, nextValueInt) {
    setSavingKey(`${character_id}:${currencyKey}`)
    try {
      if (nextValueInt === null || nextValueInt === 0) {
        // on garde la DB clean : 0 => on supprime la ligne
        await clearProgress({ character_id, category: 'currency', key: currencyKey })
      } else {
        await upsertProgress({
          character_id,
          category: 'currency',
          key: currencyKey,
          status: 'done', // pas utilisé ici, mais on met une valeur stable
          value_int: nextValueInt,
        })
      }
      setProg(await listProgress('currency'))
    } catch (e) {
      setErr(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  function bump(current, delta) {
    const c = clampInt(current) ?? 0
    return clampInt(c + delta)
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">Jetons</div>
          <div className="h-sub">Quantités (0 = vide). Boutons - / + ou saisie directe.</div>
        </div>
      </div>

      {err && (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub">{err}</div>
        </Card>
      )}

      {loading ? (
        <div className="h-sub">Chargement…</div>
      ) : (
        grouped.keys.map(acc => (
          <Card key={acc} className="grid" style={{ marginBottom: 12 }}>
            <div className="h-sub" style={{ fontWeight: 'bold' }}>
              Compte {acc}
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 8, minWidth: 900 }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', whiteSpace: 'nowrap', padding: 6 }}>Perso</th>
                    {CURRENCY_COLS.map(col => (
                      <th key={col.key} style={{ textAlign: 'center', whiteSpace: 'nowrap', padding: 6 }}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {grouped.map[acc].map(c => (
                    <tr key={c.id}>
                      <td style={{ whiteSpace: 'nowrap', padding: 6 }}>
                        <div style={{ fontWeight: 700 }}>{c.name}</div>
                        <div className="h-sub" style={{ marginTop: 2 }}>
                          {[c.clazz, c.level ? `Niv ${c.level}` : null].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </td>

                      {CURRENCY_COLS.map(col => {
                        const val = progMap?.[c.id]?.[col.key] ?? 0
                        const busy = savingKey === `${c.id}:${col.key}`
                        const display = (val ?? 0) === 0 ? '' : String(val)

                        return (
                          <td key={col.key} style={{ textAlign: 'center', padding: 6 }}>
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
                              <button
                                type="button"
                                className="btn ghost"
                                disabled={!!savingKey}
                                title={busy ? 'Sauvegarde…' : '-10'}
                                onClick={() => saveValue(c.id, col.key, bump(val, -10))}
                                style={{
                                  width: 40,
                                  height: 34,
                                  borderRadius: 10,
                                  border: '1px solid rgba(0,0,0,0.10)',
                                  fontWeight: 900,
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                {busy ? '…' : '-10'}
                              </button>

                              <input
                                value={display}
                                inputMode="numeric"
                                placeholder="0"
                                disabled={!!savingKey}
                                onChange={(e) => {
                                  const next = clampInt(e.target.value)
                                  // UX: laisse taper, mais on clamp quand même
                                  // Si vide => null (sera sauvegardé quand blur)
                                  // On n'écrit pas en DB à chaque frappe, on stocke local via setProg hack-free:
                                  // simple: on met à jour le progMap via setProg avec une copie
                                  const cid = c.id
                                  const key = col.key
                                  setProg(prev => {
                                    const nextArr = Array.isArray(prev) ? [...prev] : []
                                    // trouver la ligne existante
                                    const idx = nextArr.findIndex(r => r.character_id === cid && r.category === 'currency' && r.key === key)
                                    if (idx >= 0) {
                                      nextArr[idx] = { ...nextArr[idx], value_int: next }
                                    } else {
                                      nextArr.push({ character_id: cid, category: 'currency', key, value_int: next, status: 'done' })
                                    }
                                    return nextArr
                                  })
                                }}
                                onBlur={(e) => {
                                  const next = clampInt(e.target.value)
                                  saveValue(c.id, col.key, next ?? 0)
                                }}
                                style={{
                                  width: 78,
                                  height: 34,
                                  borderRadius: 10,
                                  border: '1px solid rgba(0,0,0,0.10)',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  background: 'white',
                                }}
                              />

                              <button
                                type="button"
                                className="btn ghost"
                                disabled={!!savingKey}
                                title={busy ? 'Sauvegarde…' : '+10'}
                                onClick={() => saveValue(c.id, col.key, bump(val, +10))}
                                style={{
                                  width: 40,
                                  height: 34,
                                  borderRadius: 10,
                                  border: '1px solid rgba(0,0,0,0.10)',
                                  fontWeight: 900,
                                  opacity: busy ? 0.6 : 1,
                                }}
                              >
                                {busy ? '…' : '+10'}
                              </button>
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {grouped.map[acc].length === 0 && (
                    <tr>
                      <td colSpan={CURRENCY_COLS.length + 1} className="h-sub" style={{ padding: 6 }}>
                        Aucun perso dans ce compte.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}