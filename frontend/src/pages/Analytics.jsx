import React, { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import Layout from '../components/Layout';
import { getAnalytics } from '../api/analytics';
import { formatCurrency, formatCurrencyCompact } from '../utils/currency';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function Analytics() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const lineRef = useRef(null);
  const lineChart = useRef(null);
  const doughnutRef = useRef(null);
  const doughnutChart = useRef(null);

  useEffect(() => {
    getAnalytics()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.response?.data?.message || 'Failed to load analytics'));
  }, []);

  useEffect(() => {
    if (!data) return;

    if (lineRef.current) {
      if (lineChart.current) lineChart.current.destroy();
      const ctx = lineRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(0, 60, 144, 0.2)');
      gradient.addColorStop(1, 'rgba(0, 60, 144, 0)');

      lineChart.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: MONTHS,
          datasets: [
            {
              label: 'Revenue ($)',
              data: data.monthlyRevenue,
              borderColor: '#003c90',
              backgroundColor: gradient,
              borderWidth: 2,
              pointBackgroundColor: '#ffffff',
              pointBorderColor: '#003c90',
              pointBorderWidth: 2,
              pointRadius: 4,
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { grid: { display: false } },
            y: { grid: { color: '#f2f4f6' }, ticks: { callback: (v) => formatCurrencyCompact(v) } },
          },
        },
      });
    }

    if (doughnutRef.current) {
      if (doughnutChart.current) doughnutChart.current.destroy();
      const entries = Object.entries(data.categoryBreakdown);
      doughnutChart.current = new Chart(doughnutRef.current.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: entries.map(([label]) => label),
          datasets: [
            {
              data: entries.map(([, val]) => val),
              backgroundColor: ['#003c90', '#0f52ba', '#b0c6ff', '#d9e2ff', '#e0e3e5', '#505f76'],
              borderWidth: 2,
              borderColor: '#ffffff',
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16 } } },
        },
      });
    }

    return () => {
      lineChart.current?.destroy();
      doughnutChart.current?.destroy();
    };
  }, [data]);

  return (
    <Layout title="Analytics Overview">
      {error && (
        <div className="bg-error-container text-on-error-container font-body-sm text-body-sm rounded-lg p-md">
          {error}
        </div>
      )}
      {!data ? (
        <div className="text-on-surface-variant font-body-md">Loading analytics...</div>
      ) : (
        <>
          <div>
            <h2 className="font-headline-md text-headline-md text-on-surface">Analytics Overview</h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Performance metrics and clinical data insights.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
            <MetricCard label="Total Revenue" value={formatCurrency(data.totalRevenue)} icon="payments" />
            <MetricCard label="Scripts Filled" value={data.scriptsFilled} icon="prescriptions" />
            <MetricCard label="Avg. Transaction" value={formatCurrency(data.avgTransaction)} icon="receipt_long" />
            <MetricCard label="Stock Turnover" value={`${data.stockTurnover}x`} icon="autorenew" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
            <div className="bg-surface rounded-lg border border-outline-variant p-md lg:col-span-2 flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Revenue Trend</h3>
              <div className="flex-1 relative min-h-[300px]">
                <canvas ref={lineRef}></canvas>
              </div>
            </div>
            <div className="bg-surface rounded-lg border border-outline-variant p-md flex flex-col">
              <h3 className="font-headline-sm text-headline-sm text-on-surface mb-md">Sales by Category</h3>
              <div className="flex-1 relative min-h-[300px]">
                {Object.keys(data.categoryBreakdown).length === 0 ? (
                  <p className="font-body-sm text-body-sm text-on-surface-variant">No sales data yet.</p>
                ) : (
                  <canvas ref={doughnutRef}></canvas>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-lg border border-outline-variant overflow-hidden">
            <div className="p-md border-b border-outline-variant bg-surface-bright">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Top Selling Medications</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-low border-b border-outline-variant font-label-caps text-label-caps text-on-surface-variant uppercase">
                    <th className="p-sm pl-md font-normal">Medication Name</th>
                    <th className="p-sm font-normal">Units Sold</th>
                    <th className="p-sm pr-md font-normal">Revenue</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm">
                  {data.topMedications.length === 0 && (
                    <tr>
                      <td colSpan="3" className="p-md font-body-sm text-on-surface-variant">
                        No sales recorded yet.
                      </td>
                    </tr>
                  )}
                  {data.topMedications.map((med) => (
                    <tr key={med.name} className="border-b border-outline-variant hover:bg-[#F0F7FF] transition-colors">
                      <td className="p-sm pl-md text-on-surface font-bold">{med.name}</td>
                      <td className="p-sm font-data-mono text-data-mono">{med.unitsSold}</td>
                      <td className="p-sm pr-md font-data-mono text-data-mono">{formatCurrency(med.revenue)}</td>
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

function MetricCard({ label, value, icon }) {
  return (
    <div className="bg-surface rounded-lg border border-outline-variant p-md flex flex-col gap-sm">
      <div className="flex justify-between items-start">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase">{label}</span>
        <span className="material-symbols-outlined text-primary text-[20px]">{icon}</span>
      </div>
      <span className="font-display-lg text-display-lg font-data-mono tracking-tight">{value}</span>
    </div>
  );
}
