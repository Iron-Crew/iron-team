import React, { useState } from 'react'
import { supabase } from '../supabaseClient'
import { Card, Button } from '../ui'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('magic')
  const [msg, setMsg] = useState(null)
  const [busy, setBusy] = useState(false)

  async function onMagicLink(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signInWithOtp({ email })
    setBusy(false)
    setMsg(error ? error.message : 'Lien envoyé. Ouvre ton mail et clique le lien.')
  }

  async function onPassword(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    setMsg(error ? error.message : null)
  }

  async function onSignup(e) {
    e.preventDefault()
    setBusy(true); setMsg(null)
    const { error } = await supabase.auth.signUp({ email, password })
    setBusy(false)
    setMsg(error ? error.message : 'Compte créé. Connecte-toi (ou confirme ton mail si demandé).')
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <div className="h-title">Iron Team</div>
          <div className="h-sub">Connexion — sauvegarde cloud</div>
        </div>
      </div>

      <Card>
        <div className="row wrap" style={{marginBottom:10}}>
          <button className={'btn ghost ' + (mode==='magic'?'primary':'')} onClick={()=>setMode('magic')}>Lien magique</button>
          <button className={'btn ghost ' + (mode==='password'?'primary':'')} onClick={()=>setMode('password')}>Mot de passe</button>
        </div>

        <form onSubmit={mode==='magic' ? onMagicLink : onPassword}>
          <label className="h-sub">Email</label>
          <input className="input" value={email} onChange={e=>setEmail(e.target.value)} placeholder="ton@email.fr" required />

          {mode === 'password' && (
            <>
              <div style={{height:10}} />
              <label className="h-sub">Mot de passe</label>
              <input className="input" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required />
              <div className="row" style={{marginTop:10}}>
                <Button type="submit" disabled={busy}>Se connecter</Button>
                <div className="spacer" />
                <Button variant="ghost" onClick={onSignup} disabled={busy}>Créer un compte</Button>
              </div>
            </>
          )}

          {mode === 'magic' && (
            <div className="row" style={{marginTop:10}}>
              <Button type="submit" disabled={busy}>Envoyer le lien</Button>
            </div>
          )}

          {msg && <p className="h-sub" style={{marginTop:12}}>{msg}</p>}
          <p className="h-sub" style={{marginTop:12}}>
            Astuce iPhone : le lien magique évite de retenir un mot de passe.
          </p>
        </form>
      </Card>
    </div>
  )
}
