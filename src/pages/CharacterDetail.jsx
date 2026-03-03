import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, Button, Pill, Segmented } from '../ui'
import { Status, cycleStatus, statusLabel } from '../status'
import { listCharacters, listDofusForCharacter, listObjectivesForCharacter, listItemsForCharacter, setProgress, addProgressRow, addItem, deleteRow } from '../data'

const DOFUS_DEFAULTS = [
  'Dofus Cawotte','Dofus Dokoko','Dofus Émeraude','Dofus Pourpre','Dofus Turquoise',
  'Dofus Ocre','Dofus Ivoire','Dofus Ébène','Dofus Vulbis','Dofus des Glaces','Dofus Nébuleux'
]

export default function CharacterDetail(){
  const { id } = useParams()
  const nav = useNavigate()
  const [tab,setTab]=useState('dofus')
  const [c,setC]=useState(null)
  const [dofus,setDofus]=useState([])
  const [obj,setObj]=useState([])
  const [items,setItems]=useState([])
  const [err,setErr]=useState(null)
  const [newObj,setNewObj]=useState('')
  const [newItem,setNewItem]=useState('')
  const [newCat,setNewCat]=useState('')

  async function load(){
    setErr(null)
    try{
      const chars = await listCharacters()
      setC(chars.find(x=>x.id===id) || null)
      setDofus(await listDofusForCharacter(id))
      setObj(await listObjectivesForCharacter(id))
      setItems(await listItemsForCharacter(id))
    }catch(e){ setErr(e.message) }
  }
  useEffect(()=>{ load() }, [id])

  const pct = useMemo(()=>{
    const done = dofus.filter(x=>x.status===Status.DONE).length
    return dofus.length ? Math.round(done/dofus.length*100) : 0
  },[dofus])

  async function toggle(table,row){
    try{
      await setProgress(table, row.id, cycleStatus(row.status||Status.TODO))
      await load()
    }catch(e){ setErr(e.message) }
  }

  async function prefFill(){
    try{
      const existing = new Set(dofus.map(d=>d.dofus_name))
      for(const name of DOFUS_DEFAULTS){
        if(!existing.has(name)){
          await addProgressRow('dofus_progress',{ character_id:id, dofus_name:name, status:Status.TODO })
        }
      }
      await load()
    }catch(e){ setErr(e.message) }
  }

  async function addObjective(e){
    e.preventDefault()
    if(!newObj.trim()) return
    try{
      await addProgressRow('objective_progress',{ character_id:id, objective_name:newObj.trim(), status:Status.TODO })
      setNewObj('')
      await load()
    }catch(e){ setErr(e.message) }
  }

  async function addNewItem(e){
    e.preventDefault()
    if(!newItem.trim()) return
    try{
      await addItem({ character_id:id, name:newItem.trim(), category:newCat.trim()||null, comment:null })
      setNewItem(''); setNewCat('')
      await load()
    }catch(e){ setErr(e.message) }
  }

  async function remove(table,rowId){
    if(!confirm('Supprimer ?')) return
    try{ await deleteRow(table,rowId); await load() }catch(e){ setErr(e.message) }
  }

  if(!c){
    return <div className="container"><div className="h-sub">Perso introuvable.</div><Button variant="ghost" onClick={()=>nav('/persos')}>Retour</Button></div>
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">{c.name}</div>
          <div className="h-sub">{[c.clazz, c.level?`Niv ${c.level}`:null, c.account].filter(Boolean).join(' • ') || '—'}</div>
        </div>
        <div className="row">
          <Pill tone="violet">{pct}% Dofus</Pill>
          <Button variant="ghost" onClick={()=>nav('/persos')}>Retour</Button>
        </div>
      </div>

      <Card style={{marginBottom:12}}>
        <Segmented value={tab} onChange={setTab} options={[
          {value:'dofus',label:'Dofus'},
          {value:'obj',label:'Objectifs'},
          {value:'items',label:'Items'},
        ]}/>
      </Card>

      {err && <div className="h-sub" style={{marginBottom:10}}>{err}</div>}

      {tab==='dofus' && (
        <div className="grid">
          <Card>
            <div className="row">
              <div>
                <div className="item-title">Checklist Dofus</div>
                <div className="item-sub">Clique : vide → O → X</div>
              </div>
              <div className="spacer" />
              <Button variant="ghost" onClick={prefFill}>Pré-remplir</Button>
            </div>
          </Card>

          <div className="list">
            {dofus.map(d=>(
              <div key={d.id} className="item" role="button" tabIndex={0} onClick={()=>toggle('dofus_progress', d)}>
                <div>
                  <div className="item-title">{d.dofus_name}</div>
                  <div className="item-sub">Statut : {statusLabel(d.status)}</div>
                </div>
                <Pill tone={d.status===Status.DONE?'violet':'gray'}>{statusLabel(d.status) || '—'}</Pill>
              </div>
            ))}
            {dofus.length===0 && <div className="h-sub">Clique “Pré-remplir”.</div>}
          </div>
        </div>
      )}

      {tab==='obj' && (
        <div className="grid">
          <Card>
            <form onSubmit={addObjective} className="row wrap">
              <input className="input" value={newObj} onChange={e=>setNewObj(e.target.value)} placeholder="Ajouter un objectif…" />
              <Button type="submit">Ajouter</Button>
            </form>
            <div className="h-sub" style={{marginTop:10}}>Clique un objectif pour changer son statut.</div>
          </Card>

          <div className="list">
            {obj.map(o=>(
              <div key={o.id} className="item" role="button" tabIndex={0} onClick={()=>toggle('objective_progress', o)}>
                <div>
                  <div className="item-title">{o.objective_name}</div>
                  <div className="item-sub">Statut : {statusLabel(o.status)}</div>
                </div>
                <div className="kpi">
                  <Pill tone={o.status===Status.DONE?'violet':'gray'}>{statusLabel(o.status) || '—'}</Pill>
                  <button className="btn ghost" onClick={(e)=>{e.stopPropagation(); remove('objective_progress', o.id)}}>Suppr</button>
                </div>
              </div>
            ))}
            {obj.length===0 && <div className="h-sub">Ajoute tes objectifs (import Excel après).</div>}
          </div>
        </div>
      )}

      {tab==='items' && (
        <div className="grid">
          <Card>
            <form onSubmit={addNewItem} className="grid">
              <div className="grid grid2">
                <div>
                  <div className="h-sub">Nom</div>
                  <input className="input" value={newItem} onChange={e=>setNewItem(e.target.value)} placeholder="Ex: Anneau…" />
                </div>
                <div>
                  <div className="h-sub">Catégorie</div>
                  <input className="input" value={newCat} onChange={e=>setNewCat(e.target.value)} placeholder="Trophée / Familier…" />
                </div>
              </div>
              <Button type="submit">Ajouter</Button>
            </form>
          </Card>

          <div className="list">
            {items.map(it=>(
              <div key={it.id} className="item">
                <div>
                  <div className="item-title">{it.name}</div>
                  <div className="item-sub">{it.category || '—'}</div>
                </div>
                <button className="btn ghost" onClick={()=>remove('items', it.id)}>Suppr</button>
              </div>
            ))}
            {items.length===0 && <div className="h-sub">Ajoute des items (import Excel après).</div>}
          </div>
        </div>
      )}
    </div>
  )
}
