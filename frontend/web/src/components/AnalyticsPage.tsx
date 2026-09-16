import { useState } from 'react';
import { useAdminAnalytics } from '../hooks/useAdmin';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
  BarChart, Bar, Legend,
} from 'recharts';

interface AnalyticsPageProps {
  onBack?: () => void;
}

const PERIODS = [
  { key: '7d', label: '7 Days' },
  { key: '30d', label: '30 Days' },
  { key: '90d', label: '90 Days' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  CONFIRMED: '#3b82f6',
  PROCESSING: '#8b5cf6',
  SHIPPED: '#06b6d4',
  DELIVERED: '#22c55e',
  CANCELLED: '#ef4444',
};

export function AnalyticsPage({ onBack }: AnalyticsPageProps) {
  const [period, setPeriod] = useState<string>('30d');
  const { data, isLoading, isError, error, refetch } = useAdminAnalytics({ period });

  const revenueFormatter = (value: number) => `₹${(value / 100).toLocaleString('en-IN')}`;

  return (
    <main className="admin-main">
      <header className="page-header">
        <div>
          <p className="eyebrow">ANALYTICS</p>
          <h1>Analytics</h1>
        </div>
        <button type="button" className="plain" onClick={onBack}>
          ← Back to Dashboard
        </button>
      </header>

      {/* Period Filter */}
      <section className="admin-filters" aria-label="Period filter">
        <div className="filter-row">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              type="button"
              className={`plain ${period === p.key ? 'primary' : ''}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
      </section>

      {isLoading && (
        <div className="dashboard-loading">
          <div className="spinner" aria-hidden="true"></div>
          <p>Loading analytics…</p>
        </div>
      )}

      {isError && (
        <div className="dashboard-error" role="alert">
          <p>Failed to load analytics: {error}</p>
          <button type="button" className="primary" onClick={refetch}>Retry</button>
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {/* Summary Cards */}
          <section className="metrics-grid" aria-label="Analytics summary" style={{ marginBottom: '32px' }}>
            <article className="metric-card">
              <span className="metric-label">Total Revenue</span>
              <strong className="metric-value">{revenueFormatter(data.totalRevenue)}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Total Orders</span>
              <strong className="metric-value">{data.totalOrders.toLocaleString()}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Avg Order Value</span>
              <strong className="metric-value">{revenueFormatter(data.averageOrderValue)}</strong>
            </article>
            <article className="metric-card">
              <span className="metric-label">Products Sold</span>
              <strong className="metric-value">{data.topProducts.reduce((sum, p) => sum + p.unitsSold, 0).toLocaleString()}</strong>
            </article>
          </section>

          {/* Revenue Trend */}
          <section className="dashboard-section" aria-label="Revenue trend" style={{ marginBottom: '32px' }}>
            <h2>Revenue Trend</h2>
            <div style={{ height: '300px', width: '100%' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                  <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={revenueFormatter} tick={{ fontSize: 12 }} />
                  <Tooltip formatter={(value: number) => [revenueFormatter(value), 'Revenue']} />
                  <Line type="monotone" dataKey="revenueCents" stroke="var(--brand-indigo)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '32px' }}>
            {/* Order Status Distribution */}
            <section className="dashboard-section" aria-label="Order status distribution">
              <h2>Order Status</h2>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.statusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    >
                      {data.statusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? '#6b7280'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </section>

            {/* Top Products */}
            <section className="dashboard-section" aria-label="Top products">
              <h2>Top Products</h2>
              <div style={{ height: '280px', width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.topProducts.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
                    <XAxis type="number" tickFormatter={revenueFormatter} tick={{ fontSize: 11 }} />
                    <YAxis dataKey="productTitle" type="category" width={120} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number, name: string) => {
                      if (name === 'unitsSold') return [value, 'Units Sold'];
                      return [revenueFormatter(value), 'Revenue'];
                    }} />
                    <Legend />
                    <Bar dataKey="unitsSold" name="Units Sold" fill="var(--brand-indigo)" />
                    <Bar dataKey="revenueCents" name="Revenue" fill="var(--brand-teal)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}
