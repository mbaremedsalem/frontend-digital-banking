import { useEffect, useState } from 'react'
import { ImageOff } from 'lucide-react'
import { fetchBlobUrl } from '../api/client'

/**
 * Image servie derriere une authentification.
 *
 * Les pieces KYC ne sont lisibles que par leur proprietaire ou le personnel :
 * une balise img classique ne transmet pas le jeton et recevrait un 404. On
 * telecharge donc le binaire avec le jeton, puis on l'affiche via un blob.
 */
export default function AuthImage({ path, alt, style, className, fallback = null }) {
  const [url, setUrl] = useState(null)
  const [etat, setEtat] = useState('charge')

  useEffect(() => {
    if (!path) {
      setUrl(null)
      setEtat('vide')
      return undefined
    }

    let objectUrl = null
    const controller = new AbortController()
    setEtat('charge')

    fetchBlobUrl(path, { signal: controller.signal })
      .then((u) => {
        objectUrl = u
        setUrl(u)
        setEtat('ok')
      })
      .catch((err) => {
        if (err.name !== 'AbortError') setEtat('erreur')
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [path])

  if (etat === 'ok') return <img src={url} alt={alt} style={style} className={className} />

  if (etat === 'vide' && fallback) return fallback

  return (
    <span className="center" style={{ ...style, background: 'var(--surface-3)', color: 'var(--text-mute)' }}>
      {etat === 'charge' ? <span className="spinner" /> : <ImageOff size={18} />}
    </span>
  )
}
