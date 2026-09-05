'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Canvas signature pad — pointer-event based so it works with mouse, touch
 * and stylus. Produces a PNG data URL.
 */
export default function SignaturePad({
  onChange,
  height = 160,
}: {
  onChange: (dataUrl: string | null) => void
  height?: number
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [isEmpty, setIsEmpty] = useState(true)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Match backing store to rendered size for crisp strokes
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio)
      ctx.lineWidth = 2
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1a2332'
    }
  }, [])

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = e.currentTarget.getContext('2d')
    if (!ctx) return
    const { x, y } = pos(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (isEmpty) setIsEmpty(false)
  }

  const end = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return
    drawing.current = false
    onChange(e.currentTarget.toDataURL('image/png'))
  }

  const clear = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      setIsEmpty(true)
      onChange(null)
    }
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        style={{ height, touchAction: 'none' }}
        className="w-full rounded-lg border-2 border-dashed border-slate-300 bg-white cursor-crosshair"
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
      />
      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-xs text-slate-400">{isEmpty ? 'Sign above' : 'Signature captured'}</p>
        <button type="button" onClick={clear} className="text-xs font-semibold text-slate-500 hover:text-slate-700">
          Clear
        </button>
      </div>
    </div>
  )
}
