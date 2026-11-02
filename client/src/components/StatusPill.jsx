import React from 'react';

export default function StatusPill({ status, type = 'generic' }) {
  if (!status) return null;

  const s = String(status).toLowerCase();

  let colorClasses = 'bg-[#1E2A44] text-[#8A9AB4] border-[#1E2A44]';

  // Specific status mapping
  if (['verified', 'placed', 'active', 'paid', 'completed'].includes(s)) {
    colorClasses = 'bg-[#34D399]/10 text-[#34D399] border-[#34D399]/30';
  } else if (['pending', 'expiring', 'on_hold', 'screened', 'client_review', 'interview', 'offer', 'invoiced', 'prospect', 'high'].includes(s)) {
    colorClasses = 'bg-[#FBBF24]/10 text-[#FBBF24] border-[#FBBF24]/30';
  } else if (['expired', 'rejected', 'do_not_contact', 'closed', 'cancelled', 'urgent'].includes(s)) {
    colorClasses = 'bg-[#FB7185]/10 text-[#FB7185] border-[#FB7185]/30';
  } else if (['submitted', 'open', 'sourced'].includes(s)) {
    colorClasses = 'bg-[#2DD4BF]/10 text-[#2DD4BF] border-[#2DD4BF]/30';
  } else if (['passive', 'draft', 'withdrawn', 'low', 'normal'].includes(s)) {
    colorClasses = 'bg-[#8A9AB4]/10 text-[#8A9AB4] border-[#8A9AB4]/30';
  }

  const label = s.replace(/_/g, ' ');

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border uppercase tracking-wide tabular-nums ${colorClasses}`}>
      {label}
    </span>
  );
}
