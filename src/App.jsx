import React, { useEffect, useMemo } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './ui'
import { useSession } from './useSession'

import Login from './pages/Login'
import Characters from './pages/Characters'
import Dofus from './pages/Dofus'
import Settings from './pages/Settings'

function tabFromPath(p){
  if(p.startsWith('/dofus')) return 'dofus'
  if(p.startsWith('/reglages')) return 'reglages'
  return 'persos'
}

export default function App(){
  const { session, loading } = useSession()
  const loc = useLocation()
  const nav = useNavigate()

  const current = useMemo(()=>tabFromPath(loc.pathname), [loc.pathname])

  useEffect(()=>{
    if(loc.pathname==='/') nav('/persos',{replace:true})
  }, [loc.pathname, nav])

  const tabs = [
    { key:'persos', label:'Persos', icon:'👤', path:'/persos' },
    { key:'dofus', label:'Dofus', icon:'🥚', path:'/dofus' },
    { key:'reglages', label:'Réglages', icon:'⚙️', path:'/reglages' },
  ]

  if(loading) return <div className="container"><div className="h-sub">Chargement…</div></div>
  if(!session) return <Login />

  return (
    <>
      <Routes>
        <Route path="/persos" element={<Characters/>} />
        <Route path="/dofus" element={<Dofus/>} />
        <Route path="/reglages" element={<Settings/>} />
        <Route path="*" element={<Characters/>} />
      </Routes>

      <BottomNav
        tabs={tabs}
        current={current}
        onChange={(k)=>{
          const t=tabs.find(x=>x.key===k)
          if(t) nav(t.path)
        }}
      />
    </>
  )
}