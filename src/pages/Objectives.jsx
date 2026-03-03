import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Pill, Button } from '../ui'
import { listCharacters, listObjectivesForCharacter, setProgress, addProgressRow } from '../data'
import { Status, cycleStatus, statusLabel } from '../status'

export default function Objectives(){
  const [chars,setChars]=useState([])
  const [sel,setSel]=useState(null)
  const [rows,setRows]=useState([])
  const [newObj,setNewObj]=useState('')
  const [err,setErr]=useState(null)
  const nav = useNavigate()

  async function load(forceSel){
    setErr(null)
    try{
      const cs=await listCharacters()
      setChars(cs)
      const s=forceSel ?? sel ?? (cs[0]?.id ?? null)
      setSel(s)
      setRows(s ? await listObjectivesForCharacter(s) : [])
    }catch(e){ setErr(e.message) }
  }
  useEffect(()=>{ load(null) }, [])
  useEffect(()=>{ if(sel) load(sel) }, [sel])

  const pct = useMemo(()=>{
    const done = rows.filter(r=>r.status===Status.DONE).length
    return rows.length?Math.round(done/rows.length*100):0
  },[rows])

  async function toggle(r){
    await setProgress('objective_progress', r.id, cycleStatus(r.status||Status.TODO))
    await load(sel)
  }

  async function add(e){
    e.preventDefault()
    if(!sel || !newObj.trim()) return
    await addProgressRow('objective_progress',{ character_id: sel, objective_name: newObj.trim(), status: Status.TODO })
    setNewObj('')
    await load(sel)
  }

  return (
    <div className="container">
      <div className="header">
        <div><div className="h-title">Objectifs</div><div className="h-sub">Vue par perso</div></div>
        {sel && <Pill tone="violet">{pct}%</Pill>}
      </div>

      <Card style={{marginBottom:12}}>
        <div className="row wrap">
          <select className="select" value={sel ?? ''} onChange={e=>setSel(e.target.value || null)}>
            {chars.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {sel && <Button variant="ghost" onClick={()=>nav(`/persos/${sel}`)}>Fiche</Button>}
        </div>

        <form onSubmit={add} className="row wrap" style={{marginTop:10}}>
          <input className="input" value={newObj} onChange={e=>setNewObj(e.target.value)} placeholder="Ajouter un objectif…" />
          <Button type="submit">Ajouter</Button>
        </form>

        {err && <div className="h-sub" style={{marginTop:10}}>{err}</div>}
      </Card>

      <div className="list">
        {rows.map(r=>(
          <div key={r.id} className="item" role="button" tabIndex={0} onClick={()=>toggle(r)}>
            <div>
              <div className="item-title">{r.objective_name}</div>
              <div className="item-sub">Statut : {statusLabel(r.status)}</div>
            </div>
            <Pill tone={r.status===Status.DONE?'violet':'gray'}>{statusLabel(r.status) || '—'}</Pill>
          </div>
        ))}
        {sel && rows.length===0 && <div className="h-sub">Ajoute tes objectifs (import Excel après).</div>}
      </div>
    </div>
  )
}
