import { useEffect, useState } from 'react'

const TRACK_NAMES = {
  1: 'Track 1',
  2: 'Track 2',
  3: 'Track 3',
}

export default function TrackView({ trackNumber, diskImage, onChangeTrack, onBack }) {
  const [spinning, setSpinning] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setSpinning(true), 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="relative w-full h-full bg-white flex flex-col items-center justify-center">
      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute top-[40px] left-[40px] bg-transparent border-none text-black text-[20px] cursor-pointer font-['Roboto',sans-serif] font-semibold hover:opacity-70 transition-opacity z-10 flex items-center gap-2"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        Back
      </button>

      {/* Track name */}
      <p className="absolute top-[40px] font-['Roboto',sans-serif] font-bold text-[32px] text-black">
        {TRACK_NAMES[trackNumber]}
      </p>

      {/* Vinyl container */}
      <div className="relative w-[600px] h-[600px]">
        {/* Vinyl base (gray square) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-[#d9d9d9] rounded-[8px]" />

        {/* Vinyl disk (spinning) */}
        <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] h-[440px] ${spinning ? 'animate-[spin_3s_linear_infinite]' : ''}`}>
          <img
            alt="Vinyl disk"
            className="block w-full h-full"
            src={diskImage}
          />
        </div>
      </div>

      {/* Change track button */}
      <button
        onClick={onChangeTrack}
        className="mt-[40px] bg-black text-white font-['Roboto',sans-serif] font-semibold text-[22px] px-[40px] py-[16px] border-none cursor-pointer hover:bg-[#333] transition-colors"
      >
        Change track
      </button>
    </div>
  )
}
