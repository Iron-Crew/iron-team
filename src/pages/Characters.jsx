import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui'
import { listCharacters, listProgress, upsertProgress } from '../data'

const STAT_COLS = [
  { key: 'VITALITE', label: 'Vitalité', color: '#111827' },      // noir
  { key: 'SAGESSE', label: 'Sagesse', color: '#7c3aed' },        // violet
  { key: 'FORCE', label: 'Force', color: '#8b5a2b' },            // marron
  { key: 'INTELLIGENCE', label: 'Intelligence', color: '#d04b4b' }, // rouge doux
  { key: 'CHANCE', label: 'Chance', color: '#60a5fa' },          // bleu pâle
  { key: 'AGILITE', label: 'Agilité', color: '#22c55e' },         // vert
]

function normalizeAccount(a) {
  const s = (a ?? '').toString().trim()
  return s || 'Sans compte'
}

function clampNullableInt(v) {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(0, Math.trunc(n))
}

function isOk100(v) {
  return Number(v) === 100
}

// tri-state stocké en INT: 0 (vide) -> 1 (X) -> 2 (O) -> 0
function nextTriInt(v) {
  const n = Number(v) || 0
  if (n === 0) return 1
  if (n === 1) return 2
  return 0
}

function triLabel(v) {
  const n = Number(v) || 0
  if (n === 1) return 'X'
  if (n === 2) return 'O'
  return ''
}

function triBg(v) {
  const n = Number(v) || 0
  if (n === 1) return 'rgba(34,197,94,0.25)'   // vert clair
  if (n === 2) return 'rgba(245,158,11,0.25)'  // ocre
  return 'white'
}

export default function Characters() {
  const [rows, setRows] = useState([])
  const [prog, setProg] = useState([]) // état local immédiat
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [saving, setSaving] = useState(false)

  async function refresh() {
    setLoading(true)
    setErr(null)
    try {
      const [chars, p] = await Promise.all([listCharacters(), listProgress('stats')])
      setRows(chars || [])
      setProg(p || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { refresh() }, [])

  const progMap = useMemo(() => {
    const m = {}
    for (const r of prog || []) {
      if (!m[r.character_id]) m[r.character_id] = {}
      m[r.character_id][r.key] = (r.value_int ?? null)
    }
    return m
  }, [prog])

  const grouped = useMemo(() => {
    const map = {}
    for (const c of rows) {
      const key = normalizeAccount(c.account)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }

    const keys = []
    for (let i = 1; i <= 8; i++) if (map[String(i)]?.length) keys.push(String(i))
    if (map['Sans compte']?.length) keys.push('Sans compte')
    for (const k of Object.keys(map).sort((a, b) => a.localeCompare(b, 'fr'))) {
      if (!keys.includes(k)) keys.push(k)
    }
    keys.forEach(k => map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')))
    return { map, keys }
  }, [rows])

  function upsertLocal(character_id, key, value_int) {
    setProg(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(r => r.character_id === character_id && r.category === 'stats' && r.key === key)
      if (idx >= 0) {
        next[idx] = { ...next[idx], value_int }
      } else {
        next.push({ character_id, category: 'stats', key, value_int, status: 'done' })
      }
      return next
    })
  }

  // Sauvegarde "réelle" en DB (et c’est ça qui garantit que F5 garde tout)
  async function saveNow(character_id, key, value_int) {
    setSaving(true)
    setErr(null)
    try {
      await upsertProgress({
        character_id,
        category: 'stats',
        key,
        status: 'done',
        value_int: value_int ?? null,
      })
    } catch (e) {
      console.error(e)
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="container"><div className="h-sub">Chargement…</div></div>

  return (
    <div className="container" style={{ maxWidth: 1500, width: 'calc(100% - 40px)' }}>
      {/* Styles locaux pour ne pas toucher à styles.css */}
      <style>{`
        .persos-head-icon{
          width: 22px;
          height: 22px;
          vertical-align: middle;
          filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06));
        }
        .stat-input{
          width: 86px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          text-align: center;
          font-weight: 900;
          background: white;
          outline: none;
        }
        .stat-input:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }
        .tri-btn{
          width: 66px;
          height: 36px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          font-weight: 900;
          cursor: pointer;
        }
      `}</style>

      <div className="header">
        <div>
          <div className="h-title">Persos</div>
          <div className="h-sub">Stats + états Justicier/Parangon. Vert quand valeur = 100. {saving ? 'Sauvegarde…' : ''}</div>
        </div>
      </div>

      {err && (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub">{err}</div>
        </Card>
      )}

      {grouped.keys.map(acc => (
        <Card key={acc} className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub" style={{ fontWeight: 'bold' }}>
            Compte {acc}
          </div>

          <div className="table-wrap">
            <table className="progress-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head">Perso</th>

                  {STAT_COLS.map(c => (
                    <th key={c.key}>
                      <span style={{ color: c.color, fontWeight: 900 }}>{c.label}</span>
                    </th>
                  ))}

                  <th title="Justiciers">
                    <img
                      className="persos-head-icon"
                      src="/dofus-icons/justiciers.png"
                      alt="Justiciers"
                      title="Justiciers"
                    />
                  </th>

                  <th title="Parangon">
                    <img
                      className="persos-head-icon"
                      src="/dofus-icons/parangon.png"
                      alt="Parangon"
                      title="Parangon"
                    />
                  </th>
                </tr>
              </thead>

              <tbody>
                {(grouped.map[acc] || []).map(c => {
                  const stats = progMap?.[c.id] || {}

                  return (
                    <tr key={c.id}>
                      <td className="sticky-col sticky-cell">
                        <div style={{ fontWeight: 900 }}>{c.name}</div>
                        <div className="h-sub" style={{ marginTop: 2 }}>
                          {c.clazz} • <span style={{ color: '#7c3aed', fontWeight: 800 }}>Niv {c.level}</span>
                        </div>
                      </td>

                      {STAT_COLS.map(col => {
                        const val = stats[col.key]
                        const display = val === null || val === undefined || val === 0 ? '' : String(val)
                        const ok = isOk100(val)

                        return (
                          <td key={col.key} className="cell">
                            <input
                              className="stat-input"
                              value={display}
                              inputMode="numeric"
                              placeholder="0"
                              onChange={(e) => {
                                // update local instant pour que tu puisses taper
                                const next = clampNullableInt(e.target.value)
                                upsertLocal(c.id, col.key, next)
                              }}
                              onBlur={(e) => {
                                // save DB au blur => persistant au F5
                                const next = clampNullableInt(e.target.value)
                                saveNow(c.id, col.key, next)
                              }}
                              style={{
                                background: ok ? 'rgba(34,197,94,0.25)' : 'white',
                              }}
                            />
                          </td>
                        )
                      })}

                      {['JUSTICIER', 'PARANGON'].map(key => {
                        const v = stats[key] ?? 0
                        return (
                          <td key={key} className="cell">
                            <button
                              type="button"
                              className="tri-btn"
                              onClick={() => {
                                const next = nextTriInt(v)
                                upsertLocal(c.id, key, next)   // instant UI
                                saveNow(c.id, key, next)       // persistant
                              }}
                              style={{
                                background: triBg(v),
                              }}
                              title="Vide → X → O"
                            >
                              {triLabel(v)}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {(grouped.map[acc] || []).length === 0 && (
                  <tr>
                    <td colSpan={STAT_COLS.length + 3} className="h-sub" style={{ padding: 6 }}>
                      Aucun perso dans ce compte.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ))}
    </div>
  )
}