'use client';

/**
 * Animated ocean waves at the bottom of the screen on the oceanic theme.
 * Three SVG wave layers scroll horizontally at different speeds for parallax.
 * Hidden via CSS when data-theme is not "oceanic".
 */

export function OceanicWaves() {
  return (
    <div className="oceanic-waves-container" aria-hidden="true">
      {/* Back wave - slowest, most transparent */}
      <div className="oceanic-wave oceanic-wave--back">
        <div className="oceanic-wave-swell oceanic-wave-swell--back">
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M0,60 C240,90 480,30 720,60 C960,90 1200,30 1440,60 C1680,90 1920,30 2160,60 C2400,90 2640,30 2880,60 L2880,120 L0,120 Z"
            />
          </svg>
        </div>
      </div>
      {/* Middle wave */}
      <div className="oceanic-wave oceanic-wave--mid">
        <div className="oceanic-wave-swell oceanic-wave-swell--mid">
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M0,70 C200,40 440,90 720,55 C1000,20 1200,80 1440,70 C1680,40 1880,90 2160,55 C2440,20 2640,80 2880,70 L2880,120 L0,120 Z"
            />
          </svg>
        </div>
      </div>
      {/* Front wave - fastest, most visible */}
      <div className="oceanic-wave oceanic-wave--front">
        <div className="oceanic-wave-swell oceanic-wave-swell--front">
          <svg viewBox="0 0 2880 120" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
            <path
              fill="currentColor"
              d="M0,65 C180,85 360,35 720,65 C1080,95 1260,25 1440,65 C1620,85 1800,35 2160,65 C2520,95 2700,25 2880,65 L2880,120 L0,120 Z"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
