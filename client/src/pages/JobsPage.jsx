import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatCurrency } from '../utils/formatters';
import { Plus, Search, Briefcase, MapPin, Building2, Users, DollarSign, Calendar } from 'lucide-react';

const DISCIPLINES = ['RN', 'LPN', 'NP', 'PA', 'MD', 'DO', 'CRNA', 'CNA', 'Therapist', 'Allied'];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const STATUSES = ['draft', 'open', 'on_hold', 'filled', 'closed'];

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // New Job Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [employers, setEmployers] = useState([]);
  const [form, setForm] = useState({
    employer_id: '',
    title: '',
    discipline: 'RN',
    specialty: 'ICU',
    city: '',
    state: 'CA',
    setting: 'Inpatient',
    shift: 'Day 12x3',
    shift_hours: 12,
    start_date: '2026-11-15',
    duration_weeks: 13,
    rate_min: 90,
    rate_max: 120,
    rate_basis: 'hour',
    openings: 3,
    priority: 'high',
    status: 'open',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadJobs = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/jobs', {
        query: query || undefined,
        status: status || undefined,
        priority: priority || undefined,
        discipline: discipline || undefined,
      });
      setJobs(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch job requisitions.');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployers = async () => {
    try {
      const res = await api.get('/employers');
      setEmployers(res.items || []);
      if (res.items && res.items.length > 0 && !form.employer_id) {
        setForm((f) => ({ ...f, employer_id: res.items[0].id }));
      }
    } catch (err) {
      console.error('Failed to load employers for job modal', err);
    }
  };

  useEffect(() => {
    loadJobs();
  }, [query, status, priority, discipline]);

  const handleOpenModal = () => {
    loadEmployers();
    setIsModalOpen(true);
  };

  const handleCreateJob = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      await api.post('/jobs', {
        ...form,
        employer_id: Number(form.employer_id),
        shift_hours: Number(form.shift_hours),
        duration_weeks: Number(form.duration_weeks),
        rate_min: Number(form.rate_min),
        rate_max: Number(form.rate_max),
        openings: Number(form.openings),
      });
      setIsModalOpen(false);
      loadJobs();
    } catch (err) {
      setFormError(err.message || 'Failed to post job requisition.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout pageTitle="Requisitions & Jobs">
      <div className="space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search requisitions by title, facility, city..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-[#111A2C] border border-[#1E2A44] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>

            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>

            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            <select
              value={discipline}
              onChange={(e) => setDiscipline(e.target.value)}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Disciplines</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleOpenModal}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Requisition</span>
          </button>
        </div>

        {/* Jobs List Grid */}
        {loading ? (
          <LoadingState message="Loading job requisitions..." />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadJobs} />
        ) : jobs.length === 0 ? (
          <EmptyState
            title="No job requisitions found"
            description="Create a new requisition to start matching clinicians."
            actionLabel="New Requisition"
            onAction={handleOpenModal}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {jobs.map((j) => {
              const openings = j.openings || 1;
              const filled = j.filled || 0;
              const fillPct = Math.min(Math.round((filled / openings) * 100), 100);

              return (
                <div
                  key={j.id}
                  className="panel-card p-4 flex flex-col justify-between hover:border-[#2DD4BF]/50 transition-colors group space-y-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[10px] font-mono text-[#8A9AB4]">#{j.id}</span>
                      <div className="flex items-center gap-1.5">
                        <StatusPill status={j.priority} />
                        <StatusPill status={j.status} />
                      </div>
                    </div>

                    <div>
                      <Link to={`/jobs/${j.id}`} className="font-bold text-sm text-[#E6EDF7] group-hover:text-[#2DD4BF] transition-colors line-clamp-1">
                        {j.title}
                      </Link>
                      <div className="text-xs text-[#8A9AB4] flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-[#2DD4BF]" />
                        <span className="truncate">{j.employer_name || `Employer #${j.employer_id}`}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-[#8A9AB4] pt-1">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                        <span>{j.city ? `${j.city}, ${j.state}` : j.state}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-[#2DD4BF]" />
                        <span>{j.discipline} - {j.specialty || 'General'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1">
                      <span className="font-mono text-[#E6EDF7] font-semibold">
                        {formatCurrency(j.rate_min)} - {formatCurrency(j.rate_max, j.rate_basis)}
                      </span>
                      <span className="text-[11px] text-[#8A9AB4] font-mono">{j.shift || '12h Shift'}</span>
                    </div>
                  </div>

                  {/* Openings Progress Bar */}
                  <div className="pt-3 border-t border-[#1E2A44] space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-[#8A9AB4]">Capacity:</span>
                      <span className="text-[#E6EDF7]">
                        <span className="text-[#34D399] font-bold">{filled}</span> / {openings} Filled
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-[#0B1220] rounded overflow-hidden">
                      <div
                        className="h-full bg-[#34D399] rounded transition-all"
                        style={{ width: `${fillPct}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-[#8A9AB4]">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-[#2DD4BF]" />
                        {j.submissions_count ?? 0} submitted
                      </span>
                      <Link to={`/jobs/${j.id}`} className="text-[#2DD4BF] hover:underline font-semibold">
                        View details →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal Create Job */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
                <h2 className="text-sm font-semibold text-[#E6EDF7]">Post Requisition</h2>
                <button onClick={() => setIsModalOpen(false)} className="text-[#8A9AB4]">✕</button>
              </div>

              <form onSubmit={handleCreateJob} className="space-y-3 text-xs">
                {formError && <div className="p-2 bg-[#FB7185]/10 text-[#FB7185] rounded">{formError}</div>}

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Employer Facility</label>
                  <select
                    value={form.employer_id}
                    onChange={(e) => setForm({ ...form, employer_id: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    required
                  >
                    {employers.map((emp) => (
                      <option key={emp.id} value={emp.id}>{emp.name} ({emp.city}, {emp.state})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Requisition Title</label>
                  <input
                    type="text"
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Travel RN - ICU Night Shift"
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Discipline</label>
                    <select
                      value={form.discipline}
                      onChange={(e) => setForm({ ...form, discipline: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      {DISCIPLINES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Specialty</label>
                    <input
                      type="text"
                      value={form.specialty}
                      onChange={(e) => setForm({ ...form, specialty: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Openings</label>
                    <input
                      type="number"
                      value={form.openings}
                      onChange={(e) => setForm({ ...form, openings: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Min Rate ($)</label>
                    <input
                      type="number"
                      value={form.rate_min}
                      onChange={(e) => setForm({ ...form, rate_min: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Max Rate ($)</label>
                    <input
                      type="number"
                      value={form.rate_max}
                      onChange={(e) => setForm({ ...form, rate_max: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Priority</label>
                    <select
                      value={form.priority}
                      onChange={(e) => setForm({ ...form, priority: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Status</label>
                    <select
                      value={form.status}
                      onChange={(e) => setForm({ ...form, status: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
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
                    {submitting ? 'Creating...' : 'Create Job'}
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
