"use client"

import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react"
import { AnimatePresence, motion } from "motion/react"

export interface Logo {
  name: string
  id: number
  img: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface LogoColumnProps {
  logos: Logo[]
  index: number
  currentTime: number
  onLogoClick?: (logoName: string) => void
}

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

const distributeLogos = (allLogos: Logo[], columnCount: number): Logo[][] => {
  const shuffled = shuffleArray(allLogos)
  const columns: Logo[][] = Array.from({ length: columnCount }, () => [])

  shuffled.forEach((logo, index) => {
    columns[index % columnCount].push(logo)
  })

  const maxLength = Math.max(...columns.map((col) => col.length))
  columns.forEach((col) => {
    while (col.length < maxLength) {
      col.push(shuffled[Math.floor(Math.random() * shuffled.length)])
    }
  })

  return columns
}

export const LogoColumn: React.FC<LogoColumnProps> = React.memo(
  ({ logos, index, currentTime, onLogoClick }) => {
    const cycleInterval = 2000
    const columnDelay = index * 200
    const adjustedTime = (currentTime + columnDelay) % (cycleInterval * logos.length)
    const currentIndex = Math.floor(adjustedTime / cycleInterval)
    const CurrentLogo = useMemo(() => logos[currentIndex].img, [logos, currentIndex])

    return (
      <motion.div
        onClick={() => onLogoClick?.(logos[currentIndex].name)}
        className="relative h-16 w-24 overflow-hidden md:h-24 md:w-40 bg-stone-50 hover:bg-stone-100/50 border border-stone-200/50 rounded-xl p-3 flex items-center justify-center shadow-xs transition-colors group cursor-pointer"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: index * 0.1,
          duration: 0.5,
          ease: "easeOut",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={`${logos[currentIndex].id}-${currentIndex}`}
            className="absolute inset-0 flex flex-col items-center justify-center p-3"
            initial={{ y: "15%", opacity: 0, filter: "blur(4px)" }}
            animate={{
              y: "0%",
              opacity: 1,
              filter: "blur(0px)",
              transition: {
                type: "spring",
                stiffness: 260,
                damping: 22,
                mass: 1,
                bounce: 0.15,
                duration: 0.5,
              },
            }}
            exit={{
              y: "-15%",
              opacity: 0,
              filter: "blur(4px)",
              transition: {
                type: "tween",
                ease: "easeIn",
                duration: 0.25,
              },
            }}
          >
            <CurrentLogo className="h-10 w-10 md:h-12 md:w-12 text-stone-400 group-hover:text-amber-700 transition-colors duration-300 object-contain" />
            <span className="text-[9px] font-mono font-bold tracking-wider uppercase text-stone-400 group-hover:text-amber-800 transition-colors mt-1">
              {logos[currentIndex].name}
            </span>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    )
  }
)

LogoColumn.displayName = "LogoColumn";

interface LogoCarouselProps {
  columnCount?: number
  logos: Logo[]
  onLogoClick?: (logoName: string) => void
}

export function LogoCarousel({ columnCount = 4, logos, onLogoClick }: LogoCarouselProps) {
  const [logoSets, setLogoSets] = useState<Logo[][]>([])
  const [currentTime, setCurrentTime] = useState(0)

  const updateTime = useCallback(() => {
    setCurrentTime((prevTime) => prevTime + 100)
  }, [])

  useEffect(() => {
    const intervalId = setInterval(updateTime, 100)
    return () => clearInterval(intervalId)
  }, [updateTime])

  useEffect(() => {
    const distributedLogos = distributeLogos(logos, columnCount)
    setLogoSets(distributedLogos)
  }, [logos, columnCount])

  return (
    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
      {logoSets.map((logos, index) => (
        <LogoColumn
          key={index}
          logos={logos}
          index={index}
          currentTime={currentTime}
          onLogoClick={onLogoClick}
        />
      ))}
    </div>
  )
}

// Brand SVG Icons
export const MercedesIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <circle cx="50" cy="50" r="45" />
    <path d="M50 5 L50 50 L11 72.5 M50 50 L89 72.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const BMWIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2" {...props}>
    <circle cx="50" cy="50" r="46" strokeWidth="3" />
    <circle cx="50" cy="50" r="30" strokeWidth="1.5" />
    <path d="M50 20 A30 30 0 0 1 80 50 L50 50 Z" fill="currentColor" fillOpacity="0.15" stroke="none" />
    <path d="M50 80 A30 30 0 0 1 20 50 L50 50 Z" fill="currentColor" fillOpacity="0.15" stroke="none" />
    <text x="50" y="14" fontFamily="sans-serif" fontSize="10" fontWeight="bold" textAnchor="middle" fill="currentColor">M</text>
    <text x="21" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" fill="currentColor" transform="rotate(-45 21 27)">B</text>
    <text x="79" y="27" fontFamily="sans-serif" fontSize="9" fontWeight="bold" textAnchor="middle" fill="currentColor" transform="rotate(45 79 27)">W</text>
  </svg>
);

export const AudiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 40" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <circle cx="23" cy="20" r="14" />
    <circle cx="41" cy="20" r="14" />
    <circle cx="59" cy="20" r="14" />
    <circle cx="77" cy="20" r="14" />
  </svg>
);

export const PorscheIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 120" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M15 15 C15 15 50 5 50 5 C50 5 85 15 85 15 C85 50 78 85 50 115 C22 85 15 50 15 15 Z" fill="none" strokeLinejoin="round" />
    <path d="M22 28 L78 28" />
    <text x="50" y="23" fontFamily="sans-serif" fontSize="7" fontWeight="bold" textAnchor="middle" fill="currentColor" letterSpacing="1.5">PORSCHE</text>
    <path d="M50 28 L50 110 M20 58 L80 58" strokeWidth="1.5" />
    <path d="M38 48 C38 48 50 43 50 43 C50 43 62 48 62 48 C62 60 59 75 50 85 C41 75 38 60 38 48 Z" fill="none" strokeWidth="1.5" />
    <circle cx="50" cy="62" r="3.5" fill="currentColor" />
  </svg>
);

export const ToyotaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 70" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <ellipse cx="50" cy="35" rx="45" ry="28" />
    <ellipse cx="50" cy="27" rx="28" ry="18" />
    <ellipse cx="50" cy="35" rx="10" ry="28" />
  </svg>
);

export const HyundaiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 65" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <ellipse cx="50" cy="32.5" rx="45" ry="28" transform="rotate(-12 50 32.5)" />
    <path d="M36 20 L42 45 M64 20 L58 45 M38 32 L60 32" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
  </svg>
);

export const TeslaIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M 10 15 C 35 22, 65 22, 90 15 C 80 25, 20 25, 10 15 Z" fill="currentColor" />
    <path d="M 14 28 C 36 33, 64 33, 86 28 C 82 34, 58 38, 56 42 L 56 82 C 56 86, 54 88, 50 88 C 46 88, 44 86, 44 82 L 44 42 C 42 38, 18 34, 14 28 Z" fill="currentColor" />
  </svg>
);

export const TataIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <circle cx="50" cy="50" r="45" />
    <path d="M30 45 C40 30, 60 30, 70 45 M50 33 L50 78" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
    <path d="M35 55 L50 33 L65 55" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" />
  </svg>
);

export const LandRoverIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <ellipse cx="60" cy="35" rx="55" ry="30" />
    <ellipse cx="60" cy="35" rx="50" ry="25" strokeDasharray="3 3" />
    <text x="60" y="39" fontFamily="sans-serif" fontSize="8" fontWeight="black" textAnchor="middle" fill="currentColor" letterSpacing="0.5">ROVER</text>
  </svg>
);

export const LamborghiniIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 110" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M10 10 L90 10 L80 85 L50 105 L20 85 Z" strokeLinejoin="round" />
    <path d="M35 45 L42 55 L50 48 L58 55 L65 45" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
    <path d="M50 48 L50 80" strokeLinecap="round" strokeWidth="3" />
    <path d="M42 62 L58 62" strokeLinecap="round" strokeWidth="3" />
  </svg>
);

export const MahindraIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5" {...props}>
    <path d="M20 78 L50 22 L80 78" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M50 22 L50 78" strokeLinecap="round" />
    <path d="M35 55 L50 42 L65 55" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const SuzukiIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="3" {...props}>
    <path d="M72 20 L28 20 C28 20 25 35 40 45 C55 55 72 55 72 55 C72 55 75 68 58 78 L25 78" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default LogoCarousel;
