import React from 'react';

export default function StatCard({ label, value, icon, trend, trendLabel, trendUp = true, tint = 'primary' }) {
  const tintClasses = {
    primary: 'bg-primary/5 group-hover:bg-primary/10 text-primary bg-primary-container/20',
    error: 'bg-error/5 group-hover:bg-error/10 text-on-error-container bg-error-container',
    warning: 'bg-[#eab308]/5 group-hover:bg-[#eab308]/10 text-[#854d0e] bg-[#fef08a]',
    tertiary: 'bg-tertiary/5 group-hover:bg-tertiary/10 text-tertiary bg-tertiary-container/30',
  }[tint];

  const [blobClass, , iconTextClass, iconBgClass] = tintClasses.split(' ');

  return (
    <div className="bg-surface rounded-xl p-md border border-outline-variant shadow-sm relative overflow-hidden group">
      <div className={`absolute -right-4 -top-4 w-24 h-24 rounded-full blur-xl transition-colors ${blobClass}`} />
      <div className="flex justify-between items-start mb-md relative z-10">
        <div>
          <p className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
            {label}
          </p>
          <h3 className="font-headline-md text-headline-md text-on-background mt-xs font-data-mono text-data-mono text-[24px]">
            {value}
          </h3>
        </div>
        {icon && (
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${iconBgClass} ${iconTextClass}`}>
            <span className="material-symbols-outlined">{icon}</span>
          </div>
        )}
      </div>
      {trendLabel && (
        <div className="flex items-center gap-xs relative z-10">
          {trend && (
            <>
              <span className={`material-symbols-outlined text-[16px] ${trendUp ? 'text-tertiary' : 'text-error'}`}>
                {trendUp ? 'trending_up' : 'trending_down'}
              </span>
              <span className={`font-body-sm text-body-sm font-medium ${trendUp ? 'text-tertiary' : 'text-error'}`}>
                {trend}
              </span>
            </>
          )}
          <span className="font-body-sm text-body-sm text-outline">{trendLabel}</span>
        </div>
      )}
    </div>
  );
}
