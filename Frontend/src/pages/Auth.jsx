import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
export default function Auth({ mode }) {
  const reg = mode === 'register', { login, register } = useAuth(), nav = useNavigate()
  const [f, setF] = useState({ name: '', username: '', email: '', password: '', confirm: '' }); const [err, setErr] = useState('')
  const on = k => e => setF({ ...f, [k]: e.target.value })
  const submit = async e => { e.preventDefault()
    if (!/\S+@\S+\.\S+/.test(f.email)) return setErr('Enter a valid email address.')
    if (f.password.length < 8) return setErr('Password must be at least 8 characters.')
    if (reg && f.password !== f.confirm) return setErr('Passwords do not match.')
    await (reg ? register(f) : login(f)); nav('/home') }
  return (<form className="wrap" onSubmit={submit} style={{ maxWidth: 400, display: 'grid', gap: 12, marginTop: 40 }}>
    <h1>{reg ? 'Create your account' : 'Welcome back'}</h1>
    {reg && <><input className="input" placeholder="Full name" aria-label="Full name" required value={f.name} onChange={on('name')} />
      <input className="input" placeholder="Username" aria-label="Username" required value={f.username} onChange={on('username')} /></>}
    <input className="input" type="email" placeholder="Email" aria-label="Email" required value={f.email} onChange={on('email')} />
    <input className="input" type="password" placeholder="Password" aria-label="Password" required value={f.password} onChange={on('password')} />
    {reg && <input className="input" type="password" placeholder="Confirm password" aria-label="Confirm password" required value={f.confirm} onChange={on('confirm')} />}
    {err && <p role="alert" style={{ color: 'var(--rose)' }}>{err}</p>}
    <button className="btn">{reg ? 'Create account' : 'Log in'}</button>
    <p style={{ color: 'var(--mute)' }}>{reg ? <>Have an account? <Link to="/login">Log in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}</p></form>)
}
