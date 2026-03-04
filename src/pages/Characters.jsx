import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Pill } from '../ui'
import { listCharacters, upsertCharacter, deleteCharacter } from '../data'

function normalizeAccountLabel(a) {
  const s = (a ?? '').toString().trim()
  if (!s) return 'Sans compte'
  return s
}

function parseImport(text) {
  const lines = (text || '')
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean)

  let currentAccount = null
  const out = []
  const errors = []

  const isAccountHeader = (line) => {
    const m = line.match(/^(compte|account)\s*[:\-]?\s*(\d{1,2})$/i)
    if (!m) return null
    const n = m[2]
    return n
  }

  const splitByDelimiter = (line) => {
    // auto detect delimiter (tab > ; > ,)
    const hasTab = line.includes('\t')
    const hasSemi = line.includes(';')
    const hasComma = line.includes(',')
    let parts = [line]
    if (hasTab) parts = line.split('\t')
    else if (hasSemi) parts = line.split(';')
    else if (hasComma) parts = line.split(',')
    return parts.map(p => p.trim()).filter(Boolean)
  }

  const parseLevel = (v) => {
    if (v == null) return null
    const s = String(v).trim()
    if (!s) return null
    const n = Number(s.replace(/[^\d]/g, ''))
    return Number.isFinite(n) && n > 0 ? n : null
  }

  lines.forEach((line, idx) => {
    // 1) "Compte 1" header
    const headerAcc = isAccountHeader(line)
    if (headerAcc) {
      currentAccount = headerAcc
      return
    }

    // 2) CSV/TSV style: account, name, clazz, level
    const parts = splitByDelimiter(line)

    // If it looks like a full row
    if (parts.length >= 3) {
      // try to interpret as: account | name | clazz | level
      // BUT some people might paste: name | account | clazz | level
      // We'll support both if account is clearly a number 1-6.
      let a = parts[0]
      let name = parts[1]
      let clazz = parts[2]
      let level = parts[3]

      const isAcc = (x) => /^\d{1,2}$/.test(String(x).trim())

      if (!isAcc(a) && isAcc(parts[1])) {
        // name | account | clazz | level
        name = parts[0]
        a = parts[1]
        clazz = parts[2]
        level = parts[3]
      }

      const acc = isAcc(a) ? String(a).trim() : (currentAccount ? String(currentAccount) : null)

      const obj = {
        account: acc,
        name: (name ?? '').trim(),
        clazz: (clazz ?? '').trim() || null,
        level: parseLevel(level),
      }

      if (!obj.name) {
        errors.push(`Ligne ${idx + 1}: nom manquant → "${line}"`)
        return
      }

      out.push(obj)
      return
    }

    // 3) Excel style: "CLASSE (Nom)" with optional extra "• Niv 200" etc.
    // Examples:
    // "Féca (Iron-Wall)"
    // "Féca (Iron-Wall) - 200"
    // "Féca (Iron-Wall) • Niv 200"
    const m = line.match(/^(.+?)\s*\(\s*(.+?)\s*\)\s*(?:[-•]\s*(?:niv\s*)?(\d+))?$/i)
    if (m) {
      const clazz = (m[1] || '').trim()
      const name = (m[2] || '').trim()
      const lvl = m[3] ? Number(m[3]) : null

      if (!name) {
        errors.push(`Ligne ${idx + 1}: nom manquant → "${line}"`)
        return
      }

      out.push({
        account: currentAccount ? String(currentAccount) : null,
        name,
        clazz: clazz || null,
        level: Number.isFinite(lvl) ? lvl : null,
      })
      return
    }

    // 4) If line is just a name, accept it
    if (line.length >= 2) {
      out.push({
        account: currentAccount ? String(currentAccount) : null,
        name: line,
        clazz: null,
        level: null,
      })
      return
    }

    errors.push(`Ligne ${idx + 1}: format non reconnu → "${line}"`)
  })

  return { items: out, errors }
}

export default function Characters() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [account, setAccount] = useState('1')
  const [clazz, setClazz] = useState('')
  const [level, setLevel] = useState('')

  const [viewMode, setViewMode] = useState('team') // 'list' | 'team'

  const [importText, setImportText] = useState('')
  const [importBusy, setImportBusy] = useState(false)
  const [importMsg, setImportMsg] = useState(null)

  const nav = useNavigate()

  async function refresh() {
    setLoading(true); setErr(null)
    try { setRows(await listCharacters()) }
    catch(e){ setErr(e.message) }
    finally{ setLoading(false) }
  }

  useEffect(()=>{ refresh() }, [])

  async function add(e){
    e.preventDefault()
    try{
      await upsertCharacter({
        name: name.trim(),
        account: (account ?? '').toString().trim() || null,
        clazz: clazz.trim() || null,
        level: level ? Number(level) : null,
      })
      setName('')
      setAccount('1')
      setClazz('')
      setLevel('')
      await refresh()
    }catch(e){ setErr(e.message) }
  }

  async function del(id){
    if(!confirm('Supprimer ce perso ?')) return
    try{ await deleteCharacter(id); await refresh() }
    catch(e){ setErr(e.message) }
  }

  // 🔹 GROUPER PAR COMPTE (tri 1→6 puis Sans compte)
  const grouped = useMemo(() => {
    const map = rows.reduce((acc, c) => {
      const key = normalizeAccountLabel(c.account)
      if (!acc[key]) acc[key] = []
      acc[key].push(c)
      return acc
    }, {})

    // sort inside each account by name
    Object.keys(map).forEach(k => {
      map[k].sort((a,b) => (a.name || '').localeCompare(b.name || '', 'fr'))
    })

    // build ordered keys
    const ordered = []
    for (let i=1;i<=6;i++){
      const k = String(i)
      if (map[k]?.length) ordered.push(k)
    }
    if (map['Sans compte']?.length) ordered.push('Sans compte')

    // include any weird accounts after
    const rest = Object.keys(map)
      .filter(k => !ordered.includes(k))
      .sort((a,b) => a.localeCompare(b, 'fr'))
    return { map, keys: [...ordered, ...rest] }
  }, [rows])

  async function runImport() {
    setImportMsg(null)
    setErr(null)

    const { items, errors } = parseImport(importText)

    if (errors.length) {
      setImportMsg(`⚠️ J'ai compris une partie, mais il y a des lignes à corriger :\n- ${errors.slice(0, 8).join('\n- ')}${errors.length>8 ? `\n(+${errors.length-8} autres)` : ''}`)
      // on continue quand même si on a des items valides
    }

    if (!items.length) {
      setImportMsg(importMsg || "Rien à importer (texte vide ou formats non reconnus).")
      return
    }

    // petite sécurité : limite à 60 lignes d'un coup
    if (items.length > 60) {
      setImportMsg(`Tu as ${items.length} lignes. Fais-le en 2 fois (max 60 par import) pour éviter les erreurs.`)
      return
    }

    setImportBusy(true)
    try {
      const results = await Promise.allSettled(
        items.map(it => upsertCharacter({
          name: it.name.trim(),
          account: it.account ? String(it.account).trim() : null,
          clazz: it.clazz ? it.clazz.trim() : null,
          level: it.level ?? null,
        }))
      )

      const failed = results.filter(r => r.status === 'rejected')
      await refresh()

      if (failed.length) {
        setImportMsg(`✅ Import partiel : ${items.length - failed.length}/${items.length} OK. (${failed.length} erreurs)`)
      } else {
        setImportMsg(`✅ Import OK : ${items.length}/${items.length} persos ajoutés.`)
      }

      setImportText('')
    } catch (e) {
      setErr(e.message)
    } finally {
      setImportBusy(false)
    }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">Persos</div>
          <div className="h-sub">Cloud sync (Supabase)</div>
        </div>

        <div className="row" style={{gap:8}}>
          <button
            className="btn ghost"
            onClick={() => setViewMode(v => v === 'team' ? 'list' : 'team')}
            type="button"
          >
            Vue : {viewMode === 'team' ? 'Team' : 'Liste'}
          </button>
        </div>
      </div>

      <Card className="grid" style={{marginBottom:12}}>
        <form onSubmit={add} className="grid">
          <div className="grid grid2">
            <div>
              <div className="h-sub">Nom</div>
              <input className="input" value={name} onChange={e=>setName(e.target.value)} required />
            </div>

            <div>
              <div className="h-sub">Compte</div>
              <select className="input" value={account} onChange={e=>setAccount(e.target.value)}>
                {[1,2,3,4,5,6].map(n => (
                  <option key={n} value={String(n)}>Compte {n}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid2">
            <div>
              <div className="h-sub">Classe</div>
              <input className="input" value={clazz} onChange={e=>setClazz(e.target.value)} />
            </div>
            <div>
              <div className="h-sub">Niveau</div>
              <input className="input" inputMode="numeric" value={level} onChange={e=>setLevel(e.target.value)} />
            </div>
          </div>

          <div className="row">
            <Button type="submit">Ajouter</Button>
            <div className="h-sub">Import Excel dispo juste en dessous ⬇️</div>
          </div>
        </form>

        {err && <div className="h-sub">{err}</div>}
      </Card>

      {/* IMPORT (copier-coller) */}
      <Card className="grid" style={{marginBottom:12}}>
        <div className="h-sub" style={{fontWeight:'bold'}}>Import (copier-coller)</div>
        <div className="h-sub" style={{lineHeight:1.5}}>
          Formats acceptés :
          <div>• <b>Compte 1</b> (ligne titre) puis <b>Féca (Iron-Wall)</b></div>
          <div>• ou CSV/TSV : <b>account, name, clazz, level</b></div>
        </div>

        <textarea
          className="input"
          style={{minHeight:120, padding:12}}
          placeholder={`Exemple :\nCompte 1\nFéca (Iron-Wall) • Niv 200\nEcaflip (Iron-Piloo) • Niv 200\n\nCompte 2\nCra (Iron-Storm) • Niv 200`}
          value={importText}
          onChange={(e)=>setImportText(e.target.value)}
        />

        <div className="row" style={{gap:8}}>
          <Button type="button" onClick={runImport} disabled={importBusy || !importText.trim()}>
            {importBusy ? 'Import…' : 'Importer'}
          </Button>
          {importMsg && <div className="h-sub" style={{whiteSpace:'pre-wrap'}}>{importMsg}</div>}
        </div>
      </Card>

      {loading ? <div className="h-sub">Chargement…</div> : (
        <div className="list">

          {grouped.keys.map(accKey => (
            <div key={accKey}>
              <div className="h-sub" style={{margin:"10px 0", fontWeight:"bold"}}>
                Compte {accKey}
              </div>

              {viewMode === 'list' ? (
                grouped.map[accKey].map(c => (
                  <div key={c.id} className="item" role="button" tabIndex={0} onClick={()=>nav(`/persos/${c.id}`)}>
                    <div>
                      <div className="item-title">{c.name}</div>
                      <div className="item-sub">
                        {[c.clazz, c.level?`Niv ${c.level}`:null].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </div>

                    <div className="kpi">
                      <Pill tone="violet">Ouvrir</Pill>
                      <button className="btn ghost" onClick={(e)=>{e.stopPropagation(); del(c.id)}}>Suppr</button>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fit, minmax(220px, 1fr))',
                    gap:10,
                    marginBottom:12
                  }}
                >
                  {grouped.map[accKey].map(c => (
                    <div
                      key={c.id}
                      className="item"
                      role="button"
                      tabIndex={0}
                      onClick={()=>nav(`/persos/${c.id}`)}
                      style={{cursor:'pointer'}}
                    >
                      <div>
                        <div className="item-title">{c.name}</div>
                        <div className="item-sub">
                          {[c.clazz, c.level?`Niv ${c.level}`:null].filter(Boolean).join(' • ') || '—'}
                        </div>
                      </div>

                      <div className="kpi">
                        <Pill tone="violet">Ouvrir</Pill>
                        <button className="btn ghost" onClick={(e)=>{e.stopPropagation(); del(c.id)}}>Suppr</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {rows.length===0 && <div className="h-sub">Ajoute ton premier perso.</div>}
        </div>
      )}
    </div>
  )
}