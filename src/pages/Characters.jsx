import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Pill } from '../ui'
import { listCharacters, upsertCharacter, deleteCharacter } from '../data'

export default function Characters() {
  const [rows, setRows] = useState([])
  const [err, setErr] = useState(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [account, setAccount] = useState('')
  const [clazz, setClazz] = useState('')
  const [level, setLevel] = useState('')

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
        account: account.trim() || null,
        clazz: clazz.trim() || null,
        level: level ? Number(level) : null,
      })
      setName(''); setAccount(''); setClazz(''); setLevel('')
      await refresh()
    }catch(e){ setErr(e.message) }
  }

  async function del(id){
    if(!confirm('Supprimer ce perso ?')) return
    try{ await deleteCharacter(id); await refresh() }
    catch(e){ setErr(e.message) }
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">Persos</div>
          <div className="h-sub">Cloud sync (Supabase)</div>
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
              <input className="input" value={account} onChange={e=>setAccount(e.target.value)} />
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
            <div className="h-sub">Import Excel dans V1.1</div>
          </div>
        </form>
        {err && <div className="h-sub">{err}</div>}
      </Card>

      {loading ? <div className="h-sub">Chargement…</div> : (
        <div className="list">
          {rows.map(c => (
            <div key={c.id} className="item" role="button" tabIndex={0} onClick={()=>nav(`/persos/${c.id}`)}>
              <div>
                <div className="item-title">{c.name}</div>
                <div className="item-sub">{[c.clazz, c.level?`Niv ${c.level}`:null, c.account].filter(Boolean).join(' • ') || '—'}</div>
              </div>
              <div className="kpi">
                <Pill tone="violet">Ouvrir</Pill>
                <button className="btn ghost" onClick={(e)=>{e.stopPropagation(); del(c.id)}}>Suppr</button>
              </div>
            </div>
          ))}
          {rows.length===0 && <div className="h-sub">Ajoute ton premier perso.</div>}
        </div>
      )}
    </div>
  )
}
