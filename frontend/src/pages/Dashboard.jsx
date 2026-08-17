import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { getDashboard } from '../api/dashboard';
import { formatCurrency } from '../utils/currency';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const canvasRef = useRef(null);
  const chartRef = useRef(null);

  useEffect(() => {
    getDashboard()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load dashboard'));
  }, []);

  useEffect(() => {
    if (!data || !canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const ctx = canvasRef.current.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 60, 144, 0.2)');
    gradient.addColorStop(1, 'rgba(0, 60, 144, 0)');

    chartRef.current = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.trend.labels,
        datasets: [
          {
            label: 'Sales Revenue ($)',
            data: data.trend.data,
            backgroundColor: '#003c90',
            borderRadius: 4,
            maxBarThickness: 40,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2d3133',
            padding: 12,
            cornerRadius: 4,
            displayColors: false,
            callbacks: { label: (c) => formatCurrency(c.parsed.y) },
          },
        },
        scales: {
          y: { beginAtZero: true, grid: { color: '#e0e3e5', borderDash: [4, 4] }, ticks: { color: '#737784' } },
          x: { grid: { display: false }, ticks: { color: '#737784' } },
        },
      },
    });

    return () => chartRef.current?.destroy();
  }, [data]);

  return (
    <Layout title="Dashboard Overview">
      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}

      {!data ? (
        <div className="text-on-surface-variant font-body-md">Loading dashboard...</div>
      ) : (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-md">
            <div>
              <h2 className="font-display-lg text-display-lg text-on-background">Dashboard Overview</h2>
              <p className="font-body-md text-body-md text-on-surface-variant mt-xs">
                Real-time inventory and sales metrics for today.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter">
            <StatCard
              label="Total Stock Value"
              value={formatCurrency(data.totalStockValue)}
              icon="inventory_2"
              tint="primary"
            />
            <StatCard
              label="Low Stock Alerts"
              value={data.lowStockCount}
              icon="warning"
              tint="error"
              trendLabel="needs attention"
            />
            <StatCard
              label="Expiring < 30 Days"
              value={data.expiringSoon}
              icon="event_busy"
              tint="warning"
              trendLabel="products expiring soon"
            />
            <StatCard
              label="Today's Sales"
              value={formatCurrency(data.todaysRevenue)}
              icon="payments"
              tint="tertiary"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
            <div className="lg:col-span-2 bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col">
              <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
                <h3 className="font-headline-sm text-headline-sm text-on-background">Revenue Trends</h3>
              </div>
              <div className="p-md flex-1 relative min-h-[300px]">
                <canvas ref={canvasRef}></canvas>
              </div>
            </div>

            <div className="bg-surface rounded-xl border border-outline-variant shadow-sm flex flex-col">
              <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low rounded-t-xl">
                <h3 className="font-headline-sm text-headline-sm text-on-background">Recent Transactions</h3>
              </div>
              <div className="flex-1 overflow-y-auto">
                {data.recentTransactions.length === 0 && (
                  <p className="p-md font-body-sm text-body-sm text-on-surface-variant">No transactions yet.</p>
                )}
                <ul className="divide-y divide-outline-variant">
                  {data.recentTransactions.map((tx) => (
                    <li key={tx.id} className="p-md hover:bg-[#F0F7FF] transition-colors">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-body-md text-body-md font-medium text-on-background">
                            {tx.items[0]?.name}
                            {tx.items.length > 1 ? ` +${tx.items.length - 1} more` : ''}
                          </p>
                          <p className="font-body-sm text-body-sm text-on-surface-variant">{tx.txnNumber}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-data-mono text-data-mono text-on-background">
                            {formatCurrency(tx.total)}
                          </p>
                          <p className="font-body-sm text-body-sm text-tertiary">{tx.status}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-xl border border-outline-variant shadow-sm overflow-hidden">
            <div className="p-md border-b border-outline-variant flex justify-between items-center bg-surface-container-low">
              <h3 className="font-headline-sm text-headline-sm text-on-background">Priority Restock List</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant">
                    <th className="font-label-caps text-label-caps text-on-surface-variant uppercase p-md py-sm">Item / NDC</th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant uppercase p-md py-sm">Category</th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant uppercase p-md py-sm text-right">Current Qty</th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant uppercase p-md py-sm text-right">Min Level</th>
                    <th className="font-label-caps text-label-caps text-on-surface-variant uppercase p-md py-sm">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {data.restockList.length === 0 && (
                    <tr>
                      <td colSpan="5" className="p-md font-body-sm text-body-sm text-on-surface-variant">
                        Nothing needs restocking right now.
                      </td>
                    </tr>
                  )}
                  {data.restockList.map((p) => (
                    <tr key={p.id} className="hover:bg-[#F0F7FF] transition-colors">
                      <td className="p-md">
                        <p className="font-body-md text-body-md font-medium text-on-background">{p.name}</p>
                        <p className="font-data-mono text-data-mono text-xs text-on-surface-variant">{p.ndc}</p>
                      </td>
                      <td className="p-md font-body-sm text-body-sm text-on-surface-variant">{p.category}</td>
                      <td className="p-md font-data-mono text-data-mono text-right text-error font-bold">
                        {p.quantity}
                      </td>
                      <td className="p-md font-data-mono text-data-mono text-right">{p.minLevel}</td>
                      <td className="p-md">
                        <StatusBadge status={p.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </Layout>
  );
}
