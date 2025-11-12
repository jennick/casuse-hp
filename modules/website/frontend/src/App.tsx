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

  // Extra info uit backend over login/portaal
  has_login: boolean
  portal_status?: string | null
  deactivated_at?: string | null
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

function getCustomerStatusDisplay(c: CustomerListItem) {
  // 1) Eerst checken of klant gedeactiveerd is
  if (!c.is_active) {
    return {
      label: 'Gedeactiveerd',
      backgroundColor: '#fee2e2',
      color: '#991b1b',
      borderColor: '#fecaca',
    }
  }

  // 2) Actief + login → groen
  if (c.has_login) {
    return {
      label: 'Actief – login aangemaakt',
      backgroundColor: '#dcfce7',
      color: '#166534',
      borderColor: '#bbf7d0',
    }
  }

  // 3) Actief maar géén login → oranje (in voorbereiding)
  return {
    label: 'Actief – géén login',
    backgroundColor: '#fef3c7',
    color: '#92400e',
    borderColor: '#fed7aa',
  }
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

async function apiFetch(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const token = getStoredToken()
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    setStoredToken(null)
    throw new Error('unauthorized')
  }

  return res
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()

  const handleLogout = () => {
    setStoredToken(null)
    navigate('/login')
  }

  const handleBackToModules = () => {
    window.location.href = CORE_HOME_URL
  }

  const isLoginPage = location.pathname === '/login'

  return (
    <div
      style={{
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        minHeight: '100vh',
        backgroundColor: '#f3f4f6',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
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
              color: '#9ca3af',
            }}
          >
            module: website
          </span>
        </div>

        {!isLoginPage && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleBackToModules}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 9999,
                border: '1px solid #16a34a',
                backgroundColor: '#047857',
                color: '#bbf7d0',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Terug naar modules
            </button>
            <button
              type="button"
              onClick={handleLogout}
              style={{
                padding: '0.35rem 0.75rem',
                borderRadius: 9999,
                border: '1px solid #f97373',
                backgroundColor: '#b91c1c',
                color: '#fee2e2',
                fontSize: '0.8rem',
                cursor: 'pointer',
              }}
            >
              Logout
            </button>
          </div>
        )}
      </header>

      <main
        style={{
          flex: 1,
          maxWidth: 1100,
          width: '100%',
          margin: '0 auto',
          padding: '1.25rem 1.5rem',
        }}
      >
        {children}
      </main>
    </div>
  )
}

const ProtectedRoute: React.FC<{ children: React.ReactElement }> = ({
  children,
}) => {
  const token = getStoredToken()
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  const location = useLocation() as any

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`${API_BASE_URL}/api/public/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      })

      if (!res.ok) {
        if (res.status === 401) {
          setError('Ongeldige email of wachtwoord.')
        } else {
          setError('Er is een fout opgetreden bij het inloggen.')
        }
        return
      }

      const data: TokenResponse = await res.json()
      setStoredToken(data.access_token)

      const from = location.state?.from?.pathname || '/customers'
      navigate(from, { replace: true })
    } catch (err) {
      console.error(err)
      setError('Er is een onverwachte fout opgetreden.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        maxWidth: 400,
        margin: '3rem auto',
        backgroundColor: '#fff',
        padding: '1.25rem 1.5rem',
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(15,23,42,0.08)',
      }}
    >
      <h1
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.75rem',
        }}
      >
        Inloggen Website Admin
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.85rem',
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
              marginBottom: '0.25rem',
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
            required
          />
        </div>

        <div style={{ marginBottom: '0.75rem' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.85rem',
              marginBottom: '0.25rem',
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
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            marginTop: '0.5rem',
            width: '100%',
            padding: '0.45rem 0.75rem',
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontWeight: 500,
            fontSize: '0.9rem',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.8 : 1,
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
  const [filterType, setFilterType] = useState<'all'
  | 'particulier'
  | 'bedrijf'>('all')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>(
    'active',
  )
  const [sortOption, setSortOption] = useState<
    'created_at_desc' | 'created_at_asc' | 'name_asc' | 'name_desc'
  >('created_at_desc')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const navigate = useNavigate()

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (filterType !== 'all') params.set('type', filterType)
      if (statusFilter !== 'all') params.set('status', statusFilter)

      if (sortOption === 'created_at_desc') {
        params.set('sort_by', 'created_at')
        params.set('sort_dir', 'desc')
      } else if (sortOption === 'created_at_asc') {
        params.set('sort_by', 'created_at')
        params.set('sort_dir', 'asc')
      } else if (sortOption === 'name_asc') {
        params.set('sort_by', 'name')
        params.set('sort_dir', 'asc')
      } else if (sortOption === 'name_desc') {
        params.set('sort_by', 'name')
        params.set('sort_dir', 'desc')
      }

      const res = await apiFetch(`/api/admin/customers?${params.toString()}`)
      if (!res.ok) {
        throw new Error('Failed to load customers')
      }

      const data: CustomersListResponse = await res.json()
      setCustomers(data.items || [])
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
    loadCustomers()
  }, [])

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setFilterType(e.target.value as any)
  }

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value as any)
  }

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSortOption(e.target.value as any)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadCustomers()
  }

  const handleDeactivate = async (id: string) => {
    if (
      !window.confirm(
        'Weet je zeker dat je deze klant wilt deactiveren? Hij kan dan niet meer inloggen.',
      )
    ) {
      return
    }

    try {
      const res = await apiFetch(`/api/admin/customers/${id}/deactivate`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to deactivate customer')
      }
      setSuccessMessage('Klant is gedeactiveerd.')
      await loadCustomers()
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

  const handleActivate = async (id: string) => {
    try {
      const res = await apiFetch(`/api/admin/customers/${id}/activate`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to activate customer')
      }
      setSuccessMessage('Klant is geactiveerd.')
      await loadCustomers()
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon klant niet activeren.')
    }
  }

  const handleResetPassword = async (id: string) => {
    if (
      !window.confirm(
        'Weet je zeker dat je een nieuwe wachtwoord-reset link wilt sturen naar deze klant?',
      )
    ) {
      return
    }

    try {
      const res = await apiFetch(`/api/admin/customers/${id}/reset_password`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to reset password')
      }
      setSuccessMessage('Wachtwoord-reset link is aangemaakt en verstuurd.')
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon wachtwoord-reset niet uitvoeren.')
    }
  }

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-end',
          marginBottom: '1rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '0.1rem',
            }}
          >
            Klanten
          </h1>
          <span style={{ fontSize: '0.8rem', color: '#6b7280' }}>
            Totaal: {customers.length}
          </span>
        </div>

        {successMessage && (
          <div
            style={{
              marginBottom: '0.5rem',
              padding: '0.5rem 0.75rem',
              backgroundColor: '#dcfce7',
              color: '#166534',
              borderRadius: 4,
              fontSize: '0.85rem',
            }}
          >
            {successMessage}
          </div>
        )}
      </div>

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            borderRadius: 4,
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      <form
        onSubmit={handleSearchSubmit}
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '0.5rem',
          alignItems: 'center',
          marginBottom: '0.75rem',
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
            padding: '0.35rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="all">Type: alle</option>
          <option value="particulier">Particulieren</option>
          <option value="bedrijf">Bedrijven</option>
        </select>
        <select
          value={statusFilter}
          onChange={handleStatusChange}
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="active">Alleen actieve</option>
          <option value="inactive">Alleen gedeactiveerde</option>
          <option value="all">Actief + gedeactiveerd</option>
        </select>
        <select
          value={sortOption}
          onChange={handleSortChange}
          style={{
            padding: '0.35rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.85rem',
          }}
        >
          <option value="created_at_desc">Datum aangemaakt – nieuwste eerst</option>
          <option value="created_at_asc">Datum aangemaakt – oudste eerst</option>
          <option value="name_asc">Naam A-Z</option>
          <option value="name_desc">Naam Z-A</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: '0.4rem 0.75rem',
            borderRadius: 4,
            border: 'none',
            backgroundColor: '#2563eb',
            color: '#fff',
            fontSize: '0.85rem',
            fontWeight: 500,
            cursor: loading ? 'default' : 'pointer',
          }}
        >
          Zoeken
        </button>
      </form>

      <div
        style={{
          borderRadius: 6,
          overflow: 'hidden',
          border: '1px solid #e5e7eb',
          backgroundColor: '#fff',
        }}
      >
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
              {/* NIEUW: Status-kolom */}
              <th
                style={{
                  padding: '0.4rem 0.6rem',
                  borderBottom: '1px solid #e5e7eb',
                }}
              >
                Status
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
                {/* NIEUW: Status-label */}
                <td
                  style={{
                    padding: '0.4rem 0.6rem',
                    borderBottom: '1px solid #f3f4f6',
                  }}
                >
                  {(() => {
                    const status = getCustomerStatusDisplay(c)
                    return (
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.1rem 0.45rem',
                          borderRadius: 9999,
                          fontSize: '0.75rem',
                          fontWeight: 500,
                          backgroundColor: status.backgroundColor,
                          color: status.color,
                          border: `1px solid ${status.borderColor}`,
                        }}
                      >
                        {status.label}
                      </span>
                    )
                  })()}
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
                  {c.is_active ? (
                    <button
                      type="button"
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
                        cursor: 'pointer',
                      }}
                    >
                      Deactiveren
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation()
                        handleActivate(c.id)
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: 4,
                        border: '1px solid #bbf7d0',
                        backgroundColor: '#dcfce7',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                      }}
                    >
                      Activeren
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation()
                      handleResetPassword(c.id)
                    }}
                    style={{
                      marginLeft: '0.35rem',
                      padding: '0.25rem 0.5rem',
                      borderRadius: 4,
                      border: '1px solid #2563eb',
                      backgroundColor: '#eff6ff',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                    }}
                  >
                    Reset wachtwoord
                  </button>
                </td>
              </tr>
            ))}
            {!loading && customers.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '0.75rem 0.6rem',
                    fontSize: '0.85rem',
                    color: '#6b7280',
                    textAlign: 'center',
                  }}
                >
                  Geen klanten gevonden.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {loading && (
          <div
            style={{
              padding: '0.75rem 0.6rem',
              fontSize: '0.85rem',
              textAlign: 'center',
              color: '#6b7280',
            }}
          >
            Klanten aan het laden...
          </div>
        )}
      </div>
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
        if (!res.ok) {
          throw new Error('Failed to load customer')
        }
        const data: CustomerDetail = await res.json()
        setCustomer(data)
      } catch (err: any) {
        if (err.message === 'unauthorized') {
          setStoredToken(null)
          navigate('/login')
          return
        }
        console.error(err)
        setError('Kon klantdetails niet laden.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleDeactivate = async () => {
    if (
      !window.confirm(
        'Weet je zeker dat je deze klant wilt deactiveren? Hij kan dan niet meer inloggen.',
      )
    ) {
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await apiFetch(`/api/admin/customers/${id}/deactivate`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to deactivate customer')
      }
      setActionSuccess('Klant is gedeactiveerd.')
      const updatedRes = await apiFetch(`/api/admin/customers/${id}`)
      const updated: CustomerDetail = await updatedRes.json()
      setCustomer(updated)
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setActionError('Kon klant niet deactiveren.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleActivate = async () => {
    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await apiFetch(`/api/admin/customers/${id}/activate`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to activate customer')
      }
      setActionSuccess('Klant is geactiveerd.')
      const updatedRes = await apiFetch(`/api/admin/customers/${id}`)
      const updated: CustomerDetail = await updatedRes.json()
      setCustomer(updated)
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setActionError('Kon klant niet activeren.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (
      !window.confirm(
        'Weet je zeker dat je een nieuwe wachtwoord-reset link wilt sturen naar deze klant?',
      )
    ) {
      return
    }

    try {
      setActionLoading(true)
      setActionError(null)
      setActionSuccess(null)
      const res = await apiFetch(`/api/admin/customers/${id}/reset_password`, {
        method: 'POST',
      })
      if (!res.ok) {
        throw new Error('Failed to reset password')
      }
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
            padding: '0.35rem 0.7rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            backgroundColor: '#f9fafb',
            fontSize: '0.85rem',
            cursor: 'pointer',
          }}
        >
          ← Terug naar klanten
        </button>
        <div
          style={{
            padding: '0.75rem 0.9rem',
            borderRadius: 6,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.9rem',
          }}
        >
          {error}
        </div>
      </div>
    )
  }

  if (!customer) {
    return null
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/customers')}
        style={{
          marginBottom: '0.75rem',
          padding: '0.35rem 0.7rem',
          borderRadius: 4,
          border: '1px solid #d1d5db',
          backgroundColor: '#f9fafb',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        ← Terug naar klanten
      </button>

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '0.75rem',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              marginBottom: '0.2rem',
            }}
          >
            {customer.first_name} {customer.last_name}
          </h1>
          <p
            style={{
              fontSize: '0.85rem',
              color: '#6b7280',
              margin: 0,
            }}
          >
            {customer.customer_type === 'bedrijf' ? 'Bedrijf' : 'Particulier'}
            {customer.company_name ? ` • ${customer.company_name}` : ''}
          </p>
          {(() => {
            const status = getCustomerStatusDisplay(customer)
            return (
              <span
                style={{
                  display: 'inline-block',
                  padding: '0.15rem 0.55rem',
                  borderRadius: 9999,
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  backgroundColor: status.backgroundColor,
                  color: status.color,
                  border: `1px solid ${status.borderColor}`,
                  marginTop: '0.3rem',
                }}
              >
                {status.label}
              </span>
            )
          })()}
        </div>

        <div style={{ textAlign: 'right' }}>
          {actionSuccess && (
            <div
              style={{
                marginBottom: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 4,
                backgroundColor: '#dcfce7',
                color: '#166534',
                fontSize: '0.85rem',
              }}
            >
              {actionSuccess}
            </div>
          )}
          {actionError && (
            <div
              style={{
                marginBottom: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: 4,
                backgroundColor: '#fee2e2',
                color: '#991b1b',
                fontSize: '0.85rem',
              }}
            >
              {actionError}
            </div>
          )}

          <div>
            {customer.is_active ? (
              <button
                type="button"
                onClick={handleDeactivate}
                disabled={actionLoading}
                style={{
                  marginRight: '0.35rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: 4,
                  border: '1px solid #fecaca',
                  backgroundColor: '#fef2f2',
                  fontSize: '0.85rem',
                  cursor: actionLoading ? 'default' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? 'Bezig...' : 'Deactiveren'}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleActivate}
                disabled={actionLoading}
                style={{
                  marginRight: '0.35rem',
                  padding: '0.35rem 0.7rem',
                  borderRadius: 4,
                  border: '1px solid #bbf7d0',
                  backgroundColor: '#dcfce7',
                  fontSize: '0.85rem',
                  cursor: actionLoading ? 'default' : 'pointer',
                  opacity: actionLoading ? 0.7 : 1,
                }}
              >
                {actionLoading ? 'Bezig...' : 'Activeren'}
              </button>
            )}
{/* reset-wachtwoord knop alleen tonen als klant actief is */}
{customer.is_active ? (
  <button
    type="button"
    onClick={handleResetPassword}
    disabled={actionLoading}
    style={{
      padding: '0.35rem 0.7rem',
      borderRadius: 4,
      border: '1px solid #2563eb',
      backgroundColor: '#eff6ff',
      fontSize: '0.85rem',
      cursor: actionLoading ? 'default' : 'pointer',
      opacity: actionLoading ? 0.7 : 1,
    }}
  >
    {actionLoading ? 'Bezig met reset...' : 'Reset wachtwoord'}
  </button>
) : null}
          </div>
        </div>
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
            <strong>Login aangemaakt:</strong> {customer.has_login ? 'Ja' : 'Nee'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Portal status:</strong> {customer.portal_status || '-'}
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
            {customer.address_int_number
              ? `, Int. ${customer.address_int_number}`
              : ''}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            {customer.address_neighborhood}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            {customer.address_postal_code} {customer.address_city},{' '}
            {customer.address_state}
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
            <strong>BTW / Tax ID:</strong> {customer.tax_id || '-'}
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            <strong>Omschrijving:</strong>{' '}
            {customer.description ? customer.description : '-'}
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
            Metadata
          </h2>
          <p style={{ fontSize: '0.8rem' }}>
            <strong>Aangemaakt:</strong>{' '}
            {new Date(customer.created_at).toLocaleString()}
          </p>
          <p style={{ fontSize: '0.8rem' }}>
            <strong>Bijgewerkt:</strong>{' '}
            {new Date(customer.updated_at).toLocaleString()}
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
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!id) return
      setLoading(true)
      setError(null)
      try {
        const res = await apiFetch(`/api/admin/customers/${id}`)
        if (!res.ok) {
          throw new Error('Failed to load customer')
        }
        const data: CustomerDetail = await res.json()
        setForm({
          email: data.email || '',
          first_name: data.first_name || '',
          last_name: data.last_name || '',
          phone_number: data.phone_number || '',
          customer_type: data.customer_type,
          description: data.description || '',
          company_name: data.company_name || '',
          tax_id: data.tax_id || '',
          address_street: data.address_street || '',
          address_ext_number: data.address_ext_number || '',
          address_int_number: data.address_int_number || '',
          address_neighborhood: data.address_neighborhood || '',
          address_city: data.address_city || '',
          address_state: data.address_state || '',
          address_postal_code: data.address_postal_code || '',
          address_country: data.address_country || 'Mexico',
        })
      } catch (err: any) {
        if (err.message === 'unauthorized') {
          setStoredToken(null)
          navigate('/login')
          return
        }
        console.error(err)
        setError('Kon klantgegevens niet laden.')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [id])

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
        return 'Bedrijfsnaam en BTW/Tax ID zijn verplicht voor bedrijven.'
      }
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    const validationError = validate()
    if (validationError) {
      setError(validationError)
      return
    }

    setSaving(true)
    try {
      const res = await apiFetch(`/api/admin/customers/${id}`, {
        method: 'PUT',
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        throw new Error('Failed to update customer')
      }
      setSuccess('Klantgegevens zijn opgeslagen.')
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      console.error(err)
      setError('Kon klantgegevens niet opslaan.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <p style={{ fontSize: '0.9rem' }}>Klantgegevens laden...</p>
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => navigate('/customers')}
        style={{
          marginBottom: '0.75rem',
          padding: '0.35rem 0.7rem',
          borderRadius: 4,
          border: '1px solid #d1d5db',
          backgroundColor: '#f9fafb',
          fontSize: '0.85rem',
          cursor: 'pointer',
        }}
      >
        ← Terug naar klanten
      </button>

      <h1
        style={{
          fontSize: '1.1rem',
          fontWeight: 600,
          marginBottom: '0.5rem',
        }}
      >
        Klant bewerken
      </h1>

      {error && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            backgroundColor: '#fee2e2',
            color: '#991b1b',
            fontSize: '0.85rem',
          }}
        >
          {error}
        </div>
      )}

      {success && (
        <div
          style={{
            marginBottom: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 4,
            backgroundColor: '#dcfce7',
            color: '#166534',
            fontSize: '0.85rem',
          }}
        >
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        style={{
          backgroundColor: '#fff',
          padding: '0.75rem 0.9rem',
          borderRadius: 6,
          boxShadow: '0 1px 2px rgba(15,23,42,0.05)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '0.75rem',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                marginBottom: '0.25rem',
              }}
            >
              Voornaam
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Achternaam
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
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
                marginBottom: '0.25rem',
              }}
            >
              Telefoon
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
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

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                marginBottom: '0.25rem',
              }}
            >
              Bedrijfsnaam
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              BTW / Tax ID
            </label>
            <input
              type="text"
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

          <div style={{ gridColumn: '1 / -1' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                marginBottom: '0.25rem',
              }}
            >
              Omschrijving
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

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                marginBottom: '0.25rem',
              }}
            >
              Straat
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Huisnummer
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              App./Int. nummer
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Wijk / Colonia
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Stad
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Staat
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Postcode
            </label>
            <input
              type="text"
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
                marginBottom: '0.25rem',
              }}
            >
              Land
            </label>
            <input
              type="text"
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
        </div>

        <div
          style={{
            marginTop: '0.75rem',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            onClick={() => navigate(`/customers/${id}`)}
            style={{
              padding: '0.4rem 0.75rem',
              borderRadius: 4,
              border: '1px solid #d1d5db',
              backgroundColor: '#f9fafb',
              fontSize: '0.9rem',
              cursor: 'pointer',
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
