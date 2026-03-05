import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Segmented } from '../ui'
import { listCharacters, listProgress, upsertProgress, clearProgress } from '../data'

// Colonnes DOFUS (29)
const DOFUS_COLS = [
  { key: 'DOFAWA', label: 'DOFAWA' },
  { key: 'ARGENTE', label: 'ARGENTE' },
  { key: 'CAWOTTE', label: 'CAWOTTE' },
  { key: 'DOKOKO', label: 'DOKOKO' },
  { key: 'VEILLEURS', label: 'VEILLEURS' },
  { key: 'EMERAUDE', label: 'ÉMERAUDE' },
  { key: 'POURPRE', label: 'POURPRE' },
  { key: 'DOMAKURO', label: 'DOMAKURO' },
  { key: 'DORIGAMI', label: 'DORIGAMI' },
  { key: 'GLACES', label: 'GLACES' },
  { key: 'VULBIS', label: 'VULBIS' },
  { key: 'TURQUOISE', label: 'TURQUOISE' },
  { key: 'OCRE', label: 'OCRE' },
  { key: 'ABYSSAL', label: 'ABYSSAL' },
  { key: 'TACHETE', label: 'TACHETÉ' },
  { key: 'NEBULEUX', label: 'NÉBULEUX' },
  { key: 'FORGELAVE', label: 'FORGELAVE' },
  { key: 'CAUCHEMAR', label: 'CAUCHEMAR' },
  { key: 'IVOIRE', label: 'IVOIRE' },
  { key: 'EBENE', label: 'ÉBÈNE' },
  { key: 'ARGENTE_SCINTILLANT', label: 'ARGENTE SCINTILLANT' },
  { key: 'DOM_DE_PIN', label: 'DOM DE PIN' },
  { key: 'SYLVESTRE', label: 'SYLVESTRE' },
  { key: 'DOFOOZBZ', label: 'DOFOOZBZ' },
  { key: 'DOLMANAX', label: 'DOLMANAX' },
  { key: 'KALIPTUS', label: 'KALIPTUS' },
  { key: 'DOTRUCHE', label: 'DOTRUCHE' },
  { key: 'DOKILLE', label: 'DOKILLE' },
  { key: 'CACAO', label: 'CACAO' },
]

// Mapping vers les icônes (public/dofus-icons/*.png)
const DOFUS_ICONS = {
  DOFAWA: '/dofus-icons/dofawa.png',
  ARGENTE: '/dofus-icons/argente.png',
  CAWOTTE: '/dofus-icons/cawotte.png',
  DOKOKO: '/dofus-icons/dokoko.png',
  VEILLEURS: '/dofus-icons/veilleurs.png',
  EMERAUDE: '/dofus-icons/emeraude.png',
  POURPRE: '/dofus-icons/pourpre.png',
  DOMAKURO: '/dofus-icons/domakuro.png',
  DORIGAMI: '/dofus-icons/dorigami.png',
  GLACES: '/dofus-icons/glaces.png',
  VULBIS: '/dofus-icons/vulbis.png',
  TURQUOISE: '/dofus-icons/turquoise.png',
  OCRE: '/dofus-icons/ocre.png',
  ABYSSAL: '/dofus-icons/abyssal.png',
  TACHETE: '/dofus-icons/tachete.png',
  NEBULEUX: '/dofus-icons/nebuleux.png',
  FORGELAVE: '/dofus-icons/forgelave.png',
  CAUCHEMAR: '/dofus-icons/cauchemar.png',
  IVOIRE: '/dofus-icons/ivoire.png',
  EBENE: '/dofus-icons/ebene.png',
  ARGENTE_SCINTILLANT: '/dofus-icons/argente_scintillant.png',
  DOM_DE_PIN: '/dofus-icons/dom_de_pin.png',
  SYLVESTRE: '/dofus-icons/sylvestre.png',
  DOFOOZBZ: '/dofus-icons/dofoozbz.png',
  DOLMANAX: '/dofus-icons/dolmanax.png',
  KALIPTUS: '/dofus-icons/kaliptus.png',
  DOTRUCHE: '/dofus-icons/dotruche.png',
  DOKILLE: '/dofus-icons/dokille.png',
  CACAO: '/dofus-icons/cacao.png',
}

function normalizeAccount(a) {
  const s = (a ?? '').toString().trim()
  return s || 'Sans compte'
}

// Cycle : vide -> O -> ✓ -> vide
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

export default function Dofus() {
  const [rows, setRows] = useState([])
  const [prog, setProg] = useState([])
  const [loading, setLoading] = useState(true)

  const [err, setErr] = useState(null)
  const [savingCount, setSavingCount] = useState(0)

  const [accountFilter, setAccountFilter] = useState('ALL') // ALL, 1..6
  const [classFilter, setClassFilter] = useState('ALL') // ALL or clazz

  // stocke les cellules en cours de save (pour un petit "…" local)
  const savingCellsRef = useRef(new Set())
  const [, forceTick] = useState(0)
  const bump = () => forceTick(x => x + 1)

  async function refresh() {
    setLoading(true)
    setErr(null)
    try {
      const [chars, p] = await Promise.all([
        listCharacters(),
        listProgress('dofus'),
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

  // Map robuste : si doublons, garde le plus récent via updated_at
  const progMap = useMemo(() => {
    const m = {}
    for (const r of (prog || [])) {
      const cid = r.character_id
      const key = r.key
      if (!cid || !key) continue

      if (!m[cid]) m[cid] = {}
      const prev = m[cid][key]
      const curr = { status: r.status || 'none', updated_at: r.updated_at || '' }

      if (!prev) m[cid][key] = curr
      else {
        const a = String(prev.updated_at || '')
        const b = String(curr.updated_at || '')
        if (b >= a) m[cid][key] = curr
      }
    }

    const out = {}
    for (const cid of Object.keys(m)) {
      out[cid] = {}
      for (const key of Object.keys(m[cid])) out[cid][key] = m[cid][key].status
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

  const resultsList = useMemo(() => {
    const list = [...(filteredRows || [])]
    list.sort((a, b) => {
      const aa = normalizeAccount(a.account)
      const bb = normalizeAccount(b.account)
      const cmpAcc = aa.localeCompare(bb, 'fr')
      if (cmpAcc !== 0) return cmpAcc
      return (a.name || '').localeCompare(b.name || '', 'fr')
    })
    return list
  }, [filteredRows])

  function upsertLocalStatus(character_id, key, status) {
    setProg(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(r => r.character_id === character_id && r.category === 'dofus' && r.key === key)

      if (!status || status === 'none') {
        // enlève la ligne localement
        if (idx >= 0) next.splice(idx, 1)
        return next
      }

      if (idx >= 0) {
        next[idx] = { ...next[idx], status, updated_at: new Date().toISOString() }
      } else {
        next.push({
          character_id,
          category: 'dofus',
          key,
          status,
          value_int: null,
          updated_at: new Date().toISOString(),
        })
      }
      return next
    })
  }

  async function saveCell(character_id, key, next) {
    const cellKey = `${character_id}:${key}`
    savingCellsRef.current.add(cellKey)
    setSavingCount(x => x + 1)
    setErr(null)
    bump()

    try {
      if (next === 'none') {
        await clearProgress({ character_id, category: 'dofus', key })
      } else {
        await upsertProgress({
          character_id,
          category: 'dofus',
          key,
          status: next,
          value_int: null,
        })
      }
    } catch (e) {
      setErr(e.message)
      // en cas d’erreur, on re-sync
      await refresh()
    } finally {
      savingCellsRef.current.delete(cellKey)
      setSavingCount(x => Math.max(0, x - 1))
      bump()
    }
  }

  async function toggleCell(character_id, dofusKey) {
    const current = progMap?.[character_id]?.[dofusKey] || 'none'
    const next = nextStatus(current)

    // Optimistic UI instant
    upsertLocalStatus(character_id, dofusKey, next)
    // Save async
    saveCell(character_id, dofusKey, next)
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

  const compactMode = classFilter !== 'ALL'

  if (loading) return <div className="container"><div className="h-sub">Chargement…</div></div>

  return (
    <div className="dofus-page container" style={{ maxWidth: 1750, width: 'calc(100% - 28px)' }}>
      <style>{`
        .dofus-toolbar{
          display:flex;
          gap:12px;
          align-items:center;
          justify-content:space-between;
          flex-wrap:wrap;
          margin-bottom:12px;
        }
        .dofus-toolbar-left{
          display:flex;
          gap:12px;
          align-items:center;
          flex-wrap:wrap;
        }
        .dofus-select{
          height:38px;
          border-radius:12px;
          border:1px solid rgba(0,0,0,0.10);
          padding:0 12px;
          font-weight:800;
          background:white;
          outline:none;
        }
        .dofus-select:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }

        .dofus-page .card.grid{ display:block !important; padding-bottom: 10px; }
        .dofus-page .table-wrap{ margin-top: 8px; }
        .dofus-page .progress-table td{ padding-top: 8px; padding-bottom: 8px; }

        .icon-head{ text-align:center; }
        .dofus-icon{
          width: 22px;
          height: 22px;
          vertical-align: middle;
          filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06));
        }

        .cell-btn{
          width: 42px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          font-weight: 900;
          background: white;
          cursor: pointer;
        }

        .account-pill {
          color: rgba(0,0,0,0.45);
          font-weight: 800;
          margin-left: 8px;
        }
      `}</style>

      {/* Toolbar (comme Persos) */}
      <div className="dofus-toolbar">
        <div className="dofus-toolbar-left">
          <Segmented options={accountOptions} value={accountFilter} onChange={setAccountFilter} />

          <select
            className="dofus-select"
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

      {/* MODE RÉSULTATS */}
      {compactMode ? (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub" style={{ fontWeight: 'bold', paddingTop: 4 }}>
            Résultats : {classFilter} ({resultsList.length})
          </div>

          <div className="table-wrap">
            <table className="progress-table">
              <thead>
                <tr>
                  <th className="sticky-col sticky-head"></th>
                  {DOFUS_COLS.map(col => (
                    <th key={col.key} className="icon-head">
                      <img
                        src={DOFUS_ICONS[col.key]}
                        alt={col.label}
                        title={col.label}
                        className="dofus-icon"
                        loading="lazy"
                      />
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {resultsList.map(c => {
                  const acc = normalizeAccount(c.account)
                  return (
                    <tr key={c.id}>
                      <td className="sticky-col sticky-cell">
                        <div style={{ fontWeight: 900 }}>{c.name}</div>
                        <div className="h-sub" style={{ marginTop: 2 }}>
                          {c.clazz} • <span style={{ color: '#7c3aed', fontWeight: 800 }}>Niv {c.level}</span>
                          <span className="account-pill">• Compte {acc}</span>
                        </div>
                      </td>

                      {DOFUS_COLS.map(col => {
                        const st = progMap?.[c.id]?.[col.key] || 'none'
                        const v = cellVisual(st)
                        const cellKey = `${c.id}:${col.key}`
                        const busy = savingCellsRef.current.has(cellKey)

                        return (
                          <td key={col.key} className="cell">
                            <button
                              type="button"
                              className="cell-btn"
                              onClick={() => toggleCell(c.id, col.key)}
                              title={busy ? 'Sauvegarde…' : 'Cliquer (vide → O → ✓ → vide)'}
                              style={{
                                ...v.style,
                                opacity: busy ? 0.65 : 1,
                              }}
                            >
                              {busy ? '…' : v.text}
                            </button>
                          </td>
                        )
                      })}
                    </tr>
                  )
                })}

                {resultsList.length === 0 && (
                  <tr>
                    <td colSpan={DOFUS_COLS.length + 1} className="h-sub" style={{ padding: 6 }}>
                      Aucun perso ne correspond aux filtres.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* MODE NORMAL : par comptes */
        grouped.keys.map(acc => (
          <Card key={acc} className="grid" style={{ marginBottom: 12 }}>
            <div className="h-sub" style={{ fontWeight: 'bold' }}>
              Compte {acc}
            </div>

            <div className="table-wrap">
              <table className="progress-table">
                <thead>
                  <tr>
                    <th className="sticky-col sticky-head"></th>
                    {DOFUS_COLS.map(col => (
                      <th key={col.key} className="icon-head">
                        <img
                          src={DOFUS_ICONS[col.key]}
                          alt={col.label}
                          title={col.label}
                          className="dofus-icon"
                          loading="lazy"
                        />
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
                          {c.clazz} • <span style={{ color: '#7c3aed', fontWeight: 800 }}>Niv {c.level}</span>
                        </div>
                      </td>

                      {DOFUS_COLS.map(col => {
                        const st = progMap?.[c.id]?.[col.key] || 'none'
                        const v = cellVisual(st)
                        const cellKey = `${c.id}:${col.key}`
                        const busy = savingCellsRef.current.has(cellKey)

                        return (
                          <td key={col.key} className="cell">
                            <button
                              type="button"
                              className="cell-btn"
                              onClick={() => toggleCell(c.id, col.key)}
                              title={busy ? 'Sauvegarde…' : 'Cliquer (vide → O → ✓ → vide)'}
                              style={{
                                ...v.style,
                                opacity: busy ? 0.65 : 1,
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
                      <td colSpan={DOFUS_COLS.length + 1} className="h-sub" style={{ padding: 6 }}>
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