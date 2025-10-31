import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import { attachAuthListener } from './config/firebase'
import { useStore } from './store/useStore'
import './index.css'

function Root() {
  const setUser = useStore(s => s.setUser)
  React.useEffect(() => {
    const unsubscribe = attachAuthListener((user) => setUser(user))
    return () => unsubscribe()
  }, [setUser])
  return (
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(<Root />)
