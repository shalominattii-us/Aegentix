import React, { useState } from 'react';
import { Download } from 'lucide-react';
import { downloadCsv } from '../api';

export default function ExportButton({ endpoint, filename, params = {}, label = 'Export CSV', onError }) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    setBusy(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      await downloadCsv(endpoint, filename ? filename.replace('.csv', `-${stamp}.csv`) : `prosurance-export-${stamp}.csv`, params);
      if (onError) onError('');
    } catch (err) {
      if (onError) onError(err.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="flex items-center gap-1.5 px-3 py-1.5 border border-[#1E2A44] text-[#8A9AB4] hover:text-[#2DD4BF] hover:border-[#2DD4BF]/50 text-xs rounded-lg transition-colors disabled:opacity-50 font-mono"
    >
      <Download className="w-3.5 h-3.5" />
      <span>{busy ? 'Exporting...' : label}</span>
    </button>
  );
}
