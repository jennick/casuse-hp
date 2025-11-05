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

// URL van core-frontend met modules-overzicht (na logout / terug)
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

async function apiFetch(input: string, init: RequestInit = {}) {
  const token = getStoredToken()

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers || {}),
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE_URL}${input}`, {
    ...init,
    headers,
  })

  if (res.status === 401 || res.status === 403) {
    throw new Error('unauthorized')
  }

  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `HTTP error ${res.status}`)
  }

  return res
}

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const token = getStoredToken()

  // Logout: website-module uitloggen + naar core (zoals jij het nu hebt)
  const handleLogout = () => {
    setStoredToken(null)
    window.location.href = CORE_HOME_URL
  }

  // Terug naar modules: alleen navigeren naar core, website-token blijft
  const handleBackToModules = () => {
    window.location.href = CORE_HOME_URL
  }

  const isLoginPage = location.pathname === '/login'

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

        {token && !isLoginPage && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleBackToModules}
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
    } catch (err: any) {
      setError('Login mislukt. Controleer email en wachtwoord.')
      console.error(err)
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (search.trim().length > 0) {
        params.set('search', search.trim())
      }
      const res = await apiFetch(`/api/admin/customers?${params.toString()}`)
      const data: CustomersListResponse = await res.json()
      setCustomers(data.items)
    } catch (err: any) {
      if (err.message === 'unauthorized') {
        setStoredToken(null)
        navigate('/login')
        return
      }
      setError('Kon klanten niet laden.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
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

      <form
        onSubmit={handleSearchSubmit}
        style={{ marginBottom: '0.75rem', display: 'flex', gap: '0.5rem' }}
      >
        <input
          type="text"
          placeholder="Zoek op naam, email of bedrijf..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '0.4rem 0.5rem',
            borderRadius: 4,
            border: '1px solid #d1d5db',
            fontSize: '0.9rem',
          }}
        />
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
        <p style={{ fontSize: '0.9rem', color: '#6b7280' }}>
          Geen klanten gevonden.
        </p>
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
              <tr style={{ backgroundColor: '#f9fafb', textAlign: 'left' }}>
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
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr
                  key={c.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/customers/${c.id}`)}
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
        setError('Kon klant niet laden.')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, navigate])

  if (loading) {
    return <p style={{ fontSize: '0.9rem' }}>Laden...</p>
  }

  if (error) {
    return (
      <div>
        <button
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

  if (!customer) {
    return null
  }

  return (
    <div>
      <button
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
            {customer.address_int_number
              ? `, Int. ${customer.address_int_number}`
              : ''}
          </p>
          <p style={{ fontSize: '0.85rem' }}>{customer.address_neighborhood}</p>
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
            <strong>RFC:</strong> {customer.tax_id || '-'}
          </p>
          <p style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
            <strong>Omschrijving:</strong>
          </p>
          <p style={{ fontSize: '0.85rem' }}>
            {customer.description || '-'}
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
        </section>
      </div>
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
        <Route path="*" element={<Navigate to="/customers" />} />
      </Routes>
    </Layout>
  )
}

export default App
