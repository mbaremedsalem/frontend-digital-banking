import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Receipt,
  Zap,
  Droplet,
  Landmark,
  Building2 as Building,
  Phone,
  Smartphone,
  Wifi,
  Flame,
  Fuel,
  Car,
  GraduationCap,
  HeartPulse,
  ShoppingCart,
  Tv,
  Home,
  Wrench,
  Globe,
  Plane,
  Ticket,
  Lock,
  Eye,
  EyeOff,
  Check,
  Wallet,
  RefreshCw,
  ArrowRight,
  CreditCard,
  Banknote,
  ArrowLeftRight,
  HandCoins,
} from 'lucide-react'
import { services as api, servicePayments } from '../api/endpoints'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { EmptyState, ErrorBanner, Field, KeyValue, Loader, Modal } from '../components/ui'
import { money, dateLong } from '../utils/format'

const CATEGORIES = {
  immobilier: 'Immobilier',
  electricite: 'Électricité',
  eau: 'Eau',
  impots: 'Impôts et taxes',
  telecom: 'Télécom',
  autre: 'Autre',
}

/**
 * Icônes disponibles pour les services.
 *
 * Volontairement une liste explicite : un `import * as Icons from
 * 'lucide-react'` embarquerait toute la librairie dans le bundle (1 Mo au lieu
 * de 300 Ko). Le nom vient du champ `icone` du service, côté admin ; un nom
 * inconnu retombe sur une icône de facture.
 */
const ICONES = {
  Receipt, Zap, Droplet, Landmark, Building2: Building, Phone, Smartphone, Wifi,
  Flame, Fuel, Car, GraduationCap, HeartPulse, ShoppingCart, Tv, Home, Wrench,
  Globe, Plane, Ticket, CreditCard, Banknote,
}

function ServiceIcon({ name, size = 22 }) {
  const Cmp = ICONES[name] || Receipt
  return <Cmp size={size} />
}

/** Services internes PoolPay, affichés à côté des services partenaires. */
const INTERNES = [
  { to: '/transfer', nom: 'Transfert', description: 'Envoyer de l’argent à un compte PoolPay', icon: ArrowLeftRight },
  { to: '/request', nom: 'Demande de paiement', description: 'Réclamer une somme à un autre client', icon: HandCoins },
  { to: '/withdraw', nom: 'Retrait d’espèces', description: 'Générer un code à présenter au guichet', icon: Banknote },
  { to: '/cards', nom: 'Cartes de crédit', description: 'Alimenter et piloter vos cartes', icon: CreditCard },
]

export default function Services() {
  const { account, refresh } = useAuth()
  const toast = useToast()
  const navigate = useNavigate()

  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState([])
  const [totals, setTotals] = useState(null)

  const [selected, setSelected] = useState(null)
  const [form, setForm] = useState({ reference: '', amount: '', password: '' })
  const [showPwd, setShowPwd] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [receipt, setReceipt] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const data = await api.list()
      setList(data.services || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadHistory = async () => {
    try {
      const data = await servicePayments.list()
      setHistory(data.payments || [])
      setTotals(data.totals || null)
    } catch {
      /* non bloquant */
    }
  }

  useEffect(() => {
    load()
    loadHistory()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const open = (service) => {
    // Un service en mode "api" a son propre parcours : le montant vient du
    // partenaire et n'est jamais saisi par le client. Seul Agharina en a un
    // pour l'instant ; un autre service en mode api devra recevoir le sien.
    if (service.mode === 'api') {
      if (service.slug === 'agharina') navigate('/agharina')
      else toast.info(`Le parcours de paiement de ${service.nom} n'est pas encore disponible.`)
      return
    }
    setSelected(service)
    setForm({ reference: '', amount: '', password: '' })
    setError('')
  }

  const balance = Number(account?.account_balance || 0)
  const amount = Number(form.amount || 0)
  const taxRate = Number(selected?.tax_rate || 0)
  const tax = Math.round(amount * taxRate * 100) / 100
  const total = amount + tax
  const insufficient = total > balance

  const pay = async (e) => {
    e?.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api.pay(selected.slug, form)
      setSelected(null)
      setReceipt({ ...data.payment, service_nom: selected.nom })
      toast.success(data.detail)
      await Promise.all([refresh(), loadHistory()])
    } catch (err) {
      setError(err.message)
      setForm((f) => ({ ...f, password: '' }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Services</h1>
          <p>Payez vos factures et vos services depuis votre compte PoolPay.</p>
        </div>
        <button className="btn btn-ghost" onClick={load}>
          <RefreshCw size={16} /> Actualiser
        </button>
      </div>

      <div className="card card-pad row" style={{ marginBottom: 20, gap: 14 }}>
        <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
          <Wallet size={21} />
        </span>
        <div className="grow">
          <div className="stat-label">Solde disponible</div>
          <div className="stat-value mono">{money(balance)}</div>
        </div>
        <span className="badge badge-brand">{account?.account_number}</span>
      </div>

      <h2 style={{ margin: '0 0 12px' }}>Factures et partenaires</h2>

      {loading && <Loader full label="Chargement des services…" />}

      {!loading && list.length === 0 && (
        <div className="card">
          <EmptyState
            icon={Receipt}
            title="Aucun service disponible"
            text="Les services sont créés dans l’administration (core → Services partenaires)."
          />
        </div>
      )}

      {!loading && list.length > 0 && (
        <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
          {list.map((s) => (
            <button
              key={s.slug}
              className="quick"
              style={{ alignItems: 'flex-start', textAlign: 'left', gap: 12 }}
              onClick={() => open(s)}
            >
              <div className="row-between" style={{ width: '100%' }}>
                <span className="quick-icon" style={s.couleur ? { background: `${s.couleur}1a`, color: s.couleur } : undefined}>
                  <ServiceIcon name={s.icone} />
                </span>
                {Number(s.tax_rate) > 0 && <span className="badge badge-warning">+{s.tax_percent} %</span>}
              </div>
              <div>
                <div style={{ fontSize: '.95rem', fontWeight: 700 }}>{s.nom}</div>
                <div className="mute-xs" style={{ fontWeight: 500 }}>
                  {s.description || CATEGORIES[s.categorie] || s.categorie}
                </div>
              </div>
              <span className="mute-xs row" style={{ gap: 5, fontWeight: 600 }}>
                {s.mode === 'api' ? 'Catalogue' : 'Payer une facture'} <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </div>
      )}

      <h2 style={{ margin: '28px 0 12px' }}>Services PoolPay</h2>
      <div className="quick-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
        {INTERNES.map(({ to, nom, description, icon: Icon }) => (
          <button
            key={to}
            className="quick"
            style={{ alignItems: 'flex-start', textAlign: 'left', gap: 12 }}
            onClick={() => navigate(to)}
          >
            <span className="quick-icon">
              <Icon size={22} />
            </span>
            <div>
              <div style={{ fontSize: '.95rem', fontWeight: 700 }}>{nom}</div>
              <div className="mute-xs" style={{ fontWeight: 500 }}>{description}</div>
            </div>
          </button>
        ))}
      </div>

      {totals && Number(totals.count) > 0 && (
        <>
          <h2 style={{ margin: '28px 0 12px' }}>Mes paiements</h2>
          <div className="grid grid-3" style={{ gap: 12, marginBottom: 14 }}>
            <div className="card stat">
              <span className="stat-icon" style={{ background: 'var(--brand-50)', color: 'var(--brand-600)' }}>
                <Receipt size={20} />
              </span>
              <div>
                <div className="stat-value mono">{money(totals.amount)}</div>
                <div className="stat-label">Montant des factures</div>
              </div>
            </div>
            <div className="card stat">
              <span className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
                <Receipt size={20} />
              </span>
              <div>
                <div className="stat-value mono">{money(totals.tax)}</div>
                <div className="stat-label">Taxes de service</div>
              </div>
            </div>
            <div className="card stat">
              <span className="stat-icon" style={{ background: 'var(--surface-3)', color: 'var(--text-soft)' }}>
                <Wallet size={20} />
              </span>
              <div>
                <div className="stat-value mono">{money(totals.total)}</div>
                <div className="stat-label">Total débité ({totals.count})</div>
              </div>
            </div>
          </div>

          <div className="card">
            {history.slice(0, 8).map((p) => (
              <div className="tx" key={p.payment_id}>
                <span className="tx-icon tx-out">
                  <Receipt size={19} />
                </span>
                <div className="tx-body">
                  <div className="tx-title">{p.label}</div>
                  <div className="tx-sub">
                    {p.customer_reference || p.reference} · {dateLong(p.date)}
                  </div>
                </div>
                <div className="tr">
                  <div className="tx-amount">{money(p.total)}</div>
                  {Number(p.tax_amount) > 0 && (
                    <div className="mute-xs">dont {money(p.tax_amount)} de taxe</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ----------------------------------- paiement d'une facture */}
      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Payer — ${selected.nom}` : ''}
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setSelected(null)} disabled={busy}>
              Annuler
            </button>
            <button
              className="btn btn-primary"
              onClick={pay}
              disabled={busy || !form.reference || amount <= 0 || !form.password || insufficient}
            >
              {busy ? <span className="spinner" /> : <Check size={16} />} Payer {money(total)}
            </button>
          </>
        }
      >
        <form className="stack" onSubmit={pay}>
          <Field label={selected?.reference_label || 'Référence'} hint="Tel qu’indiqué sur votre facture.">
            <input
              className="input mono"
              placeholder="ex. 123456789"
              value={form.reference}
              onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              autoFocus
              required
            />
          </Field>

          <Field label="Montant de la facture">
            <input
              className="input mono"
              style={{ fontSize: '1.25rem', fontWeight: 700 }}
              type="number"
              min="1"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              required
            />
          </Field>

          {amount > 0 && (
            <div>
              <div className="total-line">
                <span className="muted">Montant</span>
                <span className="mono">{money(amount)}</span>
              </div>
              {taxRate > 0 && (
                <div className="total-line">
                  <span className="tax">Taxe de service ({selected?.tax_percent} %)</span>
                  <span className="mono tax">+ {money(tax)}</span>
                </div>
              )}
              <div className="total-line grand">
                <span>Total à débiter</span>
                <span className="mono">{money(total)}</span>
              </div>
            </div>
          )}

          <ErrorBanner>{error || (insufficient && amount > 0 ? `Solde insuffisant : ${money(balance)} disponibles.` : '')}</ErrorBanner>

          <Field label="Votre mot de passe">
            <div className="input-group">
              <Lock size={17} />
              <input
                className="input"
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                autoComplete="current-password"
              />
              <button type="button" className="input-suffix" onClick={() => setShowPwd((v) => !v)}>
                {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </Field>
        </form>
      </Modal>

      {/* ------------------------------------------------ reçu */}
      <Modal
        open={Boolean(receipt)}
        onClose={() => setReceipt(null)}
        title="Paiement effectué"
        footer={
          <button className="btn btn-primary" onClick={() => setReceipt(null)}>
            Terminer
          </button>
        }
      >
        <div className="stack" style={{ textAlign: 'center' }}>
          <div className="success-ring">
            <Check size={38} strokeWidth={3} />
          </div>
          <h3>{receipt?.service_nom}</h3>
          <div style={{ textAlign: 'left' }}>
            <KeyValue k="Référence" v={<span className="mono">{receipt?.customer_reference}</span>} />
            <KeyValue k="Montant" v={money(receipt?.amount)} />
            {Number(receipt?.tax_amount) > 0 && (
              <KeyValue k={`Taxe (${receipt?.tax_percent} %)`} v={money(receipt?.tax_amount)} />
            )}
            <KeyValue k="Total débité" v={<strong>{money(receipt?.total)}</strong>} />
            <KeyValue k="Reçu" v={<span className="mono">{receipt?.payment_id}</span>} />
          </div>
        </div>
      </Modal>
    </>
  )
}
