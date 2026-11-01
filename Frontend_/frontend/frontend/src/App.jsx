import { useState } from "react"
import Home from "./pages/Home"
import MetroSplash from "./components/MetroSplash"

function App() {
  const [showSplash, setShowSplash] = useState(true)

  if (showSplash) {
    return <MetroSplash onComplete={() => setShowSplash(false)} />
  }

  return <Home />
}

export default App