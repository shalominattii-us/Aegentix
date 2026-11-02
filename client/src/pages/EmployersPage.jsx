import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatDate, formatPercent } from '../utils/formatters';
import { Building2, Plus, Search, Mail, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';

const CONTRACT_STATUSES = ['prospect', 'active', 'paused'];

export default function EmployersPage() {
  const [employers, setEmployers] = useState([]);
  const [query, setQuery] = useState('');
  const [contractStatus, setContractStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({
    name: '',
    type: 'hospital',
    city: '',
    state: 'CA',
    ehr: 'Epic',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    contract_status: 'active',
    fee_pct: 20,
    notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadEmployers = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/employers', {
        query: query || undefined,
        contract_status: contractStatus || undefined,
      });
      setEmployers(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load facility employer accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEmployers();
  }, [query, contractStatus]);

  const handleCreateEmployer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/employers', {
        ...form,
        fee_pct: Number(form.fee_pct),
      });
      setIsModalOpen(false);
      loadEmployers();
    } catch (err) {
      setFormError(err.message || 'Failed to create employer account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout pageTitle="Employer Accounts">
      <div className="space-y-4">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search facility partners by name, city, EHR..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#111A2C] border border-[#1E2A44] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>

            <select
              value={contractStatus}
              onChange={(e) => setContractStatus(e.target.value)}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Contract Statuses</option>
              {CONTRACT_STATUSES.map((cs) => (
                <option key={cs} value={cs}>{cs}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Employer Account</span>
          </button>
        </div>

        {loading ? (
          <LoadingState message="Loading facility accounts..." />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadEmployers} />
        ) : employers.length === 0 ? (
          <EmptyState
            title="No facility accounts found"
            description="Add a health system or clinic client to start managing staffing contracts."
            actionLabel="New Employer Account"
            onAction={() => setIsModalOpen(true)}
          />
        ) : (
          <div className="panel-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B1220]/60 text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="py-3 px-4">Facility Name</th>
                    <th className="py-3 px-4">Type & Location</th>
                    <th className="py-3 px-4">Key Contact</th>
                    <th className="py-3 px-4">Contract Status</th>
                    <th className="py-3 px-4">Fee %</th>
                    <th className="py-3 px-4">Open Jobs</th>
                    <th className="py-3 px-4">Placements</th>
                    <th className="py-3 px-4">BAA Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {employers.map((emp) => (
                    <tr key={emp.id} className="hover:bg-[#16233B]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#E6EDF7]">{emp.name}</div>
                        <div className="text-[10px] font-mono text-[#8A9AB4]">EHR: {emp.ehr || 'Not recorded'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[#E6EDF7] capitalize">{emp.type}</div>
                        <div className="text-[10px] text-[#8A9AB4] flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                          <span>{emp.city ? `${emp.city}, ${emp.state}` : emp.state}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[#E6EDF7] font-medium">{emp.contact_name || '-'}</div>
                        <div className="text-[10px] text-[#8A9AB4]">{emp.contact_email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={emp.contract_status} />
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E6EDF7] tabular-nums font-bold">
                        {formatPercent(emp.fee_pct)}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#2DD4BF] font-bold tabular-nums">
                        {emp.open_jobs ?? 0}
                      </td>
                      <td className="py-3 px-4 font-mono text-[#34D399] font-bold tabular-nums">
                        {emp.active_placements ?? 0}
                      </td>
                      <td className="py-3 px-4">
                        {emp.baa_signed_at ? (
                          <span className="inline-flex items-center gap-1 text-[#34D399] text-[11px] font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Signed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[#FBBF24] text-[11px] font-mono">
                            <AlertCircle className="w-3.5 h-3.5" />
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Create Employer */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-lg p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
                <h2 className="text-sm font-semibold text-[#E6EDF7]">Register Facility Partner</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8A9AB4]">✕</button>
              </div>

              <form onSubmit={handleCreateEmployer} className="space-y-3 text-xs">
                {formError && <div className="p-2 bg-[#FB7185]/10 text-[#FB7185] rounded">{formError}</div>}

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Facility Name</label>
                  <input
                    type="text"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Facility Type</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      <option value="hospital">Hospital</option>
                      <option value="clinic">Clinic</option>
                      <option value="staffing">Staffing</option>
                      <option value="ltc">LTC</option>
                      <option value="home_health">Home Health</option>
                      <option value="telehealth">Telehealth</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">EHR System</label>
                    <input
                      type="text"
                      value={form.ehr}
                      onChange={(e) => setForm({ ...form, ehr: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">City</label>
                    <input
                      type="text"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">State</label>
                    <input
                      type="text"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Contact Name</label>
                    <input
                      type="text"
                      value={form.contact_name}
                      onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Contact Email</label>
                    <input
                      type="email"
                      value={form.contact_email}
                      onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Contract Status</label>
                    <select
                      value={form.contract_status}
                      onChange={(e) => setForm({ ...form, contract_status: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      <option value="prospect">Prospect</option>
                      <option value="active">Active</option>
                      <option value="paused">Paused</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Staffing Fee %</label>
                    <input
                      type="number"
                      value={form.fee_pct}
                      onChange={(e) => setForm({ ...form, fee_pct: e.target.value })}
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
                    disabled={submitting}
                    className="px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold rounded"
                  >
                    {submitting ? 'Saving...' : 'Save Employer'}
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
