import React from 'react';

const STYLES = {
  'In Stock': 'bg-tertiary-fixed-dim/20 text-tertiary-container',
  Adequate: 'bg-tertiary/10 text-tertiary border border-tertiary/20',
  'Low Stock': 'bg-secondary-container text-on-secondary-container',
  'Critical Low': 'bg-error/10 text-error border border-error/20',
  Expired: 'bg-error-container text-on-error-container',
  Active: 'bg-tertiary-fixed text-on-tertiary-fixed',
  Inactive: 'bg-surface-container-highest text-on-surface-variant',
  Delivered: 'bg-tertiary-fixed text-on-tertiary-fixed',
  'In Transit': 'bg-primary-fixed text-on-primary-fixed',
  Pending: 'bg-[#FFFBEB] text-[#B45309] border border-[#FEF3C7]',
  Verified: 'bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7]',
  'On Duty': 'bg-tertiary-container/10 text-tertiary border border-tertiary-container/20',
  'Off Duty': 'bg-surface-variant text-on-surface-variant border border-outline-variant',
  Completed: 'bg-tertiary/10 text-tertiary',
};

export default function StatusBadge({ status }) {
  const cls = STYLES[status] || 'bg-surface-container text-on-surface-variant';
  return (
    <span
      className={`inline-flex items-center gap-xs px-2 py-0.5 rounded-full font-label-caps text-label-caps uppercase tracking-wider ${cls}`}
    >
      {status}
    </span>
  );
}
