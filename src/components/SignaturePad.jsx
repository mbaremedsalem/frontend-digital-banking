import { useEffect, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'

/**
 * Pavé de signature.
 *
 * Le modèle KYC exige une image de signature. Demander un fichier obligerait
 * le client à signer sur papier puis à photographier : il signe donc au doigt
 * ou à la souris, et le canvas est converti en PNG.
 */
export default function SignaturePad({ onChange, height = 170 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [vide, setVide] = useState(true)

  // Le canvas est dimensionné en pixels réels pour rester net sur mobile.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ratio = window.devicePixelRatio || 1
    const largeur = canvas.offsetWidth
    canvas.width = largeur * ratio
    canvas.height = height * ratio
    const ctx = canvas.getContext('2d')
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#0f172a'
  }, [height])

  const position = (e) => {
    const rect = canvasRef.current.getBoundingClientRect()
    const point = e.touches ? e.touches[0] : e
    return { x: point.clientX - rect.left, y: point.clientY - rect.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const { x, y } = position(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const { x, y } = position(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.lineTo(x, y)
    ctx.stroke()
    if (vide) setVide(false)
  }

  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    canvasRef.current.toBlob((blob) => {
      if (blob) onChange(new File([blob], 'signature.png', { type: 'image/png' }))
    }, 'image/png')
  }

  const effacer = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setVide(true)
    onChange(null)
  }

  return (
    <div className="stack" style={{ gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          style={{
            width: '100%',
            height,
            background: 'var(--surface-2)',
            border: '1px dashed var(--border)',
            borderRadius: 'var(--r-sm)',
            touchAction: 'none',
            cursor: 'crosshair',
            display: 'block',
          }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {vide && (
          <span
            className="mute-xs row"
            style={{
              position: 'absolute',
              inset: 0,
              justifyContent: 'center',
              pointerEvents: 'none',
              gap: 7,
            }}
          >
            <PenLine size={15} /> Signez ici avec le doigt ou la souris
          </span>
        )}
      </div>
      <button type="button" className="btn btn-ghost btn-sm" onClick={effacer} disabled={vide}>
        <Eraser size={14} /> Effacer
      </button>
    </div>
  )
}
