import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui'
import { listCharacters, listProgress, upsertProgress, clearProgress } from '../data'

const OBJECTIVES_COLS = [
  { key: 'TUTU', label: 'TUTU' },
  { key: 'OCRE', label: 'OCRE' },
  { key: 'IVOIRE', label: 'IVOIRE' },
  { key: 'EBENE', label: 'ÉBÈNE' },
  { key: 'VULBIS', label: 'VULBIS' },
  { key: 'ABYSSAL', label: 'ABYSSAL' },
  { key: 'NEBULEUX', label: 'NÉBULEUX' },
  { key: 'POURPRE', label: 'POURPRE' },
  { key: 'TURQUOISE', label: 'TURQUOISE' },
  { key: 'EMERAUDE', label: 'ÉMERAUDE' },
  { key: 'DOLMANAX', label: 'DOLMANAX' },
  { key: 'VEILLEUR', label: 'VEILLEUR' },
  { key: 'FORGELAVE', label: 'FORGELAVE' },
  { key: 'CAUCHEMAR', label: 'CAUCHEMAR' },
]

function normalizeAccount(a) {
  const s = (a ?? '').toString().trim()
  return s || 'Sans compte'
}

function nextStatus(current) {
  if (!current || current === 'none') return 'in_progress'
  if (current === 'in_progress') return 'done'
  return 'none'
}

function cellVisual(status) {
  if (!status || status === 'none') return { text: '', style: {} }
  if (status === 'in_progress') {
    return {
      text: 'O',
      style: { background: 'rgba(140, 88, 255, 0.14)', borderColor: 'rgba(140, 88, 255, 0.35)' },
    }
  }
  return {
    text: '✓',
    style: { background: 'rgba(34, 197, 94, 0.14)', borderColor: 'rgba(34, 197, 94, 0.35)' },
  }
}

export default function Objectives() {
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
        listProgress('todo'),
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

  const progMap = useMemo(() => {
    const m = {}
    for (const r of (prog || [])) {
      if (!m[r.character_id]) m[r.character_id] = {}
      m[r.character_id][r.key] = r.status
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
    for (let i = 1; i <= 6; i++) if (map[String(i)]?.length) keys.push(String(i))
    if (map['Sans compte']?.length) keys.push('Sans compte')
    for (const k of Object.keys(map).sort((a, b) => a.localeCompare(b, 'fr'))) {
      if (!keys.includes(k)) keys.push(k)
    }
    keys.forEach(k => map[k].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'fr')))
    return { map, keys }
  }, [rows])

  async function toggleCell(character_id, objectiveKey) {
    const current = progMap?.[character_id]?.[objectiveKey] || 'none'
    const next = nextStatus(current)

    setSavingKey(`${character_id}:${objectiveKey}`)

    try {
      if (next === 'none') {
        await clearProgress({ character_id, category: 'todo', key: objectiveKey })
      } else {
        await upsertProgress({
          character_id,
          category: 'todo',
          key: objectiveKey,
          status: next,
          value_int: null,
        })
      }
      setProg(await listProgress('todo'))
    } catch (e) {
      setErr(e.message)
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">Objectifs</div>
          <div className="h-sub">Tableau global (clic : vide → O → ✓ → vide)</div>
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

            <div className="table-wrap">
              <table className="progress-table">
                <thead>
                  <tr>
                    <th className="sticky-col sticky-head">Perso</th>
                    {OBJECTIVES_COLS.map(col => (
                      <th key={col.key} className="text-head" title={col.label}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {grouped.map[acc].map(c => (
                    <tr key={c.id}>
                      <td className="sticky-col sticky-cell">
                        <div style={{ fontWeight: 900 }}>{c.name}</div>
                        <div className="h-sub" style={{ marginTop: 2 }}>
                          {[c.clazz, c.level ? `Niv ${c.level}` : null].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </td>

                      {OBJECTIVES_COLS.map(col => {
                        const st = progMap?.[c.id]?.[col.key] || 'none'
                        const v = cellVisual(st)
                        const busy = savingKey === `${c.id}:${col.key}`

                        return (
                          <td key={col.key} className="cell">
                            <button
                              type="button"
                              className="btn ghost"
                              onClick={() => toggleCell(c.id, col.key)}
                              disabled={!!savingKey}
                              title={busy ? 'Sauvegarde…' : 'Cliquer pour changer'}
                              style={{
                                width: 42,
                                height: 34,
                                borderRadius: 10,
                                border: '1px solid rgba(0,0,0,0.10)',
                                fontWeight: 900,
                                ...v.style,
                                opacity: busy ? 0.6 : 1,
                              }}
                            >
                              {busy ? '…' : v.text}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  ))}

                  {grouped.map[acc].length === 0 && (
                    <tr>
                      <td colSpan={OBJECTIVES_COLS.length + 1} className="h-sub" style={{ padding: 6 }}>
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