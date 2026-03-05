import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Segmented } from '../ui'
import { listCharacters, listProgress, upsertProgress } from '../data'

const STAT_COLS = [
  { key: 'VITALITE', label: 'Vitalité', color: '#111827' },
  { key: 'SAGESSE', label: 'Sagesse', color: '#7c3aed' },
  { key: 'FORCE', label: 'Force', color: '#8b5a2b' },
  { key: 'INTELLIGENCE', label: 'Intelligence', color: '#d04b4b' },
  { key: 'CHANCE', label: 'Chance', color: '#60a5fa' },
  { key: 'AGILITE', label: 'Agilité', color: '#22c55e' },
]

const TRI_COLS = [
  { key: 'JUSTICIER', icon: '/dofus-icons/justiciers.png', title: 'Justiciers' },
  { key: 'PARANGON', icon: '/dofus-icons/parangon.png', title: 'Parangon' },
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
  if (n === 1) return 'rgba(34,197,94,0.25)'
  if (n === 2) return 'rgba(245,158,11,0.25)'
  return 'white'
}

export default function Characters() {
  const [rows, setRows] = useState([])
  const [prog, setProg] = useState([])
  const [loading, setLoading] = useState(true)

  const [err, setErr] = useState(null)
  const [savingCount, setSavingCount] = useState(0)

  const [accountFilter, setAccountFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')

  const timersRef = useRef(new Map())

  async function refresh() {
    setLoading(true)
    setErr(null)
    try {
      const [chars, p] = await Promise.all([
        listCharacters(),
        listProgress('stats'),
      ])
      setRows(chars || [])
      setProg(p || [])
    } catch (e) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [])

  const progMap = useMemo(() => {
    const m = {}
    for (const r of (prog || [])) {
      const cid = r.character_id
      const key = r.key
      if (!cid || !key) continue

      if (!m[cid]) m[cid] = {}
      const prev = m[cid][key]
      if (!prev) {
        m[cid][key] = { value_int: r.value_int ?? null, updated_at: r.updated_at ?? '' }
      } else {
        const a = String(prev.updated_at || '')
        const b = String(r.updated_at || '')
        if (b >= a) m[cid][key] = { value_int: r.value_int ?? null, updated_at: r.updated_at ?? '' }
      }
    }

    const out = {}
    for (const cid of Object.keys(m)) {
      out[cid] = {}
      for (const key of Object.keys(m[cid])) out[cid][key] = m[cid][key].value_int
    }
    return out
  }, [prog])

  const classes = useMemo(() => {
    const set = new Set()
    for (const c of rows) if (c?.clazz) set.add(c.clazz)
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'fr'))
  }, [rows])

  const filteredRows = useMemo(() => {
    return (rows || []).filter(c => {
      const acc = normalizeAccount(c.account)
      if (accountFilter !== 'ALL' && acc !== accountFilter) return false
      if (classFilter !== 'ALL' && (c.clazz || '') !== classFilter) return false
      return true
    })
  }, [rows, accountFilter, classFilter])

  const grouped = useMemo(() => {
    const map = {}
    for (const c of filteredRows) {
      const key = normalizeAccount(c.account)
      if (!map[key]) map[key] = []
      map[key].push(c)
    }

    const keys = []
    for (let i = 1; i <= 6; i++) if (map[String(i)]?.length) keys.push(String(i))
    if (map['Sans compte']?.length) keys.push('Sans compte')
    for (const k of Object.keys(map).sort((a, b) => a.localeCompare(b, 'fr'))) {
      if (!keys.includes(k)) keys.push(k)
    }

    keys.forEach(k => map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')))
    return { map, keys }
  }, [filteredRows])

  function upsertLocal(character_id, key, value_int) {
    setProg(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(r => r.character_id === character_id && r.category === 'stats' && r.key === key)
      if (idx >= 0) {
        next[idx] = { ...next[idx], value_int, updated_at: new Date().toISOString() }
      } else {
        next.push({ character_id, category: 'stats', key, value_int, status: 'done', updated_at: new Date().toISOString() })
      }
      return next
    })
  }

  async function saveNow(character_id, key, value_int) {
    setSavingCount(x => x + 1)
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
      setErr(`Sauvegarde refusée: ${e.message}`)
    } finally {
      setSavingCount(x => Math.max(0, x - 1))
    }
  }

  function saveDebounced(character_id, key, value_int) {
    const timerKey = `${character_id}:${key}`
    const prev = timersRef.current.get(timerKey)
    if (prev) clearTimeout(prev)

    const t = setTimeout(() => {
      timersRef.current.delete(timerKey)
      saveNow(character_id, key, value_int)
    }, 450)

    timersRef.current.set(timerKey, t)
  }

  const accountOptions = useMemo(() => ([
    { value: 'ALL', label: 'Tout' },
    { value: '1', label: 'Compte 1' },
    { value: '2', label: 'Compte 2' },
    { value: '3', label: 'Compte 3' },
    { value: '4', label: 'Compte 4' },
    { value: '5', label: 'Compte 5' },
    { value: '6', label: 'Compte 6' },
  ]), [])

  if (loading) return <div className="container"><div className="h-sub">Chargement…</div></div>

  return (
    <div className="persos-page container" style={{ maxWidth: 1750, width: 'calc(100% - 28px)' }}>
      <style>{`
        .persos-toolbar{
          display:flex;
          gap:12px;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
          margin-bottom:12px;
        }
        .persos-toolbar-left{
          display:flex;
          gap:12px;
          align-items:center;
          flex-wrap:wrap;
        }
        .persos-select{
          height:38px;
          border-radius:12px;
          border:1px solid rgba(0,0,0,0.10);
          padding:0 12px;
          font-weight:800;
          background:white;
          outline:none;
        }
        .persos-select:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }
        .persos-head-icon{
          width:22px;
          height:22px;
          vertical-align:middle;
          filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06));
        }

        /* ✅ le FIX du “gros vide”: on annule le layout "grid" des cards sur cette page */
        .persos-page .card.grid{
          display: block !important;
          padding-bottom: 10px;
        }

        /* Compaction table */
        .persos-page .table-wrap{ margin-top: 8px; }
        .persos-page .progress-table td{
          padding-top: 8px;
          padding-bottom: 8px;
        }

        .stat-input{
          width: 92px;
          height: 34px;
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
          width: 72px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          font-weight: 900;
          cursor: pointer;
          background: white;
        }
      `}</style>

      <div className="persos-toolbar">
        <div className="persos-toolbar-left">
          <Segmented options={accountOptions} value={accountFilter} onChange={setAccountFilter} />

          <select
            className="persos-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            title="Filtrer par classe"
          >
            <option value="ALL">Toutes classes</option>
            {classes.map(cl => (
              <option key={cl} value={cl}>{cl}</option>
            ))}
          </select>
        </div>

        <div className="h-sub" style={{ fontWeight: 800 }}>
          {savingCount > 0 ? 'Sauvegarde…' : '✓ Sauvegardé'}
        </div>
      </div>

      {err && (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub">{err}</div>
        </Card>
      )}

      {grouped.keys.map(acc => (
        <Card key={acc} className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub" style={{ fontWeight: 'bold', paddingTop: 4 }}>
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

                  {TRI_COLS.map(t => (
                    <th key={t.key} title={t.title}>
                      <img className="persos-head-icon" src={t.icon} alt={t.title} title={t.title} />
                    </th>
                  ))}
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
                                const next = clampNullableInt(e.target.value)
                                upsertLocal(c.id, col.key, next)
                                saveDebounced(c.id, col.key, next)
                              }}
                              onBlur={(e) => {
                                const next = clampNullableInt(e.target.value)
                                saveNow(c.id, col.key, next)
                              }}
                              style={{ background: ok ? 'rgba(34,197,94,0.25)' : 'white' }}
                            />
                          </td>
                        )
                      })}

                      {TRI_COLS.map(t => {
                        const v = stats[t.key] ?? 0
                        return (
                          <td key={t.key} className="cell">
                            <button
                              type="button"
                              className="tri-btn"
                              onClick={() => {
                                const next = nextTriInt(v)
                                upsertLocal(c.id, t.key, next)
                                saveNow(c.id, t.key, next)
                              }}
                              style={{ background: triBg(v) }}
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

      {grouped.keys.length === 0 && (
        <Card className="grid">
          <div className="h-sub">Aucun perso ne correspond aux filtres.</div>
        </Card>
      )}
    </div>
  )
}