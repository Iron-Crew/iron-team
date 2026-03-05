import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, Segmented } from '../ui'
import { listCharacters, listProgress, upsertProgress, listAccountBanks, upsertAccountBank } from '../data'

const MONEY_COLS = [
  { key: 'KAMAS', label: 'Kamas', icon: '/dofus-icons/kamas.png' },
  { key: 'KAMAS_GLACE', label: 'Kamas de glace', icon: '/dofus-icons/kamasdeglace.png' },
  { key: 'TD', label: 'TD', icon: '/dofus-icons/td.png' },
  { key: 'ORICHOR', label: 'Orichor', icon: '/dofus-icons/orichor.png' },
  { key: 'AVITON', label: 'Aviton', icon: '/dofus-icons/aviton.png' },
]

function normalizeAccount(a) {
  const s = (a ?? '').toString().trim()
  return s || 'Sans compte'
}

function onlyDigits(s) {
  return (s ?? '').toString().replace(/[^\d]/g, '')
}

function toNumberDigits(s) {
  const d = onlyDigits(s)
  if (!d) return 0
  const n = Number(d)
  return Number.isFinite(n) ? n : 0
}

function formatSpaces(n) {
  const x = Number(n || 0)
  if (!Number.isFinite(x)) return ''
  return Math.trunc(x).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
}

function greenIfPositive(v) {
  return Number(v) > 0 ? 'rgba(34,197,94,0.25)' : 'white'
}

const TableHeader = React.memo(function TableHeader() {
  return (
    <thead>
      <tr>
        <th className="sticky-col sticky-head"></th>
        {MONEY_COLS.map(col => (
          <th key={col.key} className="icon-head" title={col.label}>
            <img src={col.icon} alt={col.label} title={col.label} className="dofus-icon" loading="lazy" />
          </th>
        ))}
      </tr>
    </thead>
  )
})

const MoneyRow = React.memo(function MoneyRow({
  c,
  showAccountHint,
  valueMapForChar,
  onCommitMoney, // (character_id, key, value_int) => Promise<void>
}) {
  const acc = normalizeAccount(c.account)

  function handleMoneyFocus(e, savedVal) {
    // au focus => digits (sans espaces)
    e.target.value = savedVal > 0 ? String(Math.trunc(savedVal)) : ''
  }

  function handleMoneyInput(e) {
    // pendant la saisie : on laisse le navigateur gérer le focus
    // on force digits-only sans setState
    const digits = onlyDigits(e.target.value)
    if (e.target.value !== digits) e.target.value = digits
    e.target.style.background = digits && Number(digits) > 0 ? 'rgba(34,197,94,0.25)' : 'white'
  }

  async function handleMoneyBlur(e, characterId, key) {
    const nextNum = toNumberDigits(e.target.value)
    // format après saisie
    e.target.value = nextNum > 0 ? formatSpaces(nextNum) : ''
    e.target.style.background = greenIfPositive(nextNum)
    await onCommitMoney(characterId, key, nextNum)
  }

  return (
    <tr>
      <td className="sticky-col sticky-cell">
        <div style={{ fontWeight: 900 }}>{c.name}</div>
        <div className="h-sub" style={{ marginTop: 2 }}>
          {c.clazz} • <span style={{ color: '#7c3aed', fontWeight: 800 }}>Niv {c.level}</span>
          {showAccountHint && <span className="account-pill">• Compte {acc}</span>}
        </div>
      </td>

      {MONEY_COLS.map(col => {
        const savedVal = Number(valueMapForChar?.[col.key] ?? 0)

        return (
          <td key={col.key} className="cell">
            <input
              className="money-input"
              defaultValue={savedVal > 0 ? formatSpaces(savedVal) : ''}
              inputMode="numeric"
              onFocus={(e) => handleMoneyFocus(e, savedVal)}
              onInput={handleMoneyInput}
              onBlur={(e) => handleMoneyBlur(e, c.id, col.key)}
              style={{ background: greenIfPositive(savedVal) }}
              title={col.label}
            />
          </td>
        )
      })}
    </tr>
  )
})

export default function Monnaie() {
  const [rows, setRows] = useState([])
  const [prog, setProg] = useState([])
  const [banks, setBanks] = useState([])

  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState(null)
  const [savingCount, setSavingCount] = useState(0)

  const [accountFilter, setAccountFilter] = useState('ALL')
  const [classFilter, setClassFilter] = useState('ALL')

  // juste pour nettoyer à la sortie (si jamais)
  const timersRef = useRef(new Map())

  async function refresh() {
    setLoading(true)
    setErr(null)
    try {
      const [chars, p, b] = await Promise.all([
        listCharacters(),
        listProgress('monnaie'),
        listAccountBanks(),
      ])
      setRows(chars || [])
      setProg(p || [])
      setBanks(b || [])
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

  // Map robuste: si doublons, garde la plus récente via updated_at
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

  const bankMap = useMemo(() => {
    const m = {}
    for (const r of (banks || [])) {
      if (!r?.account) continue
      m[String(r.account)] = Number(r.value_int || 0)
    }
    return m
  }, [banks])

  const totalBank = useMemo(() => {
    let sum = 0
    for (let i = 1; i <= 6; i++) sum += Number(bankMap[String(i)] || 0)
    return sum
  }, [bankMap])

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
      const idx = next.findIndex(r => r.character_id === character_id && r.category === 'monnaie' && r.key === key)
      if (idx >= 0) next[idx] = { ...next[idx], value_int, updated_at: new Date().toISOString() }
      else next.push({ character_id, category: 'monnaie', key, status: 'done', value_int, updated_at: new Date().toISOString() })
      return next
    })
  }

  async function commitMoney(character_id, key, value_int) {
    setSavingCount(x => x + 1)
    setErr(null)
    try {
      // update UI après saisie
      upsertLocal(character_id, key, value_int)

      await upsertProgress({
        character_id,
        category: 'monnaie',
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

  async function commitBank(account, value_int) {
    setSavingCount(x => x + 1)
    setErr(null)
    try {
      const saved = await upsertAccountBank({ account, value_int: value_int ?? 0 })
      setBanks(prev => {
        const next = Array.isArray(prev) ? [...prev] : []
        const idx = next.findIndex(x => String(x.account) === String(account))
        const row = { account: String(account), value_int: Number(saved?.value_int ?? value_int ?? 0) }
        if (idx >= 0) next[idx] = { ...next[idx], ...row }
        else next.push(row)
        return next
      })
    } catch (e) {
      console.error(e)
      setErr(`Sauvegarde banque refusée: ${e.message}`)
    } finally {
      setSavingCount(x => Math.max(0, x - 1))
    }
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

  const BankModule = ({ account }) => {
    if (!/^\d+$/.test(String(account))) return null
    const savedVal = Number(bankMap[String(account)] || 0)

    function onFocus(e) {
      e.target.value = savedVal > 0 ? String(Math.trunc(savedVal)) : ''
    }
    function onInput(e) {
      const digits = onlyDigits(e.target.value)
      if (e.target.value !== digits) e.target.value = digits
      e.target.style.background = digits && Number(digits) > 0 ? 'rgba(34,197,94,0.25)' : 'white'
    }
    async function onBlur(e) {
      const nextNum = toNumberDigits(e.target.value)
      e.target.value = nextNum > 0 ? `${formatSpaces(nextNum)} K` : ''
      e.target.style.background = greenIfPositive(nextNum)

      // update local direct pour total
      setBanks(prev => {
        const next = Array.isArray(prev) ? [...prev] : []
        const idx = next.findIndex(x => String(x.account) === String(account))
        const row = { account: String(account), value_int: nextNum }
        if (idx >= 0) next[idx] = { ...next[idx], ...row }
        else next.push(row)
        return next
      })

      await commitBank(String(account), nextNum)
    }

    return (
      <div className="bank-module">
        <img src="/dofus-icons/monnaie.png" alt="" className="bank-icon" />
        <div className="bank-label">Banque :</div>
        <input
          className="bank-input"
          defaultValue={savedVal > 0 ? `${formatSpaces(savedVal)} K` : ''}
          inputMode="numeric"
          placeholder="0 K"
          onFocus={onFocus}
          onInput={onInput}
          onBlur={onBlur}
          style={{ background: greenIfPositive(savedVal) }}
          title={`Banque Compte ${account}`}
        />
      </div>
    )
  }

  return (
    <div className="monnaie-page container" style={{ maxWidth: 1750, width: 'calc(100% - 28px)' }}>
      <style>{`
        .monnaie-toolbar{ display:flex; gap:12px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:12px; }
        .monnaie-toolbar-left{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }
        .monnaie-toolbar-right{ display:flex; gap:12px; align-items:center; flex-wrap:wrap; }

        .monnaie-select{
          height:38px; border-radius:12px; border:1px solid rgba(0,0,0,0.10);
          padding:0 12px; font-weight:800; background:white; outline:none;
        }
        .monnaie-select:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }

        .monnaie-page .card.grid{ display:block !important; padding-bottom: 10px; }
        .monnaie-page .table-wrap{ margin-top: 8px; }
        .monnaie-page .progress-table td{ padding-top: 8px; padding-bottom: 8px; }

        .money-input{
          width: 118px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          text-align: center;
          font-weight: 900;
          background: white;
          outline: none;
        }
        .money-input:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }

        .bank-module{ display:flex; align-items:center; gap:8px; }
        .bank-icon{
          width:18px; height:18px; object-fit:contain;
          filter: drop-shadow(0 1px 0 rgba(0,0,0,0.06));
        }
        .bank-label{ font-size: 12px; font-weight: 900; color: rgba(0,0,0,0.55); }
        .bank-input{
          width: 190px;
          height: 34px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.10);
          padding: 0 10px;
          font-weight: 900;
          background: white;
          outline: none;
        }
        .bank-input:focus{
          border-color: rgba(124,58,237,0.55);
          box-shadow: 0 0 0 4px rgba(124,58,237,0.12);
        }

        .total-bank{
          display:flex; align-items:center; gap:8px;
          border:1px solid rgba(0,0,0,0.10);
          background: white;
          border-radius: 14px;
          padding: 8px 10px;
          font-weight: 900;
        }
        .total-bank .val{ color: rgba(0,0,0,0.75); }

        .account-pill {
          color: rgba(0,0,0,0.45);
          font-weight: 800;
          margin-left: 8px;
        }
      `}</style>

      <div className="monnaie-toolbar">
        <div className="monnaie-toolbar-left">
          <Segmented options={accountOptions} value={accountFilter} onChange={setAccountFilter} />

          <select
            className="monnaie-select"
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            title="Filtrer par classe"
          >
            <option value="ALL">Toutes classes</option>
            {classes.map(cl => <option key={cl} value={cl}>{cl}</option>)}
          </select>
        </div>

        <div className="monnaie-toolbar-right">
          <div className="total-bank" title="Somme des banques Compte 1..6">
            <img src="/dofus-icons/monnaie.png" alt="" className="bank-icon" />
            <span>Total Banque :</span>
            <span className="val">{formatSpaces(totalBank)} K</span>
          </div>

          <div className="h-sub" style={{ fontWeight: 800 }}>
            {savingCount > 0 ? 'Sauvegarde…' : '✓ Sauvegardé'}
          </div>
        </div>
      </div>

      {err && (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub">{err}</div>
        </Card>
      )}

      {compactMode ? (
        <Card className="grid" style={{ marginBottom: 12 }}>
          <div className="h-sub" style={{ fontWeight: 'bold', paddingTop: 4 }}>
            Résultats : {classFilter} ({resultsList.length})
          </div>

          <div className="table-wrap">
            <table className="progress-table">
              <TableHeader />
              <tbody>
                {resultsList.map(c => (
                  <MoneyRow
                    key={c.id}
                    c={c}
                    showAccountHint
                    valueMapForChar={progMap?.[c.id] || {}}
                    onCommitMoney={commitMoney}
                  />
                ))}
                {resultsList.length === 0 && (
                  <tr>
                    <td colSpan={MONEY_COLS.length + 1} className="h-sub" style={{ padding: 6 }}>
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
            <div className="row" style={{ alignItems: 'center' }}>
              <div className="h-sub" style={{ fontWeight: 'bold' }}>
                Compte {acc}
              </div>
              <div className="spacer" />
              <BankModule account={acc} />
            </div>

            <div className="table-wrap">
              <table className="progress-table">
                <TableHeader />
                <tbody>
                  {(grouped.map[acc] || []).map(c => (
                    <MoneyRow
                      key={c.id}
                      c={c}
                      showAccountHint={false}
                      valueMapForChar={progMap?.[c.id] || {}}
                      onCommitMoney={commitMoney}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))
      )}
    </div>
  )
}