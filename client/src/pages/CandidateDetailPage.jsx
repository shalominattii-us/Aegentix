import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatCurrency, formatDate, calculateDaysLeft } from '../utils/formatters';
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  DollarSign,
  ShieldCheck,
  Plus,
  Send,
  Award,
  Briefcase,
  CheckCircle,
} from 'lucide-react';

export default function CandidateDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Add Credential Modal State
  const [isAddCredModal, setIsAddCredModal] = useState(false);
  const [credForm, setCredForm] = useState({
    type: 'license',
    name: 'State Registered Nurse License',
    issuer: 'State Board of Nursing',
    number: '',
    state: 'CA',
    issued_on: '2024-01-01',
    expires_on: '2027-12-31',
    status: 'verified',
  });
  const [credSubmitting, setCredSubmitting] = useState(false);
  const [credError, setCredError] = useState('');

  // Submitting match state
  const [submittingJobId, setSubmittingJobId] = useState(null);
  const [submitMsg, setSubmitMsg] = useState('');

  const loadCandidateDetail = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/clinicians/${id}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load clinician details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCandidateDetail();
  }, [id]);

  const handleVerifyCredential = async (credId) => {
    try {
      await api.patch(`/credentials/${credId}`, { status: 'verified' });
      loadCandidateDetail();
    } catch (err) {
      alert(err.message || 'Failed to verify credential.');
    }
  };

  const handleAddCredential = async (e) => {
    e.preventDefault();
    setCredSubmitting(true);
    setCredError('');
    try {
      await api.post(`/clinicians/${id}/credentials`, credForm);
      setIsAddCredModal(false);
      loadCandidateDetail();
    } catch (err) {
      setCredError(err.message || 'Failed to add credential.');
    } finally {
      setCredSubmitting(false);
    }
  };

  const handleSubmitToJob = async (jobId) => {
    setSubmittingJobId(jobId);
    setSubmitMsg('');
    try {
      await api.post('/submissions', {
        job_id: jobId,
        clinician_id: Number(id),
      });
      setSubmitMsg('Successfully submitted clinician to job!');
      loadCandidateDetail();
    } catch (err) {
      setSubmitMsg(`Submission error: ${err.message}`);
    } finally {
      setSubmittingJobId(null);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Clinician Detail">
        <LoadingState message="Fetching clinician dossier..." />
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout pageTitle="Clinician Detail">
        <ErrorBanner message={error || 'Clinician not found'} onRetry={loadCandidateDetail} />
      </Layout>
    );
  }

  const { clinician, credentials = [], submissions = [], matches = [] } = data;

  return (
    <Layout pageTitle={`Clinician: ${clinician.first_name} ${clinician.last_name}`}>
      <div className="space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/candidates')}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A9AB4] hover:text-[#E6EDF7] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Candidates Roster</span>
          </button>
        </div>

        {submitMsg && (
          <div className="p-3 bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 rounded-lg text-xs text-[#2DD4BF] flex items-center justify-between">
            <span>{submitMsg}</span>
            <button onClick={() => setSubmitMsg('')} className="text-xs">✕</button>
          </div>
        )}

        {/* Identity Header */}
        <div className="panel-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#E6EDF7]">
                {clinician.first_name} {clinician.last_name}
              </h1>
              <span className="px-2 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-mono text-xs font-bold">
                {clinician.discipline}
              </span>
              <StatusPill status={clinician.status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A9AB4]">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {clinician.city ? `${clinician.city}, ${clinician.state}` : clinician.state}
              </span>
              <span className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {clinician.specialty || 'General'} ({clinician.years_experience} yrs exp)
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#2DD4BF]" />
                Avail: {formatDate(clinician.availability_date)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {clinician.willing_to_travel === 1 && (
              <span className="px-2.5 py-1 rounded bg-[#16233B] border border-[#1E2A44] text-[11px] text-[#2DD4BF] font-mono">
                Travel Ready
              </span>
            )}
            {clinician.remote_ok === 1 && (
              <span className="px-2.5 py-1 rounded bg-[#16233B] border border-[#1E2A44] text-[11px] text-[#34D399] font-mono">
                Remote OK
              </span>
            )}
          </div>
        </div>

        {/* Contact and Rate Block */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="panel-card p-5 space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-[#8A9AB4] border-b border-[#1E2A44] pb-2">
              Contact Channels
            </h3>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-[#E6EDF7]">
                <Mail className="w-3.5 h-3.5 text-[#8A9AB4]" />
                <a href={`mailto:${clinician.email}`} className="hover:text-[#2DD4BF] truncate">
                  {clinician.email}
                </a>
              </div>
              <div className="flex items-center gap-2 text-[#E6EDF7]">
                <Phone className="w-3.5 h-3.5 text-[#8A9AB4]" />
                <span>{clinician.phone || 'No phone recorded'}</span>
              </div>
            </div>
          </div>

          <div className="panel-card p-5 space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-[#8A9AB4] border-b border-[#1E2A44] pb-2">
              Compensation Target
            </h3>
            <div className="text-xs space-y-1">
              <div className="text-base font-bold font-mono text-[#E6EDF7] tabular-nums">
                {formatCurrency(clinician.rate_min)} - {formatCurrency(clinician.rate_max, clinician.rate_basis)}
              </div>
              <div className="text-[11px] text-[#8A9AB4]">
                Basis: <span className="uppercase text-[#E6EDF7] font-mono">{clinician.rate_basis || 'hour'}</span>
              </div>
            </div>
          </div>

          <div className="panel-card p-5 space-y-3">
            <h3 className="text-xs font-mono font-semibold uppercase text-[#8A9AB4] border-b border-[#1E2A44] pb-2">
              Bio Summary
            </h3>
            <p className="text-xs text-[#8A9AB4] leading-relaxed line-clamp-3">
              {clinician.bio || 'No recruiter bio provided for this clinician.'}
            </p>
          </div>
        </div>

        {/* Credentials Verification List */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#2DD4BF]" />
              <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
                Verified Credentials & Certifications ({credentials.length})
              </h2>
            </div>
            <button
              onClick={() => setIsAddCredModal(true)}
              className="flex items-center gap-1 px-2.5 py-1 bg-[#16233B] border border-[#1E2A44] hover:border-[#2DD4BF] text-xs text-[#2DD4BF] rounded font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Credential</span>
            </button>
          </div>

          {credentials.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No credentials registered for this clinician.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Type / Name</th>
                    <th className="pb-2">Issuer & License #</th>
                    <th className="pb-2">State</th>
                    <th className="pb-2">Expires On</th>
                    <th className="pb-2">Status</th>
                    <th className="pb-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {credentials.map((cred) => {
                    const days = calculateDaysLeft(cred.expires_on);
                    return (
                      <tr key={cred.id} className="hover:bg-[#16233B]/50">
                        <td className="py-2.5">
                          <div className="font-semibold text-[#E6EDF7]">{cred.name}</div>
                          <div className="text-[10px] font-mono text-[#8A9AB4] uppercase">{cred.type}</div>
                        </td>
                        <td className="py-2.5 text-[#8A9AB4]">
                          <div>{cred.issuer || '-'}</div>
                          <div className="font-mono text-[10px] text-[#E6EDF7]">{cred.number || '-'}</div>
                        </td>
                        <td className="py-2.5 font-mono text-[#E6EDF7]">{cred.state || '-'}</td>
                        <td className="py-2.5 font-mono text-[#8A9AB4]">
                          {formatDate(cred.expires_on)}
                          {days !== null && days <= 30 && (
                            <span className="ml-1 text-[10px] text-[#FBBF24]">({days}d)</span>
                          )}
                        </td>
                        <td className="py-2.5">
                          <StatusPill status={cred.status} />
                        </td>
                        <td className="py-2.5 text-right">
                          {cred.status !== 'verified' && (
                            <button
                              onClick={() => handleVerifyCredential(cred.id)}
                              className="px-2 py-1 bg-[#34D399]/10 text-[#34D399] border border-[#34D399]/30 hover:bg-[#34D399]/20 text-[10px] font-bold rounded"
                            >
                              Verify
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Matches Section */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1E2A44] pb-3">
            <Award className="w-4 h-4 text-[#2DD4BF]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
              Engine Requisition Matches ({matches.length})
            </h2>
          </div>

          {matches.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No matching open job requisitions evaluated at this time.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <div key={m.job_id} className="p-4 rounded-lg bg-[#0B1220] border border-[#1E2A44] space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/jobs/${m.job_id}`} className="font-semibold text-xs text-[#E6EDF7] hover:text-[#2DD4BF]">
                        {m.title}
                      </Link>
                      <div className="text-[11px] text-[#8A9AB4]">{m.employer_name}</div>
                    </div>
                    <div className="flex items-center gap-1.5 bg-[#2DD4BF]/10 px-2 py-1 rounded border border-[#2DD4BF]/30 font-mono text-xs font-bold text-[#2DD4BF]">
                      {m.score}% Match
                    </div>
                  </div>

                  {m.reasons && m.reasons.length > 0 && (
                    <div className="space-y-1 text-[11px] text-[#8A9AB4]">
                      {m.reasons.map((r, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <CheckCircle className="w-3 h-3 text-[#34D399] shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#1E2A44] flex justify-end">
                    <button
                      disabled={submittingJobId === m.job_id}
                      onClick={() => handleSubmitToJob(m.job_id)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded hover:bg-[#2DD4BF]/90 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{submittingJobId === m.job_id ? 'Submitting...' : 'Submit Candidate'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission History */}
        <div className="panel-card p-5 space-y-4">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7] border-b border-[#1E2A44] pb-3">
            Submission History ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No submission history recorded for this clinician.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Requisition</th>
                    <th className="pb-2">Employer</th>
                    <th className="pb-2">Match Score</th>
                    <th className="pb-2">Stage</th>
                    <th className="pb-2 text-right">Submitted Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#16233B]/50">
                      <td className="py-2.5 font-semibold text-[#E6EDF7]">
                        <Link to={`/jobs/${sub.job_id}`} className="hover:text-[#2DD4BF]">
                          {sub.job_title}
                        </Link>
                      </td>
                      <td className="py-2.5 text-[#8A9AB4]">{sub.employer_name}</td>
                      <td className="py-2.5 font-mono text-[#2DD4BF] font-bold">{sub.match_score}%</td>
                      <td className="py-2.5">
                        <StatusPill status={sub.stage} />
                      </td>
                      <td className="py-2.5 text-right font-mono text-[#8A9AB4]">
                        {formatDate(sub.submitted_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Credential Modal */}
        {isAddCredModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-md p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
                <h3 className="text-xs font-mono font-semibold uppercase text-[#E6EDF7]">
                  Register New Credential
                </h3>
                <button onClick={() => setIsAddCredModal(false)} className="text-[#8A9AB4]">✕</button>
              </div>

              <form onSubmit={handleAddCredential} className="space-y-3 text-xs">
                {credError && <div className="p-2 bg-[#FB7185]/10 text-[#FB7185] rounded">{credError}</div>}

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Credential Type</label>
                  <select
                    value={credForm.type}
                    onChange={(e) => setCredForm({ ...credForm, type: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  >
                    <option value="license">License</option>
                    <option value="certification">Certification</option>
                    <option value="dea">DEA</option>
                    <option value="bls">BLS</option>
                    <option value="acls">ACLS</option>
                    <option value="tb">TB Test</option>
                    <option value="immunization">Immunization</option>
                    <option value="background">Background Check</option>
                    <option value="drug_screen">Drug Screen</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[#8A9AB4] mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={credForm.name}
                    onChange={(e) => setCredForm({ ...credForm, name: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">License/Cert #</label>
                    <input
                      type="text"
                      value={credForm.number}
                      onChange={(e) => setCredForm({ ...credForm, number: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">State</label>
                    <input
                      type="text"
                      value={credForm.state}
                      onChange={(e) => setCredForm({ ...credForm, state: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Issued Date</label>
                    <input
                      type="date"
                      value={credForm.issued_on}
                      onChange={(e) => setCredForm({ ...credForm, issued_on: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                  <div>
                    <label className="block text-[#8A9AB4] mb-1">Expires Date</label>
                    <input
                      type="date"
                      value={credForm.expires_on}
                      onChange={(e) => setCredForm({ ...credForm, expires_on: e.target.value })}
                      className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-[#1E2A44] flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCredModal(false)}
                    className="px-3 py-1.5 border border-[#1E2A44] rounded text-[#8A9AB4]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={credSubmitting}
                    className="px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold rounded"
                  >
                    {credSubmitting ? 'Saving...' : 'Save Credential'}
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
