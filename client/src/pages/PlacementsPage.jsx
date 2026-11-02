import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import ExportButton from '../components/ExportButton';
import { formatCurrency, formatDate } from '../utils/formatters';
import { CheckCircle2, Plus, DollarSign, Clock, TrendingUp, Building2, User } from 'lucide-react';

export default function PlacementsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [form, setForm] = useState({
    submission_id: '',
    start_date: '2026-11-10',
    bill_rate: 135,
    pay_rate: 95,
    hours: 160,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadPlacements = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/placements');
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to fetch placements ledger.');
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissionsForPlacement = async () => {
    try {
      // Submissions in offer or client_review or submitted stages can be placed
      const res = await api.get('/submissions', { limit: 100 });
      const eligible = (res.items || []).filter((s) => s.stage !== 'placed' && s.stage !== 'rejected' && s.stage !== 'withdrawn');
      setSubmissions(eligible);
      if (eligible.length > 0 && !form.submission_id) {
        setForm((f) => ({ ...f, submission_id: eligible[0].id }));
      }
    } catch (err) {
      console.error('Failed to load eligible submissions', err);
    }
  };

  useEffect(() => {
    loadPlacements();
  }, []);

  const handlePlacementUpdate = async (placement, payload) => {
    setUpdatingId(placement.id);
    setError('');
    try {
      await api.patch(`/placements/${placement.id}`, payload);
      await loadPlacements();
    } catch (err) {
      setError(err.message || 'Failed to update placement.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleOpenModal = () => {
    loadSubmissionsForPlacement();
    setIsModalOpen(true);
  };

  const handleCreatePlacement = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/placements', {
        submission_id: Number(form.submission_id),
        start_date: form.start_date,
        bill_rate: Number(form.bill_rate),
        pay_rate: Number(form.pay_rate),
        hours: Number(form.hours),
      });
      setIsModalOpen(false);
      loadPlacements();
    } catch (err) {
      setFormError(err.message || 'Failed to record placement.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Active Placements">
        <LoadingState message="Loading placements revenue ledger..." />
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout pageTitle="Active Placements">
        <ErrorBanner message={error} onRetry={loadPlacements} />
      </Layout>
    );
  }

  const items = data?.items || [];
  const totals = data?.totals || {};

  return (
    <Layout
      pageTitle="Active Placements"
      actions={
        <ExportButton endpoint="/exports/placements.csv" filename="prosurance-placements.csv" onError={setError} />
      }
    >
      <div className="space-y-6">
        {/* Totals Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="panel-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#8A9AB4] uppercase">Active Placements</div>
              <div className="text-xl font-bold font-mono text-[#34D399] tabular-nums mt-1">
                {totals.active ?? 0}
              </div>
            </div>
            <CheckCircle2 className="w-6 h-6 text-[#34D399]" />
          </div>

          <div className="panel-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#8A9AB4] uppercase">Total Hours Logged</div>
              <div className="text-xl font-bold font-mono text-[#E6EDF7] tabular-nums mt-1">
                {totals.hours ?? 0} hrs
              </div>
            </div>
            <Clock className="w-6 h-6 text-[#2DD4BF]" />
          </div>

          <div className="panel-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#8A9AB4] uppercase">Gross Revenue MTD</div>
              <div className="text-xl font-bold font-mono text-[#2DD4BF] tabular-nums mt-1">
                {formatCurrency(totals.revenue)}
              </div>
            </div>
            <DollarSign className="w-6 h-6 text-[#2DD4BF]" />
          </div>

          <div className="panel-card p-4 flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono text-[#8A9AB4] uppercase">Fees Pending Invoiced</div>
              <div className="text-xl font-bold font-mono text-[#FBBF24] tabular-nums mt-1">
                {formatCurrency(totals.fees_pending)}
              </div>
            </div>
            <TrendingUp className="w-6 h-6 text-[#FBBF24]" />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-semibold uppercase text-[#8A9AB4]">
            Placement Ledger Records ({items.length})
          </h2>
          <button
            onClick={handleOpenModal}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Record Placement</span>
          </button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            title="No placements recorded"
            description="Record a completed offer submission to track clinician hours and revenue."
            actionLabel="Record Placement"
            onAction={handleOpenModal}
          />
        ) : (
          <div className="panel-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B1220]/60 text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="py-3 px-4">Clinician</th>
                    <th className="py-3 px-4">Requisition & Employer</th>
                    <th className="py-3 px-4">Start / End Date</th>
                    <th className="py-3 px-4">Bill Rate</th>
                    <th className="py-3 px-4">Pay Rate</th>
                    <th className="py-3 px-4">Spread / Margin</th>
                    <th className="py-3 px-4">Hours</th>
                    <th className="py-3 px-4">Fee Amount</th>
                    <th className="py-3 px-4">Fee Status</th>
                    <th className="py-3 px-4">Placement Status</th>
                    <th className="py-3 px-4 text-right">Close-Out</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {items.map((p) => {
                    const margin = (p.bill_rate || 0) - (p.pay_rate || 0);

                    return (
                      <tr key={p.id} className="hover:bg-[#16233B]/50 transition-colors font-mono">
                        <td className="py-3 px-4 font-sans font-semibold text-[#E6EDF7]">
                          <Link to={`/candidates/${p.clinician_id}`} className="hover:text-[#2DD4BF]">
                            {p.clinician_name}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-sans">
                          <Link to={`/jobs/${p.job_id}`} className="text-[#E6EDF7] hover:underline block font-medium">
                            {p.job_title}
                          </Link>
                          <span className="text-[10px] text-[#8A9AB4]">{p.employer_name}</span>
                        </td>
                        <td className="py-3 px-4 text-[#8A9AB4]">
                          {formatDate(p.start_date)}
                          {p.end_date && ` - ${formatDate(p.end_date)}`}
                        </td>
                        <td className="py-3 px-4 text-[#2DD4BF] font-bold tabular-nums">
                          {formatCurrency(p.bill_rate)}/hr
                        </td>
                        <td className="py-3 px-4 text-[#E6EDF7] tabular-nums">
                          {formatCurrency(p.pay_rate)}/hr
                        </td>
                        <td className="py-3 px-4 text-[#34D399] font-bold tabular-nums">
                          +{formatCurrency(margin)}/hr
                        </td>
                        <td className="py-3 px-4 text-[#E6EDF7] tabular-nums">
                          {p.hours || 0} hrs
                        </td>
                        <td className="py-3 px-4 text-[#34D399] font-bold tabular-nums">
                          {formatCurrency(p.fee_amount)}
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={p.fee_status} />
                        </td>
                        <td className="py-3 px-4">
                          <StatusPill status={p.status} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5 font-sans">
                            {p.fee_status === 'pending' && (
                              <button
                                onClick={() => handlePlacementUpdate(p, { fee_status: 'invoiced' })}
                                disabled={updatingId === p.id}
                                className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#FBBF24] hover:border-[#FBBF24]/50 transition-colors disabled:opacity-50"
                              >
                                Invoice
                              </button>
                            )}
                            {p.fee_status === 'invoiced' && (
                              <button
                                onClick={() => handlePlacementUpdate(p, { fee_status: 'paid' })}
                                disabled={updatingId === p.id}
                                className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#34D399] hover:border-[#34D399]/50 transition-colors disabled:opacity-50"
                              >
                                Mark Paid
                              </button>
                            )}
                            {p.status === 'active' && (
                              <button
                                onClick={() => handlePlacementUpdate(p, { status: 'completed', end_date: new Date().toISOString().slice(0, 10) })}
                                disabled={updatingId === p.id}
                                className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#2DD4BF] hover:border-[#2DD4BF]/50 transition-colors disabled:opacity-50"
                              >
                                Complete
                              </button>
                            )}
                            {p.fee_status === 'paid' && p.status !== 'active' && (
                              <span className="text-[11px] text-[#8A9AB4]/60 font-mono">settled</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Record Placement */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
                <h2 className="text-sm font-semibold text-[#E6EDF7]">Record Clinician Placement</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8A9AB4]">✕</button>
              </div>

              <form onSubmit={handleCreatePlacement} className="space-y-3 text-xs">
                {formError && <div className="p-2 bg-[#FB7185]/10 text-[#FB7185] rounded">{formError}</div>}

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Select Candidate Submission</label>
                  <select
                    value={form.submission_id}
                    onChange={(e) => setForm({ ...form, submission_id: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    required
                  >
                    {submissions.length === 0 ? (
                      <option value="">-- No eligible submissions --</option>
                    ) : (
                      submissions.map((sub) => (
                        <option key={sub.id} value={sub.id}>
                          #{sub.id} - {sub.clinician_name} → {sub.job_title} ({sub.employer_name})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Placement Start Date</label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Bill Rate ($/hr)</label>
                    <input
                      type="number"
                      required
                      value={form.bill_rate}
                      onChange={(e) => setForm({ ...form, bill_rate: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Pay Rate ($/hr)</label>
                    <input
                      type="number"
                      required
                      value={form.pay_rate}
                      onChange={(e) => setForm({ ...form, pay_rate: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Contract Hours</label>
                    <input
                      type="number"
                      value={form.hours}
                      onChange={(e) => setForm({ ...form, hours: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E2A44] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-3 py-1.5 border border-[#1E2A44] rounded text-[#8A9AB4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || !form.submission_id}
                    className="px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold rounded disabled:opacity-50"
                  >
                    {submitting ? 'Recording...' : 'Save Placement'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
