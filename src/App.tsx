import { AnimatePresence, MotionConfig, motion } from 'framer-motion'
import { useEffect, type ReactNode } from 'react'
import { HashRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { ProgressProvider, useProgress } from './game/ProgressContext'
import { HomeScreen } from './screens/HomeScreen'
import { LevelSelectScreen } from './screens/LevelSelectScreen'
import { MapScreen } from './screens/MapScreen'
import { PlayScreen } from './screens/PlayScreen'
import { ResultScreen } from './screens/ResultScreen'
import { SettingsScreen } from './screens/SettingsScreen'
import { Button } from './components/ui/Button'
import { HomeIcon } from './components/ui/Icons'
import { Screen, TopBar } from './components/ui'

/* ================================================================ app ==== */

export default function App() {
  return (
    <ProgressProvider>
      <MotionShell>
        <HashRouter>
          <AnimatedRoutes />
        </HashRouter>
      </MotionShell>
    </ProgressProvider>
  )
}

/**
 * Framer Motion already respects `prefers-reduced-motion`; this lets the
 * player's own Settings toggle force it on regardless of the device.
 */
function MotionShell({ children }: { children: ReactNode }) {
  const { reduceMotion } = useProgress()
  return <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>{children}</MotionConfig>
}

/* ========================================================== transition ==== */

/** Fade + lift applied to every screen so navigation feels continuous. */
function Page({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-dvh"
    >
      {children}
    </motion.div>
  )
}

/**
 * `AnimatePresence` needs a stable key per location, and `Routes` needs the
 * location passed in for that to work. Keying on the pathname also means the
 * Android hardware back button animates exactly like an in-app tap.
 */
function AnimatedRoutes() {
  const location = useLocation()
  return (
    <AnimatePresence mode="wait" initial={false}>
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<Page><HomeScreen /></Page>} />
        <Route path="/map" element={<Page><MapScreen /></Page>} />
        <Route path="/levels" element={<Page><LevelSelectScreen /></Page>} />
        <Route path="/world/:worldId" element={<Page><LevelSelectScreen /></Page>} />
        <Route path="/play/:puzzleId" element={<Page><PlayScreen /></Page>} />
        <Route path="/result/:puzzleId" element={<Page><ResultScreen /></Page>} />
        <Route path="/settings" element={<Page><SettingsScreen /></Page>} />
        <Route path="*" element={<Page><NotFoundScreen /></Page>} />
      </Routes>
    </AnimatePresence>
  )
}

/* =========================================================== not found ==== */

function NotFoundScreen() {
  const navigate = useNavigate()

  // A dead link should not strand someone on a blank page.
  useEffect(() => {
    const timer = window.setTimeout(() => navigate('/', { replace: true }), 3200)
    return () => window.clearTimeout(timer)
  }, [navigate])

  return (
    <Screen wash>
      <TopBar title="Page not found" subtitle="Taking you home…" />
      <main className="safe-x flex flex-1 flex-col items-center justify-center gap-4 pb-16 text-center">
        <p className="text-6xl" aria-hidden="true">
          🧭
        </p>
        <p className="max-w-xs text-lg font-extrabold text-ink">
          We could not find that part of the map.
        </p>
        <Button
          size="lg"
          icon={<HomeIcon />}
          onClick={() => navigate('/', { replace: true })}
        >
          Take me home
        </Button>
      </main>
    </Screen>
  )
}
