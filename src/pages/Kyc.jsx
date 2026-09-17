import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BadgeCheck,
  Clock,
  ShieldAlert,
  ShieldX,
  Upload,
  Send,
  User as UserIcon,
  Phone,
  MapPin,
  CreditCard,
  Image as ImageIcon,
  Check,
} from 'lucide-react'
import { kyc as kycApi } from '../api/endpoints'
import AuthImage from '../components/AuthImage'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { ErrorBanner, Field, KeyValue, Loader } from '../components/ui'
import SignaturePad from '../components/SignaturePad'
import { dateLong } from '../utils/format'

const ETATS = {
  absent: {
    titre: 'Dossier non déposé',
    texte: 'Complétez votre dossier pour faire vérifier votre compte.',
    icon: ShieldAlert,
    cls: 'badge badge-warning',
    label: 'À compléter',
  },
  en_examen: {
    titre: 'Dossier en cours d’examen',
    texte: 'Nos équipes vérifient vos pièces. Vous serez notifié dès la validation.',
    icon: Clock,
    cls: 'badge badge-brand',
    label: 'En examen',
  },
  valide: {
    titre: 'Compte vérifié',
    texte: 'Votre identité est confirmée. Toutes les fonctionnalités sont accessibles.',
    icon: BadgeCheck,
    cls: 'badge badge-success',
    label: 'Vérifié',
  },
  rejete: {
    titre: 'Dossier rejeté',
    texte: 'Vos pièces n’ont pas pu être validées. Corrigez-les et renvoyez le dossier.',
    icon: ShieldX,
    cls: 'badge badge-danger',
    label: 'Rejeté',
  },
}

const GENRES = [
  { value: 'male', label: 'Homme' },
  { value: 'female', label: 'Femme' },
  { value: 'other', label: 'Autre' },
]

const SITUATIONS = [
  { value: 'single', label: 'Célibataire' },
  { value: 'married', label: 'Marié(e)' },
  { value: 'other', label: 'Autre' },
]

const PIECES = [
  { value: 'national_id_card', label: 'Carte nationale d’identité' },
  { value: 'drivers_licence', label: 'Permis de conduire' },
  { value: 'international_passport', label: 'Passeport' },
]

/** Sélecteur de fichier avec aperçu de l'image choisie. */
function FileField({ label, hint, value, onChange, existant }) {
  const input = useRef(null)
  const [apercu, setApercu] = useState(null)

  useEffect(() => {
    if (!value) {
      setApercu(null)
      return undefined
    }
    const url = URL.createObjectURL(value)
    setApercu(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  const cadre = {
    width: 92,
    height: 70,
    objectFit: 'cover',
    borderRadius: 'var(--r-sm)',
    border: '1px solid var(--border)',
    flexShrink: 0,
  }

  return (
    <Field label={label} hint={hint}>
      <div className="row" style={{ gap: 12, alignItems: 'flex-start' }}>
        {apercu ? (
          <img src={apercu} alt={label} style={cadre} />
        ) : existant ? (
          // Piece deja deposee : servie derriere authentification.
          <AuthImage path={existant} alt={label} style={cadre} />
        ) : (
          <div
            className="center"
            style={{
              width: 92,
              height: 70,
              borderRadius: 'var(--r-sm)',
              border: '1px dashed var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-mute)',
              flexShrink: 0,
            }}
          >
            <ImageIcon size={20} />
          </div>
        )}
        <div className="stack grow" style={{ gap: 6 }}>
          <input
            ref={input}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => onChange(e.target.files?.[0] || null)}
          />
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => input.current?.click()}>
            <Upload size={14} /> {value || existant ? 'Changer' : 'Choisir un fichier'}
          </button>
          {value && <span className="mute-xs">{value.name}</span>}
        </div>
      </div>
    </Field>
  )
}

export default function Kyc() {
  const { refresh, user } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    full_name: '',
    gender: '',
    marrital_status: '',
    identity_type: '',
    date_of_birth: '',
    mobile: '',
    country: 'Mauritanie',
    state: '',
    city: '',
  })
  const [fichiers, setFichiers] = useState({ image: null, identity_image: null, signature: null })
  const [erreurs, setErreurs] = useState({})
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const d = await kycApi.get()
      setData(d)
      if (d.kyc) {
        setForm({
          full_name: d.kyc.full_name || '',
          gender: d.kyc.gender || '',
          marrital_status: d.kyc.marrital_status || '',
          identity_type: d.kyc.identity_type || '',
          date_of_birth: (d.kyc.date_of_birth || '').slice(0, 10),
          mobile: d.kyc.mobile || '',
          country: d.kyc.country || 'Mauritanie',
          state: d.kyc.state || '',
          city: d.kyc.city || '',
        })
      }
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setErreurs({})
    setBusy(true)

    try {
      const fd = new FormData()
      Object.entries(form).forEach(([k, v]) => v && fd.append(k, v))
      Object.entries(fichiers).forEach(([k, f]) => f && fd.append(k, f))

      const res = await kycApi.submit(fd)
      setData((d) => ({ ...d, etat: res.etat, kyc: res.kyc }))
      setFichiers({ image: null, identity_image: null, signature: null })
      await refresh()
      await load()
      toast.success(res.detail)
    } catch (err) {
      // Le backend renvoie un objet {champ: [messages]} en cas d'erreur de validation.
      if (err.data && typeof err.data === 'object' && !err.data.detail) {
        setErreurs(
          Object.fromEntries(
            Object.entries(err.data).map(([k, v]) => [k, Array.isArray(v) ? v[0] : String(v)]),
          ),
        )
        setError('Certains champs doivent être corrigés.')
      } else {
        setError(err.message)
      }
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <Loader full label="Chargement de votre dossier…" />

  const etat = ETATS[data?.etat] || ETATS.absent
  const EtatIcon = etat.icon
  const premierDepot = !data?.kyc
  const valide = data?.etat === 'valide'

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vérification d’identité</h1>
          <p>Votre dossier KYC permet de valider votre compte et d’en débloquer l’usage complet.</p>
        </div>
        <span className={etat.cls}>
          <EtatIcon size={13} /> {etat.label}
        </span>
      </div>

      <div className="card card-pad row" style={{ gap: 14, marginBottom: 18 }}>
        <span
          className="stat-icon"
          style={
            valide
              ? { background: 'var(--success-bg)', color: 'var(--success)' }
              : data?.etat === 'rejete'
              ? { background: 'var(--danger-bg)', color: 'var(--danger)' }
              : { background: 'var(--warning-bg)', color: 'var(--warning)' }
          }
        >
          <EtatIcon size={22} />
        </span>
        <div className="grow">
          <strong style={{ fontSize: '.98rem' }}>{etat.titre}</strong>
          <p className="mute-xs">{etat.texte}</p>
          {data?.compte?.review && data.etat !== 'absent' && (
            <p className="mute-xs" style={{ marginTop: 4 }}>
              Note de l’examen : {data.compte.review}
            </p>
          )}
        </div>
        <div className="tr hide-sm">
          <div className="mute-xs">Compte</div>
          <div className="mono" style={{ fontWeight: 600 }}>{data?.compte?.account_number}</div>
          <div className="mute-xs">statut : {data?.compte?.account_status}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <form className="card card-pad stack" onSubmit={submit}>
          <h3>{premierDepot ? 'Déposer mon dossier' : 'Corriger mon dossier'}</h3>

          <ErrorBanner>{error}</ErrorBanner>

          {valide && (
            <p className="mute-xs">
              Votre compte est vérifié. Toute modification renverra le dossier en examen, et le compte
              repassera temporairement en attente.
            </p>
          )}

          <Field label="Nom complet" error={erreurs.full_name}>
            <div className="input-group">
              <UserIcon size={17} />
              <input
                className="input"
                placeholder="Tel qu’il figure sur votre pièce d’identité"
                value={form.full_name}
                onChange={set('full_name')}
                required={premierDepot}
              />
            </div>
          </Field>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Genre" error={erreurs.gender}>
              <select className="select" value={form.gender} onChange={set('gender')} required={premierDepot}>
                <option value="">—</option>
                {GENRES.map((g) => (
                  <option key={g.value} value={g.value}>{g.label}</option>
                ))}
              </select>
            </Field>

            <Field label="Situation familiale" error={erreurs.marrital_status}>
              <select
                className="select"
                value={form.marrital_status}
                onChange={set('marrital_status')}
                required={premierDepot}
              >
                <option value="">—</option>
                {SITUATIONS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Date de naissance" error={erreurs.date_of_birth}>
            <input
              className="input"
              type="date"
              value={form.date_of_birth}
              onChange={set('date_of_birth')}
              required={premierDepot}
            />
          </Field>

          <Field label="Téléphone" error={erreurs.mobile}>
            <div className="input-group">
              <Phone size={17} />
              <input
                className="input"
                inputMode="tel"
                placeholder="20161603"
                value={form.mobile}
                onChange={set('mobile')}
                required={premierDepot}
              />
            </div>
          </Field>

          <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <Field label="Pays" error={erreurs.country}>
              <input className="input" value={form.country} onChange={set('country')} required={premierDepot} />
            </Field>
            <Field label="Région" error={erreurs.state}>
              <input className="input" value={form.state} onChange={set('state')} required={premierDepot} />
            </Field>
            <Field label="Ville" error={erreurs.city}>
              <input className="input" value={form.city} onChange={set('city')} required={premierDepot} />
            </Field>
          </div>

          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? <span className="spinner" /> : <Send size={17} />}
            {busy ? 'Envoi…' : premierDepot ? 'Envoyer mon dossier' : 'Renvoyer mon dossier'}
          </button>
        </form>

        <aside className="stack">
          <div className="card card-pad stack">
            <h3>Pièces justificatives</h3>

            <Field label="Type de pièce" error={erreurs.identity_type}>
              <div className="input-group">
                <CreditCard size={17} />
                <select
                  className="select"
                  style={{ paddingLeft: 42 }}
                  value={form.identity_type}
                  onChange={set('identity_type')}
                  required={premierDepot}
                >
                  <option value="">—</option>
                  {PIECES.map((p) => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </Field>

            <FileField
              label="Photo d’identité"
              hint="Photo récente, visage dégagé."
              value={fichiers.image}
              existant={data?.kyc?.image}
              onChange={(f) => setFichiers((s) => ({ ...s, image: f }))}
            />
            {erreurs.image && <span className="field-error">{erreurs.image}</span>}

            <FileField
              label="Pièce d’identité"
              hint="Photo ou scan lisible du document choisi."
              value={fichiers.identity_image}
              existant={data?.kyc?.identity_image}
              onChange={(f) => setFichiers((s) => ({ ...s, identity_image: f }))}
            />
            {erreurs.identity_image && <span className="field-error">{erreurs.identity_image}</span>}

            <Field label="Signature">
              <SignaturePad onChange={(f) => setFichiers((s) => ({ ...s, signature: f }))} />
            </Field>
            {fichiers.signature && (
              <span className="mute-xs row" style={{ gap: 6, color: 'var(--success)' }}>
                <Check size={13} /> Signature enregistrée
              </span>
            )}
            {!fichiers.signature && data?.kyc?.signature && (
              <span className="mute-xs">Une signature est déjà enregistrée — signez à nouveau pour la remplacer.</span>
            )}
            {erreurs.signature && <span className="field-error">{erreurs.signature}</span>}
          </div>

          {data?.kyc && (
            <div className="card card-pad">
              <h3 style={{ marginBottom: 10 }}>Dossier enregistré</h3>
              <KeyValue k="Nom" v={data.kyc.full_name} />
              <KeyValue k="Téléphone" v={data.kyc.mobile} />
              <KeyValue
                k="Adresse"
                v={
                  <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                    <MapPin size={13} /> {[data.kyc.city, data.kyc.state, data.kyc.country].filter(Boolean).join(', ')}
                  </span>
                }
              />
              <KeyValue k="Déposé le" v={dateLong(data.kyc.date)} />
            </div>
          )}

          <p className="mute-xs">
            Vos pièces ne sont visibles que par l’équipe de vérification. Email du compte : {user?.email}.
          </p>
        </aside>
      </div>

      {valide && (
        <button className="btn btn-ghost" style={{ marginTop: 18 }} onClick={() => navigate('/')}>
          Retour au tableau de bord
        </button>
      )}
    </>
  )
}
