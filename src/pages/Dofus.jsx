import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Pill } from '../ui'
import { listCharacters, listDofusForCharacter, setProgress } from '../data'
import { Status, cycleStatus, statusLabel } from '../status'

export default function Dofus(){
  const [chars,setChars]=useState([])
  const [sel,setSel]=useState(null)
  const [rows,setRows]=useState([])
  const [err,setErr]=useState(null)
  const nav = useNavigate()

  async function load(forceSel){
    setErr(null)
    try{
      const cs = await listCharacters()
      setChars(cs)
      const s = forceSel ?? sel ?? (cs[0]?.id ?? null)
      setSel(s)
      setRows(s ? await listDofusForCharacter(s) : [])
    }catch(e){ setErr(e.message) }
  }

  useEffect(()=>{ load(null) }, [])
  useEffect(()=>{ if(sel) load(sel) }, [sel])

  const pct = useMemo(()=>{
    const done = rows.filter(r=>r.status===Status.DONE).length
    return rows.length?Math.round(done/rows.length*100):0
  },[rows])

  async function toggle(r){
    await setProgress('dofus_progress', r.id, cycleStatus(r.status||Status.TODO))
    await load(sel)
  }

  return (
    <div className="container">
      <div className="header">
        <div><div className="h-title">Dofus</div><div className="h-sub">Vue par perso</div></div>
        {sel && <Pill tone="violet">{pct}%</Pill>}
      </div>

      <Card style={{marginBottom:12}}>
        <div className="row wrap">
          <select className="select" value={sel ?? ''} onChange={e=>setSel(e.target.value || null)}>
            {chars.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {sel && <button className="btn ghost" onClick={()=>nav(`/persos/${sel}`)}>Fiche</button>}
        </div>
        {err && <div className="h-sub" style={{marginTop:10}}>{err}</div>}
      </Card>

      <div className="list">
        {rows.map(r=>(
          <div key={r.id} className="item" role="button" tabIndex={0} onClick={()=>toggle(r)}>
            <div>
              <div className="item-title">{r.dofus_name}</div>
              <div className="item-sub">Statut : {statusLabel(r.status)}</div>
            </div>
            <Pill tone={r.status===Status.DONE?'violet':'gray'}>{statusLabel(r.status) || '—'}</Pill>
          </div>
        ))}
        {sel && rows.length===0 && <div className="h-sub">Va sur la fiche du perso → “Pré-remplir”.</div>}
      </div>
    </div>
  )
}
