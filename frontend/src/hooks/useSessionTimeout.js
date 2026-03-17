/**
 * useSessionTimeout.js
 *
 * Cierra la sesión del usuario después de INACTIVITY_MS de inactividad.
 * Muestra una advertencia WARNING_MS antes de cerrar para que pueda continuar.
 *
 * Eventos que reinician el contador: mousemove, mousedown, keydown, scroll, touchstart.
 */
import { useEffect, useRef, useCallback, useState } from 'react'
import { useClerk } from '@clerk/clerk-react'

const INACTIVITY_MS = 20 * 60 * 1000   // 20 minutos
const WARNING_MS    =  2 * 60 * 1000   // advertir 2 min antes (a los 18 min)
const TICK_MS       = 10 * 1000        // revisar cada 10 segundos

export function useSessionTimeout() {
  const { signOut } = useClerk()
  const lastActivityRef = useRef(Date.now())
  const [showWarning, setShowWarning]     = useState(false)
  const [secondsLeft, setSecondsLeft]     = useState(WARNING_MS / 1000)

  // Registra cualquier actividad del usuario
  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now()
    setShowWarning(false)
    setSecondsLeft(WARNING_MS / 1000)
  }, [])

  // Permite al usuario extender la sesión manualmente desde el modal
  const extendSession = useCallback(() => {
    resetTimer()
  }, [resetTimer])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }))

    const interval = setInterval(() => {
      const idle = Date.now() - lastActivityRef.current

      if (idle >= INACTIVITY_MS) {
        // Tiempo expirado → cerrar sesión
        clearInterval(interval)
        signOut()
        return
      }

      if (idle >= INACTIVITY_MS - WARNING_MS) {
        // Dentro del período de advertencia → mostrar modal y actualizar cuenta regresiva
        const remaining = Math.ceil((INACTIVITY_MS - idle) / 1000)
        setSecondsLeft(remaining)
        setShowWarning(true)
      } else {
        setShowWarning(false)
      }
    }, TICK_MS)

    return () => {
      clearInterval(interval)
      events.forEach(e => window.removeEventListener(e, resetTimer))
    }
  }, [resetTimer, signOut])

  return { showWarning, secondsLeft, extendSession }
}
