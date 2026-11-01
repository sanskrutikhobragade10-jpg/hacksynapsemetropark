import { useEffect } from "react"

function MetroSplash({ onComplete }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete()
    }, 3000)

    return () => clearTimeout(timer)
  }, [onComplete])

  return (
    <div className="metro-splash">
      <div className="splash-center">
        {/* YOUR ORIGINAL LOGO — DO NOT CHANGE */}
        <img
          src="/smartpark-logo.png"
          alt="SmartPark Metro"
          className="smartpark-original-logo"
        />
      </div>

      {/* Straight metro track */}
      <div className="straight-metro-track">
        <div className="straight-track-line" />

        <div className="speed-metro">
          <div className="speed-metro-body">
            <div className="speed-window" />
            <div className="speed-window" />
            <div className="speed-window" />
            <div className="speed-front" />
          </div>
        </div>
      </div>

      <div className="splash-message">
        <p>
          Connecting Cities
          <br />
          <span>for a Smarter Tomorrow</span>
        </p>

        <div className="splash-loading">
          <div className="splash-loading-progress" />
        </div>
      </div>
    </div>
  )
}

export default MetroSplash