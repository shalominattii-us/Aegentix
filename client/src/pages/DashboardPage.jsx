import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatCurrency, formatRelativeTime, formatDate, calculateDaysLeft } from '../utils/formatters';
import {
  Briefcase,
  Users,
  Send,
  CheckCircle2,
  DollarSign,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
  Activity,
} from 'lucide-react';

export default function DashboardPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = async () => {
    setLoading(true);
    setError('');
    try {
      const summary = await api.get('/dashboard/summary');
      setData(summary);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard summary.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();

    const handleSubmissionCreated = () => loadSummary();
    window.addEventListener('submission-created', handleSubmissionCreated);
    return () => window.removeEventListener('submission-created', handleSubmissionCreated);
  }, []);

  if (loading) {
    return (
      <Layout pageTitle="Ops Overview">
        <LoadingState message="Connecting to Prosurance telemetry..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Ops Overview">
        <ErrorBanner message={error} onRetry={loadSummary} />
      </Layout>
    );
  }

  const kpis = data?.kpis || {};
  const pipeline = data?.pipeline || [];
  const jobsByStatus = data?.jobs_by_status || [];
  const expiringCredentials = data?.expiring_credentials || [];
  const recentActivity = data?.recent_activity || [];

  // Find max count in pipeline for proportional bars
  const maxPipelineCount = Math.max(...pipeline.map((p) => p.count), 1);

  return (
    <Layout pageTitle="Ops Overview">
      <div className="space-y-6">
        {/* KPI Grid (6 Tiles) */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Tile 1: Open Jobs */}
          <div className="panel-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8A9AB4] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Open Jobs</span>
              <Briefcase className="w-4 h-4 text-[#2DD4BF]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums">
              {kpis.open_jobs ?? 0}
            </div>
            <Link to="/jobs" className="text-[10px] text-[#2DD4BF] hover:underline mt-2 inline-flex items-center gap-0.5 font-medium">
              <span>View jobs</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tile 2: Active Candidates */}
          <div className="panel-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8A9AB4] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Active Clinicians</span>
              <Users className="w-4 h-4 text-[#2DD4BF]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums">
              {kpis.active_candidates ?? 0}
            </div>
            <Link to="/candidates" className="text-[10px] text-[#2DD4BF] hover:underline mt-2 inline-flex items-center gap-0.5 font-medium">
              <span>View candidates</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tile 3: Submissions This Week */}
          <div className="panel-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8A9AB4] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Submissions 7d</span>
              <Send className="w-4 h-4 text-[#2DD4BF]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums">
              {kpis.submissions_this_week ?? 0}
            </div>
            <Link to="/pipeline" className="text-[10px] text-[#2DD4BF] hover:underline mt-2 inline-flex items-center gap-0.5 font-medium">
              <span>Pipeline view</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tile 4: Placements MTD */}
          <div className="panel-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8A9AB4] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Placements MTD</span>
              <CheckCircle2 className="w-4 h-4 text-[#34D399]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums">
              {kpis.placements_mtd ?? 0}
            </div>
            <Link to="/placements" className="text-[10px] text-[#34D399] hover:underline mt-2 inline-flex items-center gap-0.5 font-medium">
              <span>Placement ledger</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Tile 5: Revenue MTD */}
          <div className="panel-card p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[#8A9AB4] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Revenue MTD</span>
              <DollarSign className="w-4 h-4 text-[#34D399]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums">
              {formatCurrency(kpis.revenue_mtd)}
            </div>
            <span className="text-[10px] text-[#8A9AB4] mt-2 font-mono">Bill rate margin</span>
          </div>

          {/* Tile 6: Expiring Creds 30d */}
          <div className="panel-card p-3.5 flex flex-col justify-between border-[#FBBF24]/30 bg-[#FBBF24]/5">
            <div className="flex items-center justify-between text-[#FBBF24] mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider">Expiring 30d</span>
              <AlertTriangle className="w-4 h-4 text-[#FBBF24]" />
            </div>
            <div className="text-xl font-bold font-mono text-[#FBBF24] tabular-nums">
              {kpis.expiring_credentials_30d ?? 0}
            </div>
            <Link to="/compliance" className="text-[10px] text-[#FBBF24] hover:underline mt-2 inline-flex items-center gap-0.5 font-medium">
              <span>Compliance audit</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Section: Pipeline Funnel + Requisition Status */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pipeline Funnel Bars */}
          <div className="lg:col-span-2 panel-card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-[#1E2A44] pb-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                Placement Pipeline Distribution
              </h2>
              <Link to="/pipeline" className="text-xs text-[#2DD4BF] hover:underline font-medium">
                Open Kanban →
              </Link>
            </div>

            {pipeline.length === 0 ? (
              <EmptyState title="No active pipeline data" />
            ) : (
              <div className="space-y-2.5">
                {pipeline.map((item) => {
                  const pct = Math.round((item.count / maxPipelineCount) * 100);
                  return (
                    <div key={item.stage} className="flex items-center gap-3 text-xs">
                      <div className="w-28 font-mono text-[11px] uppercase text-[#8A9AB4] truncate">
                        {item.stage.replace(/_/g, ' ')}
                      </div>
                      <div className="flex-1 h-5 bg-[#0B1220] rounded border border-[#1E2A44] overflow-hidden p-0.5 flex items-center">
                        <div
                          className="h-full bg-[#2DD4BF] rounded-xs transition-all duration-500"
                          style={{ width: `${Math.max(pct, 3)}%` }}
                        />
                      </div>
                      <div className="w-10 text-right font-mono text-[#E6EDF7] font-semibold tabular-nums">
                        {item.count}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Jobs by Status */}
          <div className="panel-card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-[#1E2A44] pb-3">
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                Requisition Breakdown
              </h2>
              <Link to="/jobs" className="text-xs text-[#2DD4BF] hover:underline font-medium">
                All Jobs →
              </Link>
            </div>

            <div className="space-y-2">
              {jobsByStatus.map((j) => (
                <div key={j.status} className="flex items-center justify-between p-2 rounded bg-[#0B1220] border border-[#1E2A44]">
                  <StatusPill status={j.status} />
                  <span className="font-mono text-sm font-bold text-[#E6EDF7] tabular-nums">
                    {j.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section: Expiring Credentials & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Expiring Credentials Table */}
          <div className="panel-card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-[#1E2A44] pb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#FBBF24]" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                  Action Required: Expiring Credentials
                </h2>
              </div>
              <Link to="/compliance" className="text-xs text-[#FBBF24] hover:underline font-medium">
                View all →
              </Link>
            </div>

            {expiringCredentials.length === 0 ? (
              <div className="text-xs text-[#8A9AB4] text-center py-6">
                All clinician credentials are valid and verified.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                      <th className="pb-2">Clinician</th>
                      <th className="pb-2">Credential</th>
                      <th className="pb-2">Expires</th>
                      <th className="pb-2 text-right">Days Left</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1E2A44]">
                    {expiringCredentials.slice(0, 5).map((c) => {
                      const days = c.days_left ?? calculateDaysLeft(c.expires_on);
                      const isUrgent = days <= 15;
                      return (
                        <tr key={c.id} className="hover:bg-[#16233B]/50 transition-colors">
                          <td className="py-2.5 font-medium text-[#E6EDF7]">
                            <Link to={`/candidates/${c.clinician_id}`} className="hover:text-[#2DD4BF]">
                              {c.clinician_name}
                            </Link>
                          </td>
                          <td className="py-2.5 text-[#8A9AB4]">{c.name}</td>
                          <td className="py-2.5 text-[#8A9AB4] font-mono">{formatDate(c.expires_on)}</td>
                          <td className="py-2.5 text-right font-mono">
                            <span
                              className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isUrgent
                                  ? 'bg-[#FB7185]/20 text-[#FB7185] border border-[#FB7185]/30'
                                  : 'bg-[#FBBF24]/20 text-[#FBBF24] border border-[#FBBF24]/30'
                              }`}
                            >
                              {days}d
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Recent Activity Audit Feed */}
          <div className="panel-card p-5">
            <div className="flex items-center justify-between mb-4 border-b border-[#1E2A44] pb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#2DD4BF]" />
                <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                  Audit Telemetry
                </h2>
              </div>
            </div>

            {recentActivity.length === 0 ? (
              <div className="text-xs text-[#8A9AB4] text-center py-6">No recent ops logs.</div>
            ) : (
              <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
                {recentActivity.slice(0, 7).map((act) => (
                  <div key={act.id} className="p-2.5 rounded bg-[#0B1220] border border-[#1E2A44] flex items-start justify-between gap-3 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-medium text-[#E6EDF7] truncate">{act.summary}</div>
                      <div className="text-[10px] font-mono text-[#8A9AB4] truncate">
                        By {act.actor_email || 'System'}
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-[#8A9AB4] shrink-0">
                      {formatRelativeTime(act.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
