import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Segmented } from '../ui'
import { listCharacters, listProgress, upsertProgress } from '../data'

// Colonnes DOFUS
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

// Mapping icônes (public/dofus-icons/*.png)
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

// ✅ EXACT comme Persos : 0(vide) -> 1(X) -> 2(O) -> 0
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

export default function Dofus() {
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

  useEffect(() => {
    refresh()
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t)
      timersRef.current.clear()
    }
  }, [])

  // Map robuste : si doublons, garde la plus récente via updated_at
  const progMap = useMemo(() => {
    const m = {}
    for (const r of (prog || [])) {
      const cid = r.character_id
      const key = r.key
      if (!cid || !key) continue

      if (!m[cid]) m[cid] = {}
      const prev = m[cid][key]
      const curr = { value_int: r.value_int ?? 0, updated_at: r.updated_at ?? '' }

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
      for (const key of Object.keys(m[cid])) out[cid][key] = m[cid][key].value_int ?? 0
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

  function upsertLocal(character_id, key, value_int) {
    setProg(prev => {
      const next = Array.isArray(prev) ? [...prev] : []
      const idx = next.findIndex(r => r.character_id === character_id && r.category === 'dofus' && r.key === key)
      if (idx >= 0) {
        next[idx] = { ...next[idx], value_int, updated_at: new Date().toISOString() }
      } else {
        next.push({
          character_id,
          category: 'dofus',
          key,
          status: 'done', // peu importe ici, on utilise value_int
          value_int,
          updated_at: new Date().toISOString(),
        })
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
        category: 'dofus',
        key,
        status: 'done',
        value_int: value_int ?? 0,
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
    }, 350)

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

  const compactMode = classFilter !== 'ALL'

  if (loading) return <div className="container"><div className="h-sub">Chargement…</div></div>

  const TableHeader = () => (
    <thead>
      <tr>
        <th className="sticky-col sticky-head"></th>
        {DOFUS_COLS.map(col => (
          <th key={col.key} className="icon-head" title={col.label}>
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
  )

  const Row = ({ c, showAccountHint }) => {
    const acc = normalizeAccount(c.account)
    const map = progMap?.[c.id] || {}

    return (
      <tr key={c.id}>
        <td className="sticky-col sticky-cell">
          <div style={{ fontWeight: 900 }}>{c.name}</div>
          <div className="h-sub" style={{ marginTop: 2 }}>
            {c.clazz} • <span style={{ color: '#7c3aed', fontWeight: 800 }}>Niv {c.level}</span>
            {showAccountHint && <span className="account-pill">• Compte {acc}</span>}
          </div>
        </td>

        {DOFUS_COLS.map(col => {
          const v = map[col.key] ?? 0
          return (
            <td key={col.key} className="cell">
              <button
                type="button"
                className="tri-btn"
                onClick={() => {
                  const next = nextTriInt(v)
                  upsertLocal(c.id, col.key, next)
                  saveDebounced(c.id, col.key, next)
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
  }

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

        /* ✅ EXACT tailles Persos (Justicier/Parangon) */
        .tri-btn{
          width: 72px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          font-weight: 900;
          cursor: pointer;
          background: white;
        }

        .account-pill {
          color: rgba(0,0,0,0.45);
          font-weight: 800;
          margin-left: 8px;
        }
      `}</style>

      {/* Toolbar */}
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

      {/* Mode Résultats */}
      {compactMode ? (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub" style={{ fontWeight: 'bold', paddingTop: 4 }}>
            Résultats : {classFilter} ({resultsList.length})
          </div>

          <div className="table-wrap">
            <table className="progress-table">
              <TableHeader />
              <tbody>
                {resultsList.map(c => <Row key={c.id} c={c} showAccountHint />)}
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
        grouped.keys.map(acc => (
          <Card key={acc} className="grid" style={{ marginBottom: 12 }}>
            <div className="h-sub" style={{ fontWeight: 'bold' }}>
              Compte {acc}
            </div>

            <div className="table-wrap">
              <table className="progress-table">
                <TableHeader />
                <tbody>
                  {grouped.map[acc].map(c => <Row key={c.id} c={c} showAccountHint={false} />)}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}