import React, { useEffect, useMemo, useState } from 'react'
import { Card } from '../ui'
import { listCharacters, listProgress, upsertProgress } from '../data'

const STAT_COLS = [
  { key:'VITALITE', label:'Vitalité' },
  { key:'SAGESSE', label:'Sagesse' },
  { key:'FORCE', label:'Force' },
  { key:'INTELLIGENCE', label:'Intelligence' },
  { key:'CHANCE', label:'Chance' },
  { key:'AGILITE', label:'Agilité' },
]

function normalizeAccount(a){
  const s=(a ?? '').toString().trim()
  return s || 'Sans compte'
}

function clamp(v){
  const n = Number(v)
  if(!Number.isFinite(n)) return null
  return Math.max(0,Math.trunc(n))
}

export default function Characters(){

  const [rows,setRows]=useState([])
  const [prog,setProg]=useState([])
  const [loading,setLoading]=useState(true)

  async function refresh(){
    const [chars,p]=await Promise.all([
      listCharacters(),
      listProgress('stats')
    ])
    setRows(chars || [])
    setProg(p || [])
    setLoading(false)
  }

  useEffect(()=>{refresh()},[])

  const progMap = useMemo(()=>{
    const m={}
    for(const r of prog){
      if(!m[r.character_id]) m[r.character_id]={}
      m[r.character_id][r.key]=r.value_int
    }
    return m
  },[prog])

  const grouped = useMemo(()=>{
    const map={}
    for(const c of rows){
      const acc=normalizeAccount(c.account)
      if(!map[acc]) map[acc]=[]
      map[acc].push(c)
    }
    const keys=Object.keys(map).sort((a,b)=>a.localeCompare(b,'fr'))
    return {map,keys}
  },[rows])

  async function save(character_id,key,value){
    await upsertProgress({
      character_id,
      category:'stats',
      key,
      status:'done',
      value_int:value
    })
    setProg(await listProgress('stats'))
  }

  function nextTri(v){
    if(v==='X') return 'O'
    if(v==='O') return ''
    return 'X'
  }

  if(loading) return <div className="container">Chargement…</div>

  return (
  <div className="container">

    {grouped.keys.map(acc=>(
      <Card key={acc} className="grid" style={{marginBottom:12}}>

        <div className="h-sub" style={{fontWeight:'bold'}}>
          Compte {acc}
        </div>

        <div className="table-wrap">
        <table className="progress-table">

        <thead>
        <tr>

        <th className="sticky-col sticky-head">Perso</th>

        {STAT_COLS.map(c=>(
          <th key={c.key}>{c.label}</th>
        ))}

        <th>Justiciers</th>
        <th>Parangon</th>

        </tr>
        </thead>

        <tbody>

        {grouped.map[acc].map(c=>{

        const stats=progMap[c.id]||{}

        return(
        <tr key={c.id}>

        <td className="sticky-col sticky-cell">

        <div style={{fontWeight:900}}>
        {c.name}
        </div>

        <div className="h-sub">

        {c.clazz} • <span style={{color:"#7c3aed"}}>Niv {c.level}</span>

        </div>

        </td>

        {STAT_COLS.map(col=>{

        const val=stats[col.key] ?? ''

        const ok = Number(val)===100

        return(
        <td key={col.key}>

        <input
        value={val}
        placeholder="0"
        onChange={(e)=>save(c.id,col.key,clamp(e.target.value))}
        style={{
        width:70,
        height:34,
        borderRadius:10,
        border:'1px solid rgba(0,0,0,0.1)',
        textAlign:'center',
        fontWeight:800,
        background: ok ? 'rgba(34,197,94,0.25)' : 'white'
        }}
        />

        </td>
        )
        })}

        {['JUSTICIER','PARANGON'].map(key=>{

        const val=stats[key] || ''

        const color =
        val==='X'
        ? 'rgba(34,197,94,0.25)'
        : val==='O'
        ? 'rgba(245,158,11,0.25)'
        : 'white'

        return(
        <td key={key}>

        <button
        onClick={()=>save(c.id,key,nextTri(val))}
        style={{
        width:60,
        height:34,
        borderRadius:10,
        border:'1px solid rgba(0,0,0,0.1)',
        fontWeight:900,
        background:color
        }}
        >
        {val}
        </button>

        </td>
        )
        })}

        </tr>
        )
        })}

        </tbody>
        </table>
        </div>

      </Card>
    ))}

  </div>
  )
}