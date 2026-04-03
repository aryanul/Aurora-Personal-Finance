import { useEffect, useMemo, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './App.css'

const STORAGE_KEY = 'finance-dashboard-transactions-v1'
const ROLE_KEY = 'finance-dashboard-role-v1'
const NOTE_KEY = 'finance-dashboard-note-v1'
const THEME_KEY = 'finance-dashboard-theme-v1'

const COLORS = ['#0d9488', '#f59e0b', '#ef4444', '#2563eb', '#84cc16', '#06b6d4']

const seedTransactions = [
  {
    id: 'tx-1',
    date: '2026-01-05',
    description: 'January Salary',
    category: 'Salary',
    type: 'income',
    amount: 5200,
  },
  {
    id: 'tx-2',
    date: '2026-01-11',
    description: 'Groceries SuperMart',
    category: 'Groceries',
    type: 'expense',
    amount: 245.4,
  },
  {
    id: 'tx-3',
    date: '2026-01-18',
    description: 'Monthly Rent',
    category: 'Housing',
    type: 'expense',
    amount: 1650,
  },
  {
    id: 'tx-4',
    date: '2026-02-02',
    description: 'Freelance Project',
    category: 'Freelance',
    type: 'income',
    amount: 1400,
  },
  {
    id: 'tx-5',
    date: '2026-02-09',
    description: 'Gym Membership',
    category: 'Health',
    type: 'expense',
    amount: 90,
  },
  {
    id: 'tx-6',
    date: '2026-02-16',
    description: 'Weekend Trip',
    category: 'Travel',
    type: 'expense',
    amount: 520,
  },
  {
    id: 'tx-7',
    date: '2026-02-28',
    description: 'February Salary',
    category: 'Salary',
    type: 'income',
    amount: 5200,
  },
  {
    id: 'tx-8',
    date: '2026-03-03',
    description: 'Cloud Subscription',
    category: 'Utilities',
    type: 'expense',
    amount: 64,
  },
  {
    id: 'tx-9',
    date: '2026-03-10',
    description: 'Dining Out',
    category: 'Food',
    type: 'expense',
    amount: 132.7,
  },
  {
    id: 'tx-10',
    date: '2026-03-25',
    description: 'March Salary',
    category: 'Salary',
    type: 'income',
    amount: 5200,
  },
]

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

function monthLabel(monthKey) {
  const [year, month] = monthKey.split('-')
  return new Date(Number(year), Number(month) - 1).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
  })
}

function monthKey(dateString) {
  return dateString.slice(0, 7)
}

function fetchMockTransactions() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(seedTransactions)
    }, 700)
  })
}

function isWithinRange(dateString, quickRange) {
  if (quickRange === 'all') {
    return true
  }

  const txDate = new Date(dateString)
  const now = new Date()

  if (quickRange === 'ytd') {
    return txDate.getFullYear() === now.getFullYear()
  }

  const diffDays = Math.floor((now - txDate) / (1000 * 60 * 60 * 24))
  if (quickRange === '30d') {
    return diffDays <= 30
  }
  if (quickRange === '90d') {
    return diffDays <= 90
  }

  return true
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function escapeCSVValue(value) {
  const asText = String(value ?? '')
  if (asText.includes(',') || asText.includes('"') || asText.includes('\n')) {
    return `"${asText.replaceAll('"', '""')}"`
  }
  return asText
}

function defaultDraft() {
  return {
    date: new Date().toISOString().slice(0, 10),
    description: '',
    category: 'Misc',
    type: 'expense',
    amount: '',
  }
}

function App() {
  const [role, setRole] = useState(() => {
    const savedRole = localStorage.getItem(ROLE_KEY)
    return savedRole === 'admin' ? 'admin' : 'viewer'
  })
  const [theme, setTheme] = useState(() =>
    localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark',
  )
  const [transactions, setTransactions] = useState([])
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [dataSource, setDataSource] = useState('')
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [monthFilter, setMonthFilter] = useState('all')
  const [quickRange, setQuickRange] = useState('all')
  const [minAmount, setMinAmount] = useState('')
  const [maxAmount, setMaxAmount] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [viewMode, setViewMode] = useState('list')
  const [draft, setDraft] = useState(defaultDraft)
  const [editingId, setEditingId] = useState(null)
  const [deskNote, setDeskNote] = useState(() => localStorage.getItem(NOTE_KEY) || '')

  useEffect(() => {
    let isCancelled = false

    async function bootstrap() {
      const savedTransactions = localStorage.getItem(STORAGE_KEY)
      if (savedTransactions) {
        try {
          const parsed = JSON.parse(savedTransactions)
          if (Array.isArray(parsed)) {
            if (!isCancelled) {
              setTransactions(parsed)
              setDataSource('local-storage')
              setIsBootstrapping(false)
            }
            return
          }
        } catch {
          // If persisted data is invalid, fallback to mock API source.
        }
      }

      const mockData = await fetchMockTransactions()
      if (!isCancelled) {
        setTransactions(mockData)
        setDataSource('mock-api')
        setIsBootstrapping(false)
      }
    }

    bootstrap()
    return () => {
      isCancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isBootstrapping) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions))
    }
  }, [transactions, isBootstrapping])

  useEffect(() => {
    localStorage.setItem(ROLE_KEY, role)
  }, [role])

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    localStorage.setItem(NOTE_KEY, deskNote)
  }, [deskNote])

  const categories = useMemo(() => {
    const categorySet = new Set(transactions.map((tx) => tx.category))
    return Array.from(categorySet).sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const months = useMemo(() => {
    const monthSet = new Set(transactions.map((tx) => monthKey(tx.date)))
    return Array.from(monthSet).sort((a, b) => b.localeCompare(a))
  }, [transactions])

  const filteredTransactions = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return transactions
      .filter((tx) => {
        if (typeFilter !== 'all' && tx.type !== typeFilter) {
          return false
        }
        if (categoryFilter !== 'all' && tx.category !== categoryFilter) {
          return false
        }
        if (monthFilter !== 'all' && monthKey(tx.date) !== monthFilter) {
          return false
        }
        if (!isWithinRange(tx.date, quickRange)) {
          return false
        }
        const low = Number(minAmount)
        const high = Number(maxAmount)
        if (minAmount && tx.amount < low) {
          return false
        }
        if (maxAmount && tx.amount > high) {
          return false
        }
        if (!normalizedSearch) {
          return true
        }

        return [tx.description, tx.category, tx.type, tx.date]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)
      })
      .sort((a, b) => {
        if (sortBy === 'newest') {
          return new Date(b.date) - new Date(a.date)
        }
        if (sortBy === 'oldest') {
          return new Date(a.date) - new Date(b.date)
        }
        if (sortBy === 'high') {
          return b.amount - a.amount
        }
        return a.amount - b.amount
      })
  }, [
    transactions,
    search,
    typeFilter,
    categoryFilter,
    monthFilter,
    quickRange,
    minAmount,
    maxAmount,
    sortBy,
  ])

  const totals = useMemo(() => {
    return transactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') {
          acc.income += tx.amount
        } else {
          acc.expenses += tx.amount
        }
        return acc
      },
      { income: 0, expenses: 0 },
    )
  }, [transactions])

  const balance = totals.income - totals.expenses

  const trendData = useMemo(() => {
    const byMonth = transactions.reduce((acc, tx) => {
      const key = monthKey(tx.date)
      if (!acc[key]) {
        acc[key] = { month: key, income: 0, expenses: 0, net: 0 }
      }
      if (tx.type === 'income') {
        acc[key].income += tx.amount
      } else {
        acc[key].expenses += tx.amount
      }
      acc[key].net = acc[key].income - acc[key].expenses
      return acc
    }, {})

    return Object.values(byMonth)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map((item) => ({
        ...item,
        label: monthLabel(item.month),
      }))
  }, [transactions])

  const categoryData = useMemo(() => {
    const byCategory = transactions
      .filter((tx) => tx.type === 'expense')
      .reduce((acc, tx) => {
        acc[tx.category] = (acc[tx.category] || 0) + tx.amount
        return acc
      }, {})

    return Object.entries(byCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  const insights = useMemo(() => {
    if (!transactions.length) {
      return {
        topCategory: 'N/A',
        monthDiff: 0,
        monthDirection: 'steady',
        observation: 'Add a few transactions to unlock meaningful insights.',
      }
    }

    const topCategory = categoryData[0]?.name ?? 'N/A'
    const monthsSorted = [...months].sort((a, b) => a.localeCompare(b))
    const latestMonth = monthsSorted[monthsSorted.length - 1]
    const previousMonth = monthsSorted[monthsSorted.length - 2]

    const currentExpense = transactions
      .filter((tx) => tx.type === 'expense' && monthKey(tx.date) === latestMonth)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const previousExpense = transactions
      .filter((tx) => tx.type === 'expense' && monthKey(tx.date) === previousMonth)
      .reduce((sum, tx) => sum + tx.amount, 0)

    const monthDiff = currentExpense - previousExpense
    const monthDirection = monthDiff > 0 ? 'up' : monthDiff < 0 ? 'down' : 'steady'

    const biggestExpense = transactions
      .filter((tx) => tx.type === 'expense')
      .sort((a, b) => b.amount - a.amount)[0]

    const observation = biggestExpense
      ? `Largest expense was ${money.format(biggestExpense.amount)} on ${biggestExpense.category}.`
      : 'No expenses yet. Spending observations will appear as data grows.'

    return {
      topCategory,
      monthDiff,
      monthDirection,
      observation,
      latestMonth,
      previousMonth,
    }
  }, [transactions, categoryData, months])

  const tableTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        if (tx.type === 'income') {
          acc.income += tx.amount
        } else {
          acc.expense += tx.amount
        }
        return acc
      },
      { income: 0, expense: 0 },
    )
  }, [filteredTransactions])

  const recentHighlights = useMemo(() => {
    return [...transactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 4)
  }, [transactions])

  const savingsRate = useMemo(() => {
    if (!totals.income) {
      return 0
    }
    return ((totals.income - totals.expenses) / totals.income) * 100
  }, [totals])

  const groupedByCategory = useMemo(() => {
    const grouped = filteredTransactions.reduce((acc, tx) => {
      if (!acc[tx.category]) {
        acc[tx.category] = {
          category: tx.category,
          income: 0,
          expense: 0,
          count: 0,
        }
      }
      acc[tx.category].count += 1
      if (tx.type === 'income') {
        acc[tx.category].income += tx.amount
      } else {
        acc[tx.category].expense += tx.amount
      }
      return acc
    }, {})

    return Object.values(grouped)
      .map((group) => ({
        ...group,
        net: group.income - group.expense,
      }))
      .sort((a, b) => b.expense - a.expense)
  }, [filteredTransactions])

  function resetDraft() {
    setDraft(defaultDraft())
    setEditingId(null)
  }

  function submitTransaction(event) {
    event.preventDefault()
    if (role !== 'admin') {
      return
    }

    const parsedAmount = Number(draft.amount)
    if (!draft.date || !draft.description.trim() || !draft.category.trim() || parsedAmount <= 0) {
      return
    }

    if (editingId) {
      setTransactions((current) =>
        current.map((tx) =>
          tx.id === editingId
            ? {
                ...tx,
                date: draft.date,
                description: draft.description.trim(),
                category: draft.category.trim(),
                type: draft.type,
                amount: parsedAmount,
              }
            : tx,
        ),
      )
      resetDraft()
      return
    }

    const newTransaction = {
      id: crypto.randomUUID(),
      date: draft.date,
      description: draft.description.trim(),
      category: draft.category.trim(),
      type: draft.type,
      amount: parsedAmount,
    }
    setTransactions((current) => [newTransaction, ...current])
    resetDraft()
  }

  function startEdit(transaction) {
    if (role !== 'admin') {
      return
    }
    setEditingId(transaction.id)
    setDraft({
      date: transaction.date,
      description: transaction.description,
      category: transaction.category,
      type: transaction.type,
      amount: String(transaction.amount),
    })
  }

  function deleteTransaction(id) {
    if (role !== 'admin') {
      return
    }
    setTransactions((current) => current.filter((tx) => tx.id !== id))
    if (id === editingId) {
      resetDraft()
    }
  }

  function exportAsJSON() {
    const filename = `transactions-${new Date().toISOString().slice(0, 10)}.json`
    downloadFile(filename, JSON.stringify(filteredTransactions, null, 2), 'application/json')
  }

  function exportAsCSV() {
    const headers = ['date', 'description', 'category', 'type', 'amount']
    const rows = filteredTransactions.map((tx) =>
      [tx.date, tx.description, tx.category, tx.type, tx.amount].map(escapeCSVValue).join(','),
    )
    const content = [headers.join(','), ...rows].join('\n')
    const filename = `transactions-${new Date().toISOString().slice(0, 10)}.csv`
    downloadFile(filename, content, 'text/csv;charset=utf-8;')
  }

  if (isBootstrapping) {
    return (
      <div className={`app-shell ${theme}`}>
        <div className="loading-screen">Loading your finance workspace...</div>
      </div>
    )
  }

  return (
    <div className={`app-shell ${theme}`}>
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">
            <span />
          </div>
          <div>
            <h2>AURORA</h2>
            <p>Personal Finance</p>
          </div>
        </div>
        <nav>
          <button className="nav-item active">Overview</button>
          <button className="nav-item">Transactions</button>
          <button className="nav-item">Insights</button>
        </nav>
        <div className="sidebar-tag">
          <span className="tag-dot" />
          <span>{theme === 'dark' ? 'Dark workspace' : 'Light workspace'}</span>
        </div>
        <div className="sidebar-panel">
          <p className="sidebar-panel-title">Data source</p>
          <strong>{dataSource}</strong>
        </div>
        <div className="sidebar-panel stats-panel">
          <p className="sidebar-panel-title">Database</p>
          <div className="db-row">
            <span>Transactions</span>
            <strong>{transactions.length}</strong>
          </div>
          <div className="db-row">
            <span>Income rows</span>
            <strong>{transactions.filter((transaction) => transaction.type === 'income').length}</strong>
          </div>
          <div className="db-row">
            <span>Expense rows</span>
            <strong>{transactions.filter((transaction) => transaction.type === 'expense').length}</strong>
          </div>
        </div>
      </aside>

      <main className="page">
        <header className="header">
          <div>
            <p className="kicker">Dashboard · sample data</p>
            <h1>Today's money story</h1>
            <p className="subtext">
              Watch balances, cashflow and spending patterns update as you tweak filters.
            </p>
            <p className="header-meta">
              Savings rate: {Number.isFinite(savingsRate) ? `${savingsRate.toFixed(1)}%` : '0.0%'}
            </p>
          </div>
          <div className="header-actions">
            <button
              className="ghost"
              type="button"
              onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))}
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
            <div className="role-switcher">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(event) => setRole(event.target.value)}>
                <option value="viewer">Viewer (read only)</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
        </header>

        <section className="summary-grid">
        <article className="card summary-card">
          <p>Total Balance</p>
          <h2>{money.format(balance)}</h2>
        </article>
        <article className="card summary-card">
          <p>Total Income</p>
          <h2 className="text-positive">{money.format(totals.income)}</h2>
        </article>
        <article className="card summary-card">
          <p>Total Expenses</p>
          <h2 className="text-negative">{money.format(totals.expenses)}</h2>
        </article>
        </section>

        <section className="authentic-grid">
        <article className="card pulse-card">
          <div className="card-head">
            <h3>What Changed Recently</h3>
            <p>Latest entries from your ledger</p>
          </div>
          {recentHighlights.length ? (
            <ul className="pulse-list">
              {recentHighlights.map((tx) => (
                <li key={tx.id}>
                  <div>
                    <p className="pulse-title">{tx.description}</p>
                    <p className="pulse-sub">
                      {tx.date} • {tx.category} • {tx.type}
                    </p>
                  </div>
                  <p className={tx.type === 'income' ? 'text-positive' : 'text-negative'}>
                    {tx.type === 'income' ? '+' : '-'}
                    {money.format(tx.amount)}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-text">No recent activity to show yet.</p>
          )}
        </article>

        <article className="card notes-card">
          <div className="card-head">
            <h3>Desk Notes</h3>
            <p>Write reminders for next payday, bills, or spending goals</p>
          </div>
          <textarea
            value={deskNote}
            onChange={(event) => setDeskNote(event.target.value)}
            placeholder="Example: renew insurance before 28th, keep groceries under $300 this month"
            rows={5}
          />
        </article>
        </section>

        <section className="visual-grid">
        <article className="card chart-card">
          <div className="card-head">
            <h3>Balance Trend</h3>
            <p>Monthly net movement</p>
          </div>
          {trendData.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={trendData} margin={{ left: 6, right: 6, top: 12, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0d9488" stopOpacity={0.5} />
                    <stop offset="100%" stopColor="#0d9488" stopOpacity={0.06} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#d3d9dd" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fill: '#475569', fontSize: 12 }} axisLine={false} />
                <YAxis
                  tick={{ fill: '#475569', fontSize: 12 }}
                  axisLine={false}
                  tickFormatter={(value) => money.format(value)}
                />
                <Tooltip formatter={(value) => money.format(value)} />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#0d9488"
                  strokeWidth={3}
                  fill="url(#trendGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="empty-text">No trend data yet.</p>
          )}
        </article>

        <article className="card chart-card">
          <div className="card-head">
            <h3>Spending Breakdown</h3>
            <p>Expenses by category</p>
          </div>
          {categoryData.length ? (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => money.format(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="legend">
                {categoryData.map((entry, index) => (
                  <div key={entry.name} className="legend-item">
                    <span style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <p>
                      {entry.name}: {money.format(entry.value)}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="empty-text">No expenses to categorize yet.</p>
          )}
        </article>
        </section>

        <section className="transactions-wrap">
        <article className="card transactions-card">
          <div className="card-head split">
            <div>
              <h3>Transactions</h3>
              <p>Search, filter, sort, group, and export your ledger</p>
            </div>
            <div className="chip-row">
              <span className="chip">Income: {money.format(tableTotals.income)}</span>
              <span className="chip">Expense: {money.format(tableTotals.expense)}</span>
              <span className="chip">Showing: {filteredTransactions.length}</span>
            </div>
          </div>

          <div className="toolbar-grid">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by text, date, category"
            />
            <select value={quickRange} onChange={(event) => setQuickRange(event.target.value)}>
              <option value="all">All Time</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="ytd">Year to Date</option>
            </select>
            <select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              <option value="all">All Types</option>
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
            <select value={monthFilter} onChange={(event) => setMonthFilter(event.target.value)}>
              <option value="all">All Months</option>
              {months.map((month) => (
                <option key={month} value={month}>
                  {monthLabel(month)}
                </option>
              ))}
            </select>
            <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="high">Highest Amount</option>
              <option value="low">Lowest Amount</option>
            </select>
            <input
              type="number"
              min="0"
              step="1"
              value={minAmount}
              onChange={(event) => setMinAmount(event.target.value)}
              placeholder="Min amount"
            />
            <input
              type="number"
              min="0"
              step="1"
              value={maxAmount}
              onChange={(event) => setMaxAmount(event.target.value)}
              placeholder="Max amount"
            />
            <select value={viewMode} onChange={(event) => setViewMode(event.target.value)}>
              <option value="list">List View</option>
              <option value="grouped">Grouped View</option>
            </select>
            <div className="export-group">
              <button type="button" className="ghost" onClick={exportAsCSV}>
                Export CSV
              </button>
              <button type="button" className="ghost" onClick={exportAsJSON}>
                Export JSON
              </button>
            </div>
          </div>

          {viewMode === 'list' && filteredTransactions.length ? (
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Description</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Amount</th>
                    {role === 'admin' ? <th>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{tx.date}</td>
                      <td>{tx.description}</td>
                      <td>{tx.category}</td>
                      <td>
                        <span className={`pill ${tx.type}`}>{tx.type}</span>
                      </td>
                      <td>{money.format(tx.amount)}</td>
                      {role === 'admin' ? (
                        <td className="actions">
                          <button className="ghost" onClick={() => startEdit(tx)}>
                            Edit
                          </button>
                          <button className="ghost danger" onClick={() => deleteTransaction(tx.id)}>
                            Delete
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {viewMode === 'grouped' && groupedByCategory.length ? (
            <div className="group-grid">
              {groupedByCategory.map((group) => (
                <article key={group.category} className="group-card">
                  <h4>{group.category}</h4>
                  <p>{group.count} transaction(s)</p>
                  <p>Income: {money.format(group.income)}</p>
                  <p>Expense: {money.format(group.expense)}</p>
                  <p className={group.net >= 0 ? 'text-positive' : 'text-negative'}>
                    Net: {money.format(group.net)}
                  </p>
                </article>
              ))}
            </div>
          ) : null}

          {!filteredTransactions.length ? (
            <p className="empty-text">No transactions match your current filters.</p>
          ) : null}
        </article>

        <aside className="side-column">
          <article className="card insights-card">
            <div className="card-head">
              <h3>Insights</h3>
              <p>Simple spending intelligence</p>
            </div>
            <ul>
              <li>Highest spending category: {insights.topCategory}</li>
              <li>
                Monthly expense comparison:
                {insights.latestMonth
                  ? ` ${monthLabel(insights.previousMonth || insights.latestMonth)} to ${monthLabel(insights.latestMonth)} is ${insights.monthDirection} ${money.format(Math.abs(insights.monthDiff))}`
                  : ' Add data to compare months.'}
              </li>
              <li>{insights.observation}</li>
            </ul>
          </article>

          <article className="card editor-card">
            <div className="card-head">
              <h3>{editingId ? 'Edit Transaction' : 'Add Transaction'}</h3>
              <p>
                {role === 'admin'
                  ? 'Admin can create and edit records.'
                  : 'Viewer role can inspect data only.'}
              </p>
            </div>

            <form onSubmit={submitTransaction} className={role === 'admin' ? '' : 'disabled'}>
              <label>
                Date
                <input
                  type="date"
                  value={draft.date}
                  onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))}
                  disabled={role !== 'admin'}
                />
              </label>
              <label>
                Description
                <input
                  value={draft.description}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, description: event.target.value }))
                  }
                  placeholder="Salary, groceries, rent..."
                  disabled={role !== 'admin'}
                />
              </label>
              <label>
                Category
                <input
                  value={draft.category}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, category: event.target.value }))
                  }
                  placeholder="Food, Travel, Utilities..."
                  disabled={role !== 'admin'}
                />
              </label>
              <label>
                Type
                <select
                  value={draft.type}
                  onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value }))}
                  disabled={role !== 'admin'}
                >
                  <option value="expense">Expense</option>
                  <option value="income">Income</option>
                </select>
              </label>
              <label>
                Amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={draft.amount}
                  onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))}
                  disabled={role !== 'admin'}
                />
              </label>

              <div className="form-actions">
                <button type="submit" disabled={role !== 'admin'}>
                  {editingId ? 'Save Update' : 'Add Transaction'}
                </button>
                {editingId ? (
                  <button type="button" className="ghost" onClick={resetDraft}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </article>
        </aside>
        </section>
      </main>
    </div>
  )
}

export default App
