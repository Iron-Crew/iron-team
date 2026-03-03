import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Button } from '../ui'
import { listCharacters, listItemsForCharacter, addItem, deleteRow } from '../data'

export default function Items(){
  const [chars,setChars]=useState([])
  const [sel,setSel]=useState(null)
  const [rows,setRows]=useState([])
  const [q,setQ]=useState('')
  const [name,setName]=useState('')
  const [cat,setCat]=useState('')
  const nav = useNavigate()

  async function load(forceSel){
    const cs=await listCharacters()
    setChars(cs)
    const s=forceSel ?? sel ?? (cs[0]?.id ?? null)
    setSel(s)
    setRows(s ? await listItemsForCharacter(s) : [])
  }
  useEffect(()=>{ load(null) }, [])
  useEffect(()=>{ if(sel) load(sel) }, [sel])

  async function add(e){
    e.preventDefault()
    if(!sel || !name.trim()) return
    await addItem({ character_id: sel, name: name.trim(), category: cat.trim()||null, comment: null })
    setName(''); setCat('')
    await load(sel)
  }
  async function remove(id){
    if(!confirm('Supprimer ?')) return
    await deleteRow('items', id)
    await load(sel)
  }

  const filtered = rows.filter(r => (r.name||'').toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="container">
      <div className="header">
        <div><div className="h-title">Items</div><div className="h-sub">Inventaire par perso</div></div>
      </div>

      <Card style={{marginBottom:12}}>
        <div className="row wrap">
          <select className="select" value={sel ?? ''} onChange={e=>setSel(e.target.value || null)}>
            {chars.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          {sel && <Button variant="ghost" onClick={()=>nav(`/persos/${sel}`)}>Fiche</Button>}
        </div>

        <div style={{height:10}} />
        <input className="input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Rechercher…" />

        <form onSubmit={add} className="grid" style={{marginTop:10}}>
          <div className="grid grid2">
            <div><div className="h-sub">Nom</div><input className="input" value={name} onChange={e=>setName(e.target.value)} /></div>
            <div><div className="h-sub">Catégorie</div><input className="input" value={cat} onChange={e=>setCat(e.target.value)} /></div>
          </div>
          <Button type="submit">Ajouter</Button>
        </form>
      </Card>

      <div className="list">
        {filtered.map(r=>(
          <div key={r.id} className="item">
            <div>
              <div className="item-title">{r.name}</div>
              <div className="item-sub">{r.category || '—'}</div>
            </div>
            <button className="btn ghost" onClick={()=>remove(r.id)}>Suppr</button>
          </div>
        ))}
        {sel && filtered.length===0 && <div className="h-sub">Aucun item.</div>}
      </div>
    </div>
  )
}
