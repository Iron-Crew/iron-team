import React from 'react'
import { supabase } from '../supabaseClient'
import { Card, Button } from '../ui'

export default function Settings(){
  async function logout(){ await supabase.auth.signOut() }

  return (
    <div className="container">
      <div className="header">
        <div><div className="h-title">Réglages</div><div className="h-sub">Compte</div></div>
      </div>
      <Card className="grid">
        <Button variant="ghost" onClick={logout}>Se déconnecter</Button>
        <div className="h-sub">Next : import Excel + stuffs.</div>
      </Card>
    </div>
  )
}
