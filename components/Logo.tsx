import Image from 'next/image'

interface LogoProps {
  className?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  textColor?: string
}

/**
 * FieldMS logo lockup — the single source of truth for brand marks.
 * Icon tile is always white with a rounded-lg radius; the wordmark
 * scales with the tile. Never stretch, recolour or restyle outside
 * this component.
 */
export default function Logo({ className = '', size = 'md', textColor = 'text-white' }: LogoProps) {
  const heights = { xs: 32, sm: 40, md: 56, lg: 72 }
  const textSizes = { xs: 'text-[17px]', sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }
  const gaps = { xs: 'gap-2.5', sm: 'gap-2.5', md: 'gap-3', lg: 'gap-3' }
  const h = heights[size]

  return (
    <div className={`flex items-center ${gaps[size]} ${className}`}>
      <div
        className="bg-white rounded-lg flex items-center justify-center shrink-0 overflow-hidden"
        style={{ width: h, height: h }}
      >
        <Image
          src="/fieldms-icon.png"
          alt="FieldMS logo"
          width={h}
          height={h}
          className="object-contain scale-[1.75]"
          unoptimized
        />
      </div>
      <span className={`font-bold ${textSizes[size]} tracking-tight leading-none ${textColor}`}>
        FieldMS
      </span>
    </div>
  )
}
