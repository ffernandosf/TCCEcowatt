import { useEffect, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from './lib/firebase'
import { useI18n } from './lib/i18n'
import { LoginPage } from './components/LoginPage'
import { Dashboard } from './components/Dashboard'
import { syncDemoMode } from './lib/demo'

function App() {
  const { t } = useI18n()
  const [user, setUser] = useState<User | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      syncDemoMode(u?.email)
      setUser(u)
      setReady(true)
    })
  }, [])

  useEffect(() => {
    document.title = `Ecowatt — ${t.brand.slogan}`
  }, [t])

  if (!ready) return null

  if (!user) return <LoginPage />

  return <Dashboard />
}

export default App
