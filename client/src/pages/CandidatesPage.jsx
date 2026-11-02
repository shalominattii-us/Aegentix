import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatCurrency } from '../utils/formatters';
import ExportButton from '../components/ExportButton';
import { Plus, Search, Filter, ChevronLeft, ChevronRight, UserPlus, MapPin, Award } from 'lucide-react';

const DISCIPLINES = ['RN', 'LPN', 'NP', 'PA', 'MD', 'DO', 'CRNA', 'CNA', 'Therapist', 'Allied'];
const STATES = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const STATUSES = ['active', 'passive', 'placed', 'do_not_contact'];

export default function CandidatesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('query') || '';

  const [candidates, setClinicians] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(15);
  const [query, setQuery] = useState(initialQuery);
  const [discipline, setDiscipline] = useState('');
  const [state, setState] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Candidate Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    discipline: 'RN',
    specialty: 'ICU',
    years_experience: 5,
    city: '',
    state: 'CA',
    rate_min: 80,
    rate_max: 110,
    rate_basis: 'hour',
    willing_to_travel: 1,
    remote_ok: 0,
    status: 'active',
    bio: '',
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    // sync search query from URL if changed
    const q = searchParams.get('query');
    if (q !== null && q !== query) {
      setQuery(q);
    }
  }, [searchParams]);

  const loadCandidates = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/clinicians', {
        query: query || undefined,
        discipline: discipline || undefined,
        state: state || undefined,
        status: status || undefined,
        page,
        limit,
      });
      setClinicians(res.items || []);
      setTotal(res.total || 0);
    } catch (err) {
      setError(err.message || 'Failed to fetch candidates roster.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidates();
  }, [page, query, discipline, state, status]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setAddSubmitting(true);
    setAddError('');
    try {
      await api.post('/clinicians', {
        ...addForm,
        years_experience: Number(addForm.years_experience),
        rate_min: Number(addForm.rate_min),
        rate_max: Number(addForm.rate_max),
        willing_to_travel: Number(addForm.willing_to_travel),
        remote_ok: Number(addForm.remote_ok),
      });
      setIsAddModalOpen(false);
      loadCandidates();
    } catch (err) {
      setAddError(err.message || 'Failed to create clinician record.');
    } finally {
      setAddSubmitting(false);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  return (
    <Layout
      pageTitle="Candidate Roster"
      actions={
        <ExportButton
          endpoint="/exports/candidates.csv"
          filename="prosurance-candidates.csv"
          params={{ query, discipline, state, status }}
          onError={setError}
        />
      }
    >
      <div className="space-y-4">
        {/* Top Control Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search candidates by name, specialty, email..."
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full bg-[#111A2C] border border-[#1E2A44] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
              />
            </div>

            {/* Filters */}
            <select
              value={discipline}
              onChange={(e) => {
                setDiscipline(e.target.value);
                setPage(1);
              }}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Disciplines</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select
              value={state}
              onChange={(e) => {
                setState(e.target.value);
                setPage(1);
              }}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All States</option>
              {STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>

            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="bg-[#111A2C] border border-[#1E2A44] rounded-lg px-2.5 py-1.5 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
            >
              <option value="">All Statuses</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Candidate</span>
          </button>
        </div>

        {/* Content Table / States */}
        {loading ? (
          <LoadingState message="Loading clinician database..." />
        ) : error ? (
          <ErrorBanner message={error} onRetry={loadCandidates} />
        ) : candidates.length === 0 ? (
          <EmptyState
            title="No candidates match criteria"
            description="Try clearing search filters or add a new clinician to your roster."
            actionLabel="Add Candidate"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="panel-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#0B1220]/60 text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="py-3 px-4">Clinician</th>
                    <th className="py-3 px-4">Discipline & Specialty</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Rate Range</th>
                    <th className="py-3 px-4">Credentials</th>
                    <th className="py-3 px-4">Submissions</th>
                    <th className="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {candidates.map((c) => (
                    <tr
                      key={c.id}
                      className="hover:bg-[#16233B]/50 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4">
                        <Link to={`/candidates/${c.id}`} className="block">
                          <div className="font-semibold text-[#E6EDF7] group-hover:text-[#2DD4BF] transition-colors">
                            {c.first_name} {c.last_name}
                          </div>
                          <div className="text-[11px] text-[#8A9AB4] truncate">{c.email}</div>
                        </Link>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 font-mono text-[10px] font-bold">
                            {c.discipline}
                          </span>
                          <span className="text-[#E6EDF7]">{c.specialty || 'General'}</span>
                        </div>
                        <div className="text-[10px] text-[#8A9AB4] mt-0.5">
                          {c.years_experience} yrs exp
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1 text-[#8A9AB4]">
                          <MapPin className="w-3 h-3 text-[#2DD4BF]" />
                          <span>{c.city ? `${c.city}, ${c.state}` : c.state}</span>
                        </div>
                        <div className="text-[10px] text-[#8A9AB4] mt-0.5">
                          {c.willing_to_travel ? 'Travel OK' : 'Local'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E6EDF7] tabular-nums">
                        {c.rate_min || c.rate_max ? (
                          `${formatCurrency(c.rate_min)} - ${formatCurrency(c.rate_max, c.rate_basis)}`
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-[#34D399] text-[11px]">
                            <Award className="w-3 h-3" />
                            {c.credentials_verified ?? 0} verified
                          </span>
                          {(c.credentials_expiring ?? 0) > 0 && (
                            <span className="text-[#FBBF24] text-[10px] font-mono bg-[#FBBF24]/10 px-1 rounded">
                              {c.credentials_expiring} expiring
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[#E6EDF7] tabular-nums">
                        {c.open_submissions ?? 0} active
                      </td>
                      <td className="py-3 px-4">
                        <StatusPill status={c.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="px-4 py-3 border-t border-[#1E2A44] flex items-center justify-between text-xs text-[#8A9AB4]">
              <div>
                Showing <span className="text-[#E6EDF7] font-mono">{candidates.length}</span> of{' '}
                <span className="text-[#E6EDF7] font-mono">{total}</span> clinicians
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="p-1.5 rounded border border-[#1E2A44] hover:bg-[#16233B] disabled:opacity-30 disabled:hover:bg-transparent text-[#E6EDF7]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-mono text-xs text-[#E6EDF7]">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="p-1.5 rounded border border-[#1E2A44] hover:bg-[#16233B] disabled:opacity-30 disabled:hover:bg-transparent text-[#E6EDF7]"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Candidate Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="p-4 border-b border-[#1E2A44] flex items-center justify-between">
                <h2 className="text-sm font-semibold text-[#E6EDF7]">Add New Clinician</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-[#8A9AB4] hover:text-[#E6EDF7]"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-5 space-y-4 text-xs">
                {addError && (
                  <div className="p-3 bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-lg text-[#FB7185]">
                    {addError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">First Name</label>
                    <input
                      type="text"
                      required
                      value={addForm.first_name}
                      onChange={(e) => setAddForm({ ...addForm, first_name: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Last Name</label>
                    <input
                      type="text"
                      required
                      value={addForm.last_name}
                      onChange={(e) => setAddForm({ ...addForm, last_name: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Email</label>
                    <input
                      type="email"
                      required
                      value={addForm.email}
                      onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Phone</label>
                    <input
                      type="text"
                      value={addForm.phone}
                      onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Discipline</label>
                    <select
                      value={addForm.discipline}
                      onChange={(e) => setAddForm({ ...addForm, discipline: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      {DISCIPLINES.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Specialty</label>
                    <input
                      type="text"
                      value={addForm.specialty}
                      onChange={(e) => setAddForm({ ...addForm, specialty: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Years Experience</label>
                    <input
                      type="number"
                      value={addForm.years_experience}
                      onChange={(e) => setAddForm({ ...addForm, years_experience: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">City</label>
                    <input
                      type="text"
                      value={addForm.city}
                      onChange={(e) => setAddForm({ ...addForm, city: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">State</label>
                    <select
                      value={addForm.state}
                      onChange={(e) => setAddForm({ ...addForm, state: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      {STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Min Rate ($)</label>
                    <input
                      type="number"
                      value={addForm.rate_min}
                      onChange={(e) => setAddForm({ ...addForm, rate_min: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Max Rate ($)</label>
                    <input
                      type="number"
                      value={addForm.rate_max}
                      onChange={(e) => setAddForm({ ...addForm, rate_max: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1 font-mono uppercase text-[10px]">Rate Basis</label>
                    <select
                      value={addForm.rate_basis}
                      onChange={(e) => setAddForm({ ...addForm, rate_basis: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    >
                      <option value="hour">Hour</option>
                      <option value="week">Week</option>
                      <option value="year">Year</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E2A44] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 border border-[#1E2A44] rounded text-[#8A9AB4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={addSubmitting}
                    className="px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold rounded"
                  >
                    {addSubmitting ? 'Saving...' : 'Save Clinician'}
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
