import { useState, useEffect, useRef } from 'react'

// Inline SVG component — fetches SVG and renders it in the DOM
// so that foreignObject (used by Figma for conic gradients) actually works.
// <img> tags block foreignObject for security, making the reflections invisible.
// Uses DOMParser with 'image/svg+xml' to preserve SVG namespaces correctly.
function InlineSVG({ src, className, style }) {
  const ref = useRef(null)
  useEffect(() => {
    if (!src) return
    let cancelled = false
    fetch(src)
      .then(r => r.text())
      .then(svgText => {
        if (cancelled || !ref.current) return
        const parser = new DOMParser()
        const doc = parser.parseFromString(svgText, 'image/svg+xml')
        const svgEl = doc.documentElement
        // Clear previous content
        ref.current.replaceChildren()
        // Import the SVG node into the current document and append
        ref.current.appendChild(document.importNode(svgEl, true))
      })
    return () => { cancelled = true }
  }, [src])
  return <div ref={ref} className={className} style={style} />
}

// Asset URLs from Figma MCP
const imgBackground1 = "/assets/025d3f657d1b686cafbb225e15715ab69088dc7a.png"
const imgPlayer1 = "/assets/87de6d9ef5fd4ae7de91878f52b70e50bb5bd108.png"
const imgDisk = "/assets/eca046d6c044dcad9c55a1d40ba2ae8f08138e28.png"
const imgDiskShadow = "/assets/df79683ef0b2d7e4206a1e88815505d87cd2d937.svg"
const imgDisk1 = "/assets/e6fd18211623371d4adb853844b707e55d5d8b65.svg"
const imgTrack1 = "/assets/d563c763bf1804a8f16f527c1370abaa04e81a9c.svg"
const imgTrack2 = "/assets/83cbd9b60a15e118536062e02c77843483a53c12.svg"
const imgTrack3 = "/assets/b9597cc508bd84bfdb22d81f247e7a306d690d6f.svg"
const imgLever = "/assets/54ba133338ae46096073b9b4b15e6f63f8f21619.png"
const imgTonearm = "/assets/e5da95bc0a1a0c30e02dbda9ebb206282baebe83.png"
const imgShadow = "/assets/7a2cfe42e3d9d0f901132ecc6cb57279706ed2be.svg"
const imgEllipse1 = "/assets/bc8315089986979c1f2682c2a1c0dde220df7461.svg"
const imgEllipse7 = "/assets/2fb54ec698cb94022a2faff7d892559c7031a646.svg"
const imgEllipse4 = "/assets/700ebfe0286b245ed606d8e263cce2f6ab36a4f0.svg"
const imgEllipse5 = "/assets/1bda7ba2cdaecbe5f0cb3e963f36de62ba4588a7.svg"
const imgEllipse2 = "/assets/704436cd0d512a2f4dc1da16cc90caeb519e310d.svg"
const imgEllipse3 = "/assets/58a211177a70c624939226e22607a482dcfedab8.svg"
const imgEllipse6 = "/assets/4cde09c0abf66731a3a0b5aedf445dc713cf1860.svg"
const imgVector6 = "/assets/742dedf4a9ded1b357651511c4292304f92b31ea.svg"
const imgIcon = "/assets/1e6b56c25b2b349560d757237d728565757e3116.svg"
const imgPolygon1 = "/assets/cdf80228e9bd897375a7230094def3783e6b0d58.svg"

// Design frame: 1512 x 982 (MacBook Pro 14")

// Per-track configuration derived from Figma frames
const TRACK_CONFIG = {
  1: { title: 'Am I Dreaming', audio: '/audio/track1.mp3', video: '/video/track1.mp4', tonearmTop: 256.75, tonearmRotation: 0 },
  2: { title: 'Space Song', audio: '/audio/track2.mp3', video: '/video/track2.mp4', tonearmTop: 264.75, tonearmRotation: -2.61 },
  3: { title: 'Succession theme', audio: '/audio/track3.mp3', video: '/video/track3.mp4', tonearmTop: 268.75, tonearmRotation: -7.9 },
}

function PlayButton({ property1 = "play", onClick }) {
  const isPlay = property1 === "play"
  const isStop = property1 === "stop"
  const isShuffle = property1 === "shuffle"
  return (
    <div onClick={onClick} className="border-2 border-solid border-white flex items-center justify-center mix-blend-hard-light opacity-60 p-[36px] rounded-full shrink-0 size-[110px] cursor-pointer hover:opacity-80 transition-opacity">
      {isShuffle && (
        <div className="overflow-clip relative shrink-0 size-[48px]">
          <div className="absolute inset-[12.5%]">
            <div className="absolute inset-[-5.56%]">
              <img alt="" className="block max-w-none size-full" src={imgIcon} />
            </div>
          </div>
        </div>
      )}
      {isPlay && (
        <div className="flex items-center justify-center relative shrink-0 size-[66px]">
          <div className="-rotate-90 -scale-y-100 flex-none">
            <div className="relative size-[66px]">
              <div className="absolute bottom-1/4 left-[11.13%] right-[11.13%] top-[6.06%]">
                <img alt="" className="block max-w-none size-full" src={imgPolygon1} />
              </div>
            </div>
          </div>
        </div>
      )}
      {isStop && (
        <div className="relative shrink-0 size-[36px] bg-white rounded-[4px]" />
      )}
    </div>
  )
}

// Smoothly transition audio volume using requestAnimationFrame
function fadeVolume(audio, from, to, duration) {
  return new Promise(resolve => {
    audio.volume = from
    const start = performance.now()
    const step = (now) => {
      const t = Math.min((now - start) / duration, 1)
      audio.volume = from + (to - from) * t
      if (t < 1) requestAnimationFrame(step)
      else resolve()
    }
    requestAnimationFrame(step)
  })
}

export default function DefaultView() {
  const [playing, setPlaying] = useState(false)
  const [track, setTrack] = useState(null)
  const fadingRef = useRef(false)

  const audioRef = useRef(null)
  const videoRef = useRef(null)

  const currentConfig = TRACK_CONFIG[track]
  const tonearmTop = currentConfig ? currentConfig.tonearmTop : 256.75
  const tonearmRotation = currentConfig ? currentConfig.tonearmRotation : 0

  // Start audio+video playback directly from user gesture context (required by iOS Safari)
  const startTrack = (config) => {
    const audio = audioRef.current
    const video = videoRef.current
    if (audio) {
      audio.src = config.audio
      audio.volume = 0
      audio.currentTime = 0
      audio.play().catch(() => {})
      fadeVolume(audio, 0, 1, 800)
    }
    if (video) {
      video.src = config.video
      video.play().catch(() => {})
    }
  }

  // Cleanup: pause audio+video when stopped (delay video for opacity fade-out)
  useEffect(() => {
    if (!track || !playing) {
      const video = videoRef.current
      if (video) {
        const timeout = setTimeout(() => video.pause(), 1000)
        return () => clearTimeout(timeout)
      }
    }
  }, [track, playing])

  const [scale, setScale] = useState(() => {
    if (typeof window === 'undefined') return 1
    const vw = window.innerWidth
    return vw < 768 ? vw / 610 : Math.min(vw / 1512, window.innerHeight / 982)
  })
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  )

  useEffect(() => {
    const handleResize = () => {
      const vw = window.innerWidth
      const mobile = vw < 768
      setIsMobile(mobile)
      setScale(mobile ? vw / 610 : Math.min(vw / 1512, window.innerHeight / 982))
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div
      className="w-screen h-screen overflow-hidden flex items-center justify-center bg-black relative"
    >
      {/* Hidden audio element */}
      <audio ref={audioRef} preload="auto" />

      {/* 1. Default teal background image — always visible as base */}
      <img
        alt=""
        className="absolute pointer-events-none z-0"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '120%',
          height: '120%',
          objectFit: 'cover',
        }}
        src={imgBackground1}
      />

      {/* Background video — full viewport, anchored to bottom */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{
          opacity: playing ? 1 : 0,
          transition: 'opacity 1s ease',
          zIndex: 1,
          objectPosition: 'center bottom',
        }}
        muted
        loop
        playsInline
      />

      {/* Scaled container: 1512x982 design scaled to fit viewport */}
      <div
        className="absolute z-10"
        style={{
          width: 1512,
          height: 982,
          left: '50%',
          top: '50%',
          transformOrigin: 'center',
          transform: isMobile
            ? `translate(-50%, -50%) scale(${scale}) translateY(-25px)`
            : `translate(-50%, -50%) scale(${scale})`,
        }}
      >
        {/* Inner background for blend-mode compositing — fades out to reveal video */}
        {/* Hidden on mobile: blend compositing renders incorrectly on iOS Safari */}
        {!isMobile && (
          <img
            alt=""
            className="absolute pointer-events-none"
            style={{
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '120%',
              height: '120%',
              objectFit: 'cover',
              opacity: playing ? 0 : 1,
              transition: 'opacity 1s ease',
            }}
            src={imgBackground1}
          />
        )}

        {/* 2. Title — behind the player (z-10), visible only when NOT playing */}
        {/* On mobile, rendered outside container instead (below) for proper blend */}
        {!isMobile && (
          <p
            className="absolute left-1/2 -translate-x-1/2 mix-blend-overlay text-center text-white italic z-10 whitespace-nowrap"
            style={{
              top: 113,
              fontSize: 192,
              letterSpacing: -3.84,
              fontFamily: "'EightiesComeback It Light Condensed', 'EightiesComeback It', 'EightiesComeback_It', serif",
              fontWeight: 300,
              fontStretch: 'condensed',
              opacity: playing ? 0 : 1,
              transition: 'opacity 1s ease',
            }}
          >
            Dream Vinyl
          </p>
        )}

        {/* 3. Shadow under disk (z-15) */}
        <div
          className="absolute mix-blend-soft-light z-[15]"
          style={{ left: 563, top: 350, width: 574, height: 296 }}
        >
          <div className="absolute" style={{ inset: '-14.86% -7.67%' }}>
            <img alt="" className="block max-w-none size-full" src={imgShadow} />
          </div>
        </div>

        {/* 4. Player body (z-20) — on top of title */}
        <div
          className="absolute z-20"
          style={{ left: 419, top: 158, width: 698, height: 717 }}
        >
          <img
            alt=""
            className="absolute inset-0 w-full h-full object-cover pointer-events-none"
            src={imgPlayer1}
          />
        </div>

        {/* 5. Disk frame (z-25) — static, matching Figma exactly */}
        <div
          className="absolute z-25 overflow-hidden"
          style={{ left: 446, top: 230.76, width: 541.089, height: 422.745 }}
        >
          {/* Disk shadow */}
          <div
            className="absolute mix-blend-multiply"
            style={{ left: 'calc(50% + 46.46px)', transform: 'translateX(-50%)', top: 80.24, width: 348, height: 275 }}
          >
            <div className="absolute" style={{ inset: '-7.27% -5.75%' }}>
              <img alt="" className="block max-w-none size-full" src={imgDiskShadow} />
            </div>
          </div>

          {/* Disk body — matching Figma: shadow + backdrop blur + opacity */}
          <div
            className="absolute flex items-center justify-center"
            style={{ left: 0, top: 0, width: 541.089, height: 422.745 }}
          >
            <div className="flex-none" style={{ transform: 'rotate(-38deg) scaleY(0.97) skewX(14deg)' }}>
              <div
                className="relative"
                style={{
                  width: 354.789,
                  height: 331.863,
                  filter: 'drop-shadow(4px 0px 8px rgba(0,0,0,0.25))',
                }}
              >
                <div
                  className="absolute inset-0 overflow-hidden pointer-events-none"
                  style={{
                    backdropFilter: 'blur(4.8px)',
                    WebkitBackdropFilter: 'blur(4.8px)',
                    opacity: 0.65,
                  }}
                >
                  {/* Spin wrapper — rotates disk image around its center inside the isometric projection */}
                  <div
                    className="absolute inset-0"
                    style={{
                      transformOrigin: '170px 170px',
                      animation: playing ? 'diskSpin 8s linear infinite' : 'none',
                    }}
                  >
                    <img alt="" className="absolute max-w-none" style={{ height: '180.19%', left: '-36.36%', top: '-38.81%', width: '168.55%' }} src={imgDisk} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NOTE: Disk centre mask removed — label visible through base disk image */}

          {/* Track grooves */}
          <div className="absolute mix-blend-plus-lighter" style={{ left: 'calc(50% - 3.54px)', transform: 'translateX(-50%)', top: 122.24, width: 242, height: 191 }}>
            <div className="absolute" style={{ inset: '-0.52% -0.41%' }}>
              <img alt="" className="block max-w-none size-full" src={imgTrack1} />
            </div>
          </div>
          <div className="absolute mix-blend-plus-lighter" style={{ left: 'calc(50% - 3.54px)', transform: 'translateX(-50%)', top: 110.24, width: 272, height: 214 }}>
            <div className="absolute" style={{ inset: '-0.47% -0.37%' }}>
              <img alt="" className="block max-w-none size-full" src={imgTrack2} />
            </div>
          </div>
          <div className="absolute mix-blend-plus-lighter" style={{ left: 'calc(50% - 3.54px)', transform: 'translateX(-50%)', top: 98.24, width: 300, height: 236 }}>
            <div className="absolute" style={{ inset: '-0.42% -0.33%' }}>
              <img alt="" className="block max-w-none size-full" src={imgTrack3} />
            </div>
          </div>
        </div>

        {/* 6. Shadows on disk — right above disk frame (z-26) — disabled on mobile (plus-lighter blend breaks on iOS Safari) */}
        <div className="absolute pointer-events-none" style={{ left: 0, top: 0, width: 1512, height: 982, zIndex: 26, isolation: 'auto', display: isMobile ? 'none' : undefined }}>
          <div className="absolute h-[229px] left-[712px] mix-blend-plus-lighter top-[331px] w-[149px]">
            <div className="absolute" style={{ inset: '-17.25% -26.51% -17.25% -16.11%' }}>
              <InlineSVG className="block size-full overflow-visible" src={imgEllipse1} />
            </div>
          </div>
          <div className="absolute flex h-[192.92px] items-center justify-center left-[561.83px] mix-blend-plus-lighter top-[393.89px] w-[329.112px]">
            <div className="flex-none rotate-[81.57deg]">
              <div className="h-[310.628px] relative w-[149px]">
                <div className="absolute" style={{ inset: '-12.72% -26.51% -12.72% -16.11%' }}>
                  <InlineSVG className="block size-full overflow-visible" src={imgEllipse7} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute flex h-[280px] items-center justify-center left-[535px] mix-blend-plus-lighter top-[309px] w-[182px]">
            <div className="-scale-y-100 flex-none rotate-180">
              <div className="h-[280px] relative w-[182px]">
                <div className="absolute" style={{ inset: '-2.86% -4.4% -2.86% -3.3%' }}>
                  <InlineSVG className="block size-full overflow-visible" src={imgEllipse4} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute flex h-[280px] items-center justify-center left-[535px] mix-blend-plus-lighter top-[309px] w-[182px]">
            <div className="-scale-y-100 flex-none rotate-180">
              <div className="h-[280px] relative w-[182px]">
                <div className="absolute" style={{ inset: '-2.86% -4.4% -2.86% -3.3%' }}>
                  <InlineSVG className="block size-full overflow-visible" src={imgEllipse5} />
                </div>
              </div>
            </div>
          </div>
          <div className="absolute h-[141px] left-[712px] mix-blend-plus-lighter top-[378px] w-[96px]">
            <div className="absolute" style={{ inset: '-24.47% -35.94% -24.47% -25%' }}>
              <InlineSVG className="block size-full overflow-visible" src={imgEllipse2} />
            </div>
          </div>
          <div className="absolute h-[90px] left-[708.5px] mix-blend-plus-lighter top-[402.5px] w-[61.5px]">
            <div className="absolute" style={{ inset: '-5.56% -8.13% -5.56% -6.5%' }}>
              <InlineSVG className="block size-full overflow-visible" src={imgEllipse3} />
            </div>
          </div>
          <div className="absolute flex h-[90px] items-center justify-center left-[655.5px] top-[402.5px] w-[61.5px]">
            <div className="-scale-y-100 flex-none rotate-180">
              <div className="h-[90px] relative w-[61.5px]">
                <div className="absolute" style={{ inset: '-5.56% -8.13% -5.56% -6.5%' }}>
                  <InlineSVG className="block size-full overflow-visible" src={imgEllipse6} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 7. Lever (z-35) */}
        <div
          className="absolute z-35"
          style={{ left: 868.31, top: 300.2, width: 104.8, height: 99.2 }}
        >
          <div
            className="absolute"
            style={{
              left: 0, top: 0, width: 104.8, height: 99.2,
              filter: 'drop-shadow(4px 14px 6px rgba(0,0,0,0.53))',
            }}
          >
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
              <img
                alt=""
                className="absolute max-w-none"
                style={{ height: '579.56%', left: '-357.64%', top: '-145.99%', width: '551.39%' }}
                src={imgLever}
              />
            </div>
          </div>
        </div>

        {/* 8. Tonearm (z-35) */}
        <div
          className="absolute z-35"
          style={{
            left: 733.44, top: tonearmTop, width: 230.236, height: 284.928,
            transform: `rotate(${tonearmRotation}deg)`,
            transition: 'top 0.8s ease, transform 0.8s ease',
          }}
        >
          <div
            className="absolute flex items-center justify-center"
            style={{ left: 0, top: 3, width: 230.236, height: 284.928 }}
          >
            <div className="flex-none" style={{ transform: 'rotate(5.42deg)' }}>
              <div
                className="relative"
                style={{
                  width: 205.953, height: 266.655,
                  filter: 'drop-shadow(10px 14px 10px rgba(0,0,0,0.25))',
                }}
              >
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <img
                    alt=""
                    className="absolute max-w-none"
                    style={{ height: '215.18%', left: '-127.37%', top: '-37.4%', width: '278.6%' }}
                    src={imgTonearm}
                  />
                </div>
              </div>
            </div>
          </div>
          {/* Headshell shadow */}
          <div
            className="absolute mix-blend-soft-light"
            style={{ left: 44.56, top: 257.75, width: 61.5, height: 13.5 }}
          >
            <div className="absolute" style={{ inset: '-40.31% -5.75%' }}>
              <img alt="" className="block max-w-none size-full" src={imgVector6} />
            </div>
          </div>
        </div>

        {/* 9. Play / Shuffle buttons (z-40) */}
        <div
          className="absolute left-1/2 -translate-x-1/2 flex gap-[48px] items-center z-40"
          style={{ top: 721 }}
        >
          <PlayButton property1={playing ? "stop" : "play"} onClick={() => {
            if (playing) {
              const audio = audioRef.current
              if (audio) {
                fadingRef.current = true
                fadeVolume(audio, audio.volume, 0, 600).then(() => {
                  audio.pause()
                  audio.currentTime = 0
                  fadingRef.current = false
                })
              }
              setPlaying(false)
              setTrack(null)
            } else {
              const config = TRACK_CONFIG[1]
              startTrack(config)
              setPlaying(true)
              setTrack(1)
            }
          }} />
          <PlayButton property1="shuffle" onClick={() => {
            const nextTrack = (track || 0) === 3 ? 1 : (track || 0) + 1
            const config = TRACK_CONFIG[nextTrack]
            startTrack(config)
            setTrack(nextTrack)
            setPlaying(true)
          }} />
        </div>

      </div>

      {/* "Dream Vinyl" title — mobile only, outside container for proper overlay blend */}
      {isMobile && (
        <p
          className="absolute left-1/2 -translate-x-1/2 mix-blend-overlay text-center text-white italic pointer-events-none z-[5]"
          style={{
            top: `calc(50% - ${(982 / 2) * scale + 25 * scale - 40}px)`,
            fontSize: 80,
            lineHeight: '78px',
            letterSpacing: -1.6,
            maxWidth: '85vw',
            overflow: 'visible',
            fontFamily: "'EightiesComeback It Light Condensed', 'EightiesComeback It', 'EightiesComeback_It', serif",
            fontWeight: 300,
            fontStretch: 'condensed',
            opacity: playing ? 0 : 1,
            transition: 'opacity 1s ease',
          }}
        >
          Dream Vinyl
        </p>
      )}

      {/* Track title — outside scaled container so mix-blend-overlay blends with video */}
      {currentConfig && (
        <p
          className="absolute left-1/2 -translate-x-1/2 mix-blend-overlay text-center text-white italic pointer-events-none z-[5]"
          style={{
            top: isMobile
              ? `calc(50% - ${(982 / 2) * scale + 25 * scale - 40}px)`
              : `calc(50% - ${(982 / 2 - 113) * scale}px)`,
            fontSize: isMobile ? 80 : 192 * scale,
            lineHeight: isMobile ? '78px' : 'normal',
            letterSpacing: isMobile ? -1.6 : -3.84 * scale,
            whiteSpace: isMobile ? 'normal' : 'nowrap',
            maxWidth: isMobile ? '85vw' : undefined,
            overflow: isMobile ? 'visible' : undefined,
            fontFamily: "'EightiesComeback It Light Condensed', 'EightiesComeback It', 'EightiesComeback_It', serif",
            fontWeight: 300,
            fontStretch: 'condensed',
            opacity: playing ? 1 : 0,
            transition: 'opacity 1s ease',
          }}
        >
          {currentConfig.title}
        </p>
      )}

      {/* Footer — fixed to viewport bottom, full width, outside scaled container */}
      <div
        className="absolute bottom-0 left-0 w-full z-40"
        style={{
          padding: isMobile ? '28px 0' : '40px 60px',
          color: 'rgba(255,255,255,0.7)',
          fontFamily: "'EightiesComeback Light Condensed', 'EightiesComeback', serif",
          fontWeight: 300,
          fontStretch: 'condensed',
          fontStyle: 'normal',
          fontKerning: 'normal',
          fontFeatureSettings: '"kern" 1',
          fontSize: isMobile ? 16 : 24,
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: 'center',
          justifyContent: isMobile ? 'center' : 'space-between',
          gap: isMobile ? 16 : 0,
          textAlign: 'center',
          lineHeight: 'normal',
          letterSpacing: 'normal',
        }}
      >
        <a className="shrink-0 hover:text-white transition-colors" href="https://ashitajain.framer.website/#hero" target="_blank" rel="noopener noreferrer">Project by Ashita Jain</a>
        <div className="flex items-center shrink-0" style={{ gap: isMobile ? 16 : 24 }}>
          <a className="shrink-0 cursor-pointer hover:text-white transition-colors" href="mailto:ashikhushi2@gmail.com">email</a>
          <a className="shrink-0 cursor-pointer hover:text-white transition-colors" href="https://www.linkedin.com/in/ashitajain29/" target="_blank" rel="noopener noreferrer">linkedin</a>
          <a className="shrink-0 cursor-pointer hover:text-white transition-colors" href="https://www.instagram.com/chiaroscuro.o/" target="_blank" rel="noopener noreferrer">instagram</a>
          <a className="shrink-0 cursor-pointer hover:text-white transition-colors" href="https://x.com/okayashita" target="_blank" rel="noopener noreferrer">twitter</a>
        </div>
      </div>
    </div>
  )
}
