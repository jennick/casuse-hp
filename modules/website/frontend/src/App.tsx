import React, { useEffect, useState } from 'react'
import {
  Routes,
  Route,
  useNavigate,
  Navigate,
  useParams,
  useLocation,
} from 'react-router-dom'

const API_BASE_URL =
  import.meta.env.VITE_WEBSITE_API_BASE_URL || 'http://localhost:20052'

const CORE_HOME_URL =
  import.meta.env.VITE_CORE_HOME_URL || 'http://localhost:20020'

type CustomerType = 'particulier' | 'bedrijf'

interface TokenResponse {
  access_token: string
  token_type: string
}

interface CustomerListItem {
  id: string
  email: string
  first_name: string
  last_name: string
  phone_number?: string | null
  customer_type: CustomerType
  description?: string | null
  company_name?: string | null
  tax_id?: string | null
  address_street?: string | null
  address_ext_number?: string | null
  address_int_number?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_postal_code?: string | null
  address_country?: string | null
  is_active: boolean
}

interface CustomersListResponse {
  items: CustomerListItem[]
  total: number
}

interface CustomerDetail extends CustomerListItem {
  is_admin: boolean
  created_at: string
  updated_at: string
  deactivated_at?: string | null
  hashed_password?: string | null
}

interface PasswordResetResponse {
  success: boolean
  token?: string
}

interface CustomerEditFormState {
  email: string
  first_name: string
  last_name: string
  phone_number: string
  customer_type: CustomerType
  description: string
  company_name: string
  tax_id: string
  address_street: string
  address_ext_number: string
  address_int_number: string
  address_neighborhood: string
  address_city: string
  address_state: string
  address_postal_code: string
  address_country: string
}

const EMPTY_EDIT_FORM: CustomerEditFormState = {
  email: '',
  first_name: '',
  last_name: '',
  phone_number: '',
  customer_type: 'particulier',
  description: '',
  company_name: '',
  tax_id: '',
  address_street: '',
  address_ext_number: '',
  address_int_number: '',
  address_neighborhood: '',
  address_city: '',
  address_state: '',
  address_postal_code: '',
  address_country: 'Mexico',
}

function getStoredToken(): string | null {
  return localStorage.getItem('website_admin_token')
}

function setStoredToken(token: string | null) {
  if (token) {
    localStorage.setItem('website_admin_token', token)
  } else {
    localStorage.removeItem('website_admin_token')
  }
}

async function apiFetch(path: string, init: RequestInit = {}) {
  const token = getStoredToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers,
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP ${res.status}`)
  }

  return res
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation()
  const token = getStoredToken()

  const handleLogout = () => {
    setStoredToken(null)
    window.location.href = CORE_HOME_URL
  }

  const handleBack = () => {
    window.location.href = CORE_HOME_URL
  }

  const isLogin = location.pathname === '/login'

  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        backgroundColor: '#f4f4f5',
      }}
    >
      <header
        style={{
          backgroundColor: '#111827',
          color: '#fff',
          padding: '0.75rem 1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div>
          <span style={{ fontWeight: 600 }}>Casuse Website Admin</span>
          <span
            style={{
              marginLeft: '0.5rem',
              fontSize: '0.8rem',
              opacity: 0.7,
            }}
          >
            module: website
          </span>
        </div>

        {token && !isLogin && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={handleBack}
              style={{
                padding: '0.35rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 4,
                border: '1px solid #6ee7b7',
                backgroundColor: 'transparent',
                color: '#6ee7b7',
                cursor: 'pointer',
              }}
            >
              Terug naar modules
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '0.35rem 0.8rem',
                fontSize: '0.85rem',
                borderRadius: 4,
                border: '1px solid #f97373',
                backgroundColor: 'transparent',
                color: '#fecaca',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main style={{ padding: '1rem 1.5rem' }}>{children}</main>
    </div>
  )
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const token = getStoredToken()
  if (!token) {
    return <Navigate to="/login" replace />
  }
  return <>{children}</>
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@casuse.mx')
  const [password, setPassword] = useState('Test1234!')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || 'Login failed')
      }
      const data: TokenResponse = await res.json()
      setStoredToken(data.access_token)
      navigate('/customers')
    } catch (err) {
      console.error(err)
      setError('Login mislukt. Controleer email en wachtwoord.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 420,
        margin: '3rem auto',
        backgroundColor: '#fff',
        padding: '1.5rem 1.75rem',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(15,23,42,0.1)',
      }}
    >
      <h1 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Admin login</h1>
      <p
        style={{
          fontSize: '0.85rem',
          marginBottom: '1rem',
          color: '#4b5563',
        }}
      >
        Log in met je admin-account om klanten te beheren.
      </p>
      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Wachtwoord
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontSize: '0.9rem',
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Bezig...' : 'Inloggen'}
        </button>
      </form>
    </div>
  )
}

const CustomersListPage: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerListItem[]>([])
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'particulier' | 'bedrijf'>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [sortOption, setSortOption] = useState<
    'created_at_desc' | 'created_at_asc' | 'name_asc' | 'name_desc'
  >('created_at_desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const navigate = useNavigate()
  const location = useLocation()

  const buildQueryParams = () => {
    const params = new URLSearchParams()

    if (search.trim().length > 0) {
      params.set('search', search.trim())
    }
    if (filterType !== 'all') {
      params.set('customer_type', filterType)
    }
    params.set('status', statusFilter)

    switch (sortOption) {
      case 'created_at_desc':
        params.set('sort_by', 'created_at')
        params.set('sort_dir', 'desc')
        break
      case 'created_at_asc':
        params.set('sort_by', 'created_at')
        params.set('sort_dir', 'asc')
        break
      case 'name_asc':
        params.set('sort_by', 'name')
        params.set('sort_dir', 'asc')
        break
      case 'name_desc':
        params.set('sort_by', 'name')
        params.set('sort_dir', 'desc')
        break
    }

    return params
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = buildQueryParams()
      const res = await apiFetch(`/api/admin/customers?${params.toString()}`)
      const data: CustomersListResponse = await res.json()
      setCustomers(data.items)
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon klanten niet laden.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const state = location.state as { message?: string } | undefined
    if (state && state.message) {
      setSuccessMessage(state.message)
      window.history.replaceState({}, document.title)
    }

    // eerste load
    // eslint-disable-next-line react-hooks/exhaustive-deps
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    load()
  }

  const handleDeactivate = async (id: string) => {
    const confirmed = window.confirm(
      'Weet je zeker dat je deze klant wilt deactiveren? Dit is een zachte verwijdering; de klant blijft in de database maar wordt niet meer actief gebruikt.',
    )
    if (!confirmed) return

    setError(null)
    try {
      await apiFetch(`/api/admin/customers/${id}`, { method: 'DELETE' })
      setSuccessMessage('Klant gedeactiveerd.')
      await load()
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon klant niet deactiveren.')
    }
  }

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'all' | 'particulier' | 'bedrijf'
    setFilterType(value)
    load()
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as 'active' | 'inactive' | 'all'
    setStatusFilter(value)
    load()
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value as
      | 'created_at_desc'
      | 'created_at_asc'
      | 'name_asc'
      | 'name_desc'
    setSortOption(value)
    load()
  }

  return (
    <div>
      <div
        style={{
          marginBottom: '1rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>Klanten</h1>
        <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          Totaal: {customers.length}
        </span>
      </div>

      {successMessage && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: 4,
          }}
        >
          {successMessage}
        </div>
      )}

      <form
        onSubmit={handleSearchSubmit}
        style={{
          marginBottom: '0.75rem',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          placeholder="Zoek op naam, email of bedrijf..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: 220,
            padding: '0.4rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
          }}
        />
        <select
          value={filterType}
          onChange={handleTypeChange}
          style={{
            padding: '0.4rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">Type: alle</option>
          <option value="particulier">Alleen particulieren</option>
          <option value="bedrijf">Alleen bedrijven</option>
        </select>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          style={{
            padding: '0.4rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="active">Alleen actieve</option>
          <option value="inactive">Alleen gedeactiveerde</option>
          <option value="all">Alle klanten</option>
        </select>
        <select
          value={sortOption}
          onChange={handleSortChange}
          style={{
            padding: '0.4rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="created_at_desc">Datum aangemaakt – nieuwste eerst</option>
          <option value="created_at_asc">Datum aangemaakt – oudste eerst</option>
          <option value="name_asc">Naam – A–Z</option>
          <option value="name_desc">Naam – Z–A</option>
        </select>
        <button
          type="submit"
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontSize: '0.9rem',
            cursor: 'pointer',
          }}
        >
          Zoeken
        </button>
      </form>

      {loading && <p style={{ fontSize: '0.85rem' }}>Laden...</p>}

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}

      {!loading && customers.length === 0 && (
        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>Geen klanten gevonden.</p>
      )}

      {customers.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table
            style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: '0.85rem',
              backgroundColor: '#fff',
              borderRadius: 6,
              overflow: 'hidden',
              boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
            }}
          >
            <thead>
              <tr
                style={{
                  backgroundColor: '#f9fafb',
                  textAlign: 'left',
                }}
              >
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Naam
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Email
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Type
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Bedrijf
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Stad
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Staat
                </th>
                <th
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Acties
                </th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr
                  key={c.id}
                  onClick={() => navigate(`/customers/${c.id}`)}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: c.is_active ? 'transparent' : '#f9fafb',
                    opacity: c.is_active ? 1 : 0.7,
                  }}
                >
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.first_name} {c.last_name}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.email}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.customer_type === 'bedrijf' ? 'Bedrijf' : 'Particulier'}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.company_name || '-'}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.address_city || '-'}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                    }}
                  >
                    {c.address_state || '-'}
                  </td>
                  <td
                    style={{
                      padding: '0.4rem 0.6rem',
                      borderBottom: '1px solid #f3f4f6',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        navigate(`/customers/${c.id}/edit`)
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        marginRight: '0.35rem',
                        borderRadius: 4,
                        border: '1px solid #d1d5db',
                        backgroundColor: '#f9fafb',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Bewerken
                    </button>
                    <button
                      type="button"
                      disabled={!c.is_active}
                      onClick={e => {
                        e.stopPropagation()
                        handleDeactivate(c.id)
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 4,
                        border: '1px solid #fecaca',
                        backgroundColor: '#fef2f2',
                        fontSize: '0.8rem',
                        cursor: c.is_active ? 'pointer' : 'default',
                        opacity: c.is_active ? 1 : 0.6,
                      }}
                    >
                      Deactiveren
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const CustomerDetailPage: React.FC = () => {
  const { id } = useParams()
  const [customer, setCustomer] = useState<CustomerDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [actionSuccess, setActionSuccess] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/admin/customers/${id}`)
        const data: CustomerDetail = await res.json()
        setCustomer(data)
      } catch (err: any) {
        if (err.message === 'unauthorized') {
          setStoredToken(null)
          navigate('/login')
          return
        }
        console.error(err)
        setError('Kon klant niet laden.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  const handleResetPassword = async () => {
    if (!id) return
    const confirmed = window.confirm(
      'Weet je zeker dat je een nieuwe wachtwoord-reset link wilt aanmaken voor deze klant?',
    )
    if (!confirmed) return

    setActionError(null)
    setActionSuccess(null)
    setActionLoading(true)

    try {
      const res = await apiFetch(`/api/admin/customers/${id}/reset_password`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const data: PasswordResetResponse = await res.json()
      let msg = 'Wachtwoord-reset link aangemaakt en verstuurd (stub).'
      if (data.token) {
        msg += ` Debug token: ${data.token}`
      }
      setActionSuccess(msg)
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setActionError('Kon wachtwoord-reset niet uitvoeren.')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return <p style={{ fontSize: '0.9rem' }}>Laden...</p>
  }

  if (error) {
    return (
      <div>
        <button
          type="button"
          onClick={() => navigate('/customers')}
          style={{
            marginBottom: '0.75rem',
            padding: '0.3rem 0.6rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          ← Terug
        </button>
        <div
          style={{
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (!customer) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/customers')}
        style={{
          marginBottom: '0.75rem',
          padding: '0.3rem 0.6rem',
          borderRadius: 4,
          border: '1px solid #d1d5db',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        ← Terug
      </button>

      <h1
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.25rem',
        }}
      >
        {customer.first_name} {customer.last_name}
      </h1>
      <p
        style={{
          fontSize: '0.85rem',
          color: '#6b7280',
          marginBottom: '0.75rem',
        }}
      >
        {customer.customer_type === 'bedrijf' ? 'Bedrijf' : 'Particulier'}
        {customer.company_name ? ` • ${customer.company_name}` : ''}
      </p>

      {actionSuccess && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#dcfce7',
            color: '#166534',
            borderRadius: 4,
          }}
        >
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
          }}
        >
          {actionError}
        </div>
      )}

      <div
        style={{
          marginBottom: '0.75rem',
          display: 'flex',
          gap: '0.5rem',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => navigate(`/customers/${customer.id}/edit`)}
          style={{
            padding: '0.35rem 0.7rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            backgroundColor: '#f9fafb',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          Bewerken
        </button>
        {customer.hashed_password && (
          <button
            type="button"
            onClick={handleResetPassword}
            disabled={actionLoading}
            style={{
              padding: '0.35rem 0.7rem',
              borderRadius: 4,
              border: '1px solid #fecaca',
              backgroundColor: '#fef2f2',
              fontSize: '0.85rem',
              cursor: actionLoading ? 'default' : 'pointer',
              opacity: actionLoading ? 0.7 : 1,
            }}
          >
            {actionLoading ? 'Bezig met reset...' : 'Reset wachtwoord'}
          </button>
        )}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem',
        }}
      >
        <section
          style={{
            backgroundColor: '#fff',
            padding: '0.75rem 0.9rem',
            borderRadius: 6,
            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Contact
          </h2>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Email:</strong> {customer.email}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Telefoon:</strong> {customer.phone_number || '-'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Actief:</strong> {customer.is_active ? 'Ja' : 'Nee'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Admin:</strong> {customer.is_admin ? 'Ja' : 'Nee'}
          </p>
        </section>

        <section
          style={{
            backgroundColor: '#fff',
            padding: '0.75rem 0.9rem',
            borderRadius: 6,
            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Adres
          </h2>
          <p style={{ fontSize: '0.85rem' }}>
            {customer.address_street} {customer.address_ext_number}
            {customer.address_int_number ? `, Int. ${customer.address_int_number}` : ''}
          </p>
          <p style={{ fontSize: '0.85rem' }}>{customer.address_neighborhood}</p>
          <p style={{ fontSize: '0.85rem' }}>
            {customer.address_postal_code} {customer.address_city}, {customer.address_state}
          </p>
          <p style={{ fontSize: '0.85rem' }}>{customer.address_country}</p>
        </section>

        <section
          style={{
            backgroundColor: '#fff',
            padding: '0.75rem 0.9rem',
            borderRadius: 6,
            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Bedrijf / Extra
          </h2>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Bedrijf:</strong> {customer.company_name || '-'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>RFC:</strong> {customer.tax_id || '-'}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <strong>Omschrijving:</strong>
          </p>
          <p style={{ fontSize: '0.85rem' }}>{customer.description || '-'}</p>
        </section>

        <section
          style={{
            backgroundColor: '#fff',
            padding: '0.75rem 0.9rem',
            borderRadius: 6,
            boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          }}
        >
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.5rem',
            }}
          >
            Metadata
          </h2>
          <p style={{ fontSize: '0.8rem' }}>
            <strong>Aangemaakt:</strong> {new Date(customer.created_at).toLocaleString()}
          </p>
          <p style={{ fontSize: '0.8rem' }}>
            <strong>Bijgewerkt:</strong> {new Date(customer.updated_at).toLocaleString()}
          </p>
          {customer.deactivated_at && (
            <p style={{ fontSize: '0.8rem' }}>
              <strong>Gedeactiveerd:</strong>{' '}
              {new Date(customer.deactivated_at).toLocaleString()}
            </p>
          )}
        </section>
      </div>
    </div>
  )
}

const CustomerEditPage: React.FC = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<CustomerEditFormState>(EMPTY_EDIT_FORM)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/admin/customers/${id}`)
        const c: CustomerDetail = await res.json()
        setForm({
          email: c.email,
          first_name: c.first_name,
          last_name: c.last_name,
          phone_number: c.phone_number || '',
          customer_type: c.customer_type,
          description: c.description || '',
          company_name: c.company_name || '',
          tax_id: c.tax_id || '',
          address_street: c.address_street || '',
          address_ext_number: c.address_ext_number || '',
          address_int_number: c.address_int_number || '',
          address_neighborhood: c.address_neighborhood || '',
          address_city: c.address_city || '',
          address_state: c.address_state || '',
          address_postal_code: c.address_postal_code || '',
          address_country: c.address_country || 'Mexico',
        })
      } catch (err: any) {
        if (err.message === 'unauthorized') {
          setStoredToken(null)
          navigate('/login')
          return
        }
        console.error(err)
        setError('Kon klant niet laden.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const validate = (): string | null => {
    if (!form.first_name.trim()) return 'Voornaam is verplicht.'
    if (!form.last_name.trim()) return 'Achternaam is verplicht.'
    if (!form.email.trim()) return 'Email is verplicht.'
    if (!form.customer_type) return 'Klanttype is verplicht.'
    if (form.customer_type === 'bedrijf') {
      if (!form.company_name.trim() || !form.tax_id.trim()) {
        return 'Voor een bedrijf zijn bedrijfsnaam en tax ID verplicht.'
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!id) return
    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    setError(null)
    try {
      await apiFetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      navigate('/customers', { state: { message: 'Klant succesvol bijgewerkt.' } })
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon klant niet opslaan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p style={{ fontSize: '0.9rem' }}>Laden...</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/customers')}
        style={{
          marginBottom: '0.75rem',
          padding: '0.3rem 0.6rem',
          borderRadius: 4,
          border: '1px solid #d1d5db',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        ← Terug
      </button>

      <h1
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
        }}
      >
        Klant bewerken
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            fontSize: '0.85rem',
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            borderRadius: 4,
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#fff',
          padding: '0.9rem 1rem',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.75rem 1rem',
        }}
      >
        {/* basisgegevens */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Voornaam
          </label>
          <input
            name="first_name"
            value={form.first_name}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Achternaam
          </label>
          <input
            name="last_name"
            value={form.last_name}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Email
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Telefoon
          </label>
          <input
            name="phone_number"
            value={form.phone_number}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Klanttype
          </label>
          <select
            name="customer_type"
            value={form.customer_type}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          >
            <option value="particulier">Particulier</option>
            <option value="bedrijf">Bedrijf</option>
          </select>
        </div>

        {form.customer_type === 'bedrijf' && (
          <>
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: 4,
                }}
              >
                Bedrijfsnaam
              </label>
              <input
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                }}
              />
            </div>

            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.85rem',
                  marginBottom: 4,
                }}
              >
                Tax ID (RFC)
              </label>
              <input
                name="tax_id"
                value={form.tax_id}
                onChange={handleChange}
                style={{
                  width: '100%',
                  padding: '0.4rem 0.5rem',
                  borderRadius: 4,
                  border: '1px solid #d1d5db',
                  fontSize: '0.9rem',
                }}
              />
            </div>
          </>
        )}

        <div style={{ gridColumn: '1 / -1' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Omschrijving / Notities
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={3}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
              resize: 'vertical',
            }}
          />
        </div>

        <div style={{ gridColumn: '1 / -1', marginTop: '0.25rem' }}>
          <h2
            style={{
              fontSize: '0.9rem',
              fontWeight: 600,
              marginBottom: '0.35rem',
            }}
          >
            Adres
          </h2>
        </div>

        {/* adresvelden */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Straat
          </label>
          <input
            name="address_street"
            value={form.address_street}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Huisnummer
          </label>
          <input
            name="address_ext_number"
            value={form.address_ext_number}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Bus / interieur
          </label>
          <input
            name="address_int_number"
            value={form.address_int_number}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Wijk
          </label>
          <input
            name="address_neighborhood"
            value={form.address_neighborhood}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Postcode
          </label>
          <input
            name="address_postal_code"
            value={form.address_postal_code}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Stad
          </label>
          <input
            name="address_city"
            value={form.address_city}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Staat
          </label>
          <input
            name="address_state"
            value={form.address_state}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: 4,
            }}
          >
            Land
          </label>
          <input
            name="address_country"
            value={form.address_country}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.4rem 0.5rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              fontSize: '0.9rem',
            }}
          />
        </div>

        <div
          style={{
            gridColumn: '1 / -1',
            marginTop: '0.5rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => navigate('/customers')}
            disabled={saving}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              fontSize: '0.9rem',
              cursor: saving ? 'default' : 'pointer',
            }}
          >
            Annuleren
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 4,
              border: 'none',
              backgroundColor: '#2563eb',
              color: '#fff',
              fontSize: '0.9rem',
              fontWeight: 500,
              cursor: saving ? 'default' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Bezig met opslaan...' : 'Opslaan'}
          </button>
        </div>
      </form>
    </div>
  )
}

const App: React.FC = () => {
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/customers"
          element={
            <ProtectedRoute>
              <CustomersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id"
          element={
            <ProtectedRoute>
              <CustomerDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/customers/:id/edit"
          element={
            <ProtectedRoute>
              <CustomerEditPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/customers" />} />
      </Routes>
    </Layout>
  )
}

export default App
