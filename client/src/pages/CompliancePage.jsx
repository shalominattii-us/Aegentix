import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatDate, formatRelativeTime, calculateDaysLeft } from '../utils/formatters';
import ExportButton from '../components/ExportButton';
import { ShieldCheck, ShieldAlert, Activity, CheckCircle, FileText } from 'lucide-react';

export default function CompliancePage() {
  const [daysFilter, setDaysFilter] = useState(30);
  const [expiringCreds, setExpiringCreds] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingCreds, setLoadingCreds] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(true);
  const [error, setError] = useState('');

  const loadExpiring = async () => {
    setLoadingCreds(true);
    try {
      const res = await api.get(`/compliance/expiring?days=${daysFilter}`);
      setExpiringCreds(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch expiring credentials.');
    } finally {
      setLoadingCreds(false);
    }
  };

  const loadAudit = async () => {
    setLoadingAudit(true);
    try {
      const res = await api.get('/compliance/audit?limit=50');
      setAuditLogs(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch audit trail.');
    } finally {
      setLoadingAudit(false);
    }
  };

  useEffect(() => {
    loadExpiring();
  }, [daysFilter]);

  useEffect(() => {
    loadAudit();
  }, []);

  const handleVerifyCredential = async (credId) => {
    try {
      await api.patch(`/credentials/${credId}`, { status: 'verified' });
      loadExpiring();
      loadAudit();
    } catch (err) {
      alert(err.message || 'Failed to verify credential.');
    }
  };

  return (
    <Layout
      pageTitle="Credential Compliance"
      actions={
        <ExportButton
          endpoint="/exports/compliance.csv"
          filename={`prosurance-compliance-${daysFilter}d.csv`}
          params={{ days: daysFilter }}
          onError={setError}
        />
      }
    >
      <div className="space-y-6">
        {error && <ErrorBanner message={error} onRetry={() => { loadExpiring(); loadAudit(); }} />}

        {/* Section 1: Expiring Credentials */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-[#1E2A44] pb-3">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FBBF24]" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                Expiring Credentials Watchlist
              </h2>
            </div>

            {/* Days Filter Tabs */}
            <div className="flex items-center gap-1 bg-[#0B1220] p-1 rounded-lg border border-[#1E2A44]">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => setDaysFilter(d)}
                  className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                    daysFilter === d
                      ? 'bg-[#2DD4BF] text-[#0B1220] font-bold'
                      : 'text-[#8A9AB4] hover:text-[#E6EDF7]'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>

          {loadingCreds ? (
            <LoadingState message="Scanning credential expirations..." />
          ) : expiringCreds.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-8">
              No credentials expiring within the next {daysFilter} days.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Clinician</th>
                    <th className="pb-2">Credential Name</th>
                    <th className="pb-2">Type / License #</th>
                    <th className="pb-2">State</th>
                    <th className="pb-2">Expires Date</th>
                    <th className="pb-2">Urgency</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {expiringCreds.map((cred) => {
                    const days = cred.days_left ?? calculateDaysLeft(cred.expires_on);
                    const isRose = days !== null && days <= 15;

                    return (
                      <tr key={cred.id} className="hover:bg-[#16233B]/50 transition-colors">
                        <td className="py-2.5 font-semibold text-[#E6EDF7]">
                          <Link to={`/candidates/${cred.clinician_id}`} className="hover:text-[#2DD4BF]">
                            {cred.clinician_name}
                          </Link>
                        </td>
                        <td className="py-2.5 text-[#E6EDF7]">{cred.name}</td>
                        <td className="py-2.5 text-[#8A9AB4]">
                          <span className="uppercase text-[10px] font-mono block">{cred.type}</span>
                          <span className="font-mono text-[#E6EDF7]">{cred.number || '-'}</span>
                        </td>
                        <td className="py-2.5 font-mono text-[#E6EDF7]">{cred.state || '-'}</td>
                        <td className="py-2.5 font-mono text-[#8A9AB4]">{formatDate(cred.expires_on)}</td>
                        <td className="py-2.5 font-mono">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                              isRose
                                ? 'bg-[#FB7185]/20 text-[#FB7185] border-[#FB7185]/30'
                                : 'bg-[#FBBF24]/20 text-[#FBBF24] border-[#FBBF24]/30'
                            }`}
                          >
                            {days}d left
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <button
                            onClick={() => handleVerifyCredential(cred.id)}
                            className="px-2.5 py-1 bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30 hover:bg-[#34D399]/20 text-[10px] font-bold rounded"
                          >
                            Re-Verify
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Audit Log Table */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1E2A44] pb-3">
            <Activity className="w-4 h-4 text-[#2DD4BF]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
              HIPAA-Style System Audit Trail
            </h2>
          </div>

          {loadingAudit ? (
            <LoadingState message="Loading audit telemetry logs..." />
          ) : auditLogs.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">No audit records found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Timestamp</th>
                    <th className="pb-2">Actor Email</th>
                    <th className="pb-2">Action</th>
                    <th className="pb-2">Entity ID</th>
                    <th className="pb-2">Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#16233B]/50 transition-colors font-mono">
                      <td className="py-2.5 text-[#8A9AB4] text-[11px]">
                        {formatRelativeTime(log.created_at)}
                      </td>
                      <td className="py-2.5 text-[#E6EDF7] text-[11px]">{log.actor_email}</td>
                      <td className="py-2.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#16233B] text-[#2DD4BF] border border-[#1E2A44] text-[10px] uppercase font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-2.5 text-[#8A9AB4] text-[11px]">
                        {log.entity}:{log.entity_id}
                      </td>
                      <td className="py-2.5 text-[#E6EDF7] font-sans text-xs">
                        {log.summary}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
