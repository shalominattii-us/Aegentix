import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatCurrency, formatDate } from '../utils/formatters';
import {
  ArrowLeft,
  Building2,
  MapPin,
  Calendar,
  Clock,
  Send,
  Award,
  Users,
  CheckCircle,
  Briefcase,
} from 'lucide-react';

const STAGES = [
  'sourced',
  'screened',
  'submitted',
  'client_review',
  'interview',
  'offer',
  'placed',
  'rejected',
  'withdrawn',
];

export default function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [jobData, setJobData] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitMsg, setSubmitMsg] = useState('');
  const [submittingClinicianId, setSubmittingClinicianId] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [interviewSub, setInterviewSub] = useState(null);
  const [interviewForm, setInterviewForm] = useState({
    scheduled_at: '',
    duration_minutes: 45,
    mode: 'video',
    interviewer: '',
    notes: '',
  });
  const [interviewSaving, setInterviewSaving] = useState(false);
  const [interviewError, setInterviewError] = useState('');
  const [interviewMsg, setInterviewMsg] = useState('');

  const loadJobDetails = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, matchesRes, interviewRes] = await Promise.all([
        api.get(`/jobs/${id}`),
        api.get(`/jobs/${id}/matches`, { limit: 10 }),
        api.get('/interviews', { job_id: id, limit: 50 }),
      ]);
      setJobData(res);
      setMatches(matchesRes.matches || []);
      setInterviews(interviewRes.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load job requisition details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadJobDetails();
  }, [id]);

  const defaultSlot = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    d.setHours(10, 0, 0, 0);
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const openInterviewModal = (sub) => {
    setInterviewError('');
    setInterviewMsg('');
    setInterviewSub(sub);
    setInterviewForm({
      scheduled_at: defaultSlot(),
      duration_minutes: 45,
      mode: 'video',
      interviewer: employer?.contact_name || '',
      notes: '',
    });
  };

  const handleScheduleInterview = async (e) => {
    e.preventDefault();
    if (!interviewSub) return;
    setInterviewSaving(true);
    setInterviewError('');
    try {
      await api.post('/interviews', {
        submission_id: interviewSub.id,
        scheduled_at: new Date(interviewForm.scheduled_at).toISOString(),
        duration_minutes: Number(interviewForm.duration_minutes),
        mode: interviewForm.mode,
        interviewer: interviewForm.interviewer || null,
        notes: interviewForm.notes || null,
      });
      setInterviewSub(null);
      setInterviewMsg('Interview scheduled and added to the pipeline.');
      await loadJobDetails();
    } catch (err) {
      setInterviewError(err.message || 'Failed to schedule interview.');
    } finally {
      setInterviewSaving(false);
    }
  };

  const handleInterviewOutcome = async (interviewId, outcome) => {
    try {
      await api.patch(`/interviews/${interviewId}`, { outcome });
      await loadJobDetails();
    } catch (err) {
      setInterviewError(err.message || 'Failed to update interview.');
    }
  };

  const handleStageChange = async (submissionId, newStage) => {
    try {
      await api.patch(`/submissions/${submissionId}`, { stage: newStage });
      loadJobDetails();
    } catch (err) {
      alert(err.message || 'Failed to update submission stage.');
    }
  };

  const handleQuickSubmitMatch = async (clinicianId) => {
    setSubmittingClinicianId(clinicianId);
    setSubmitMsg('');
    try {
      await api.post('/submissions', {
        job_id: Number(id),
        clinician_id: clinicianId,
      });
      setSubmitMsg('Clinician submitted to requisition.');
      loadJobDetails();
    } catch (err) {
      setSubmitMsg(`Failed to submit: ${err.message}`);
    } finally {
      setSubmittingClinicianId(null);
    }
  };

  if (loading) {
    return (
      <Layout pageTitle="Requisition Detail">
        <LoadingState message="Loading job requisition data..." />
      </Layout>
    );
  }

  if (error || !jobData) {
    return (
      <Layout pageTitle="Requisition Detail">
        <ErrorBanner message={error || 'Job not found'} onRetry={loadJobDetails} />
      </Layout>
    );
  }

  const { job, employer, pipeline = [], submissions = [] } = jobData;

  // Render arrays safely if stored as JSON string
  const requiredCerts = typeof job.required_certs === 'string'
    ? JSON.parse(job.required_certs || '[]')
    : (job.required_certs || []);

  const requiredStates = typeof job.required_states === 'string'
    ? JSON.parse(job.required_states || '[]')
    : (job.required_states || []);

  return (
    <Layout pageTitle={`Requisition #${job.id}: ${job.title}`}>
      <div className="space-y-6">
        {/* Navigation back */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/jobs')}
            className="inline-flex items-center gap-1.5 text-xs text-[#8A9AB4] hover:text-[#E6EDF7] font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Job Requisitions</span>
          </button>
        </div>

        {submitMsg && (
          <div className="p-3 bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 rounded-lg text-xs text-[#2DD4BF] flex items-center justify-between">
            <span>{submitMsg}</span>
            <button onClick={() => setSubmitMsg('')} className="text-xs">✕</button>
          </div>
        )}

        {/* Top Header Card */}
        <div className="panel-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-[#E6EDF7]">{job.title}</h1>
              <StatusPill status={job.priority} />
              <StatusPill status={job.status} />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-[#8A9AB4]">
              <span className="flex items-center gap-1 text-[#E6EDF7] font-medium">
                <Building2 className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {employer?.name || 'Facility Partner'}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {job.city ? `${job.city}, ${job.state}` : job.state}
              </span>
              <span className="flex items-center gap-1 font-mono text-[#E6EDF7]">
                <Clock className="w-3.5 h-3.5 text-[#2DD4BF]" />
                {job.shift || '12h Shift'} ({job.shift_hours || 12} hrs)
              </span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B1220] border border-[#1E2A44] text-right font-mono space-y-1">
            <div className="text-xs text-[#8A9AB4]">Bill Range</div>
            <div className="text-base font-bold text-[#2DD4BF] tabular-nums">
              {formatCurrency(job.rate_min)} - {formatCurrency(job.rate_max, job.rate_basis)}
            </div>
          </div>
        </div>

        {/* Requirements & Facility Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 panel-card p-5 space-y-4">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7] border-b border-[#1E2A44] pb-2">
              Requisition Parameters & Requirements
            </h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-[#8A9AB4] block text-[10px] uppercase font-mono">Discipline</span>
                <span className="font-semibold text-[#E6EDF7]">{job.discipline}</span>
              </div>
              <div>
                <span className="text-[#8A9AB4] block text-[10px] uppercase font-mono">Specialty</span>
                <span className="font-semibold text-[#E6EDF7]">{job.specialty || 'General'}</span>
              </div>
              <div>
                <span className="text-[#8A9AB4] block text-[10px] uppercase font-mono">Start Date</span>
                <span className="font-mono text-[#E6EDF7]">{formatDate(job.start_date)}</span>
              </div>
              <div>
                <span className="text-[#8A9AB4] block text-[10px] uppercase font-mono">Duration</span>
                <span className="font-mono text-[#E6EDF7]">{job.duration_weeks || 13} Weeks</span>
              </div>
            </div>

            {/* Certs & States */}
            <div className="space-y-3 pt-2">
              <div>
                <span className="text-[11px] font-mono text-[#8A9AB4] block mb-1.5 uppercase">
                  Required Certifications:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {requiredCerts.length === 0 ? (
                    <span className="text-xs text-[#8A9AB4]">None specified</span>
                  ) : (
                    requiredCerts.map((cert) => (
                      <span key={cert} className="px-2 py-0.5 rounded bg-[#16233B] border border-[#1E2A44] text-xs text-[#2DD4BF] font-mono">
                        {cert}
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div>
                <span className="text-[11px] font-mono text-[#8A9AB4] block mb-1.5 uppercase">
                  Required States:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {requiredStates.length === 0 ? (
                    <span className="text-xs text-[#8A9AB4]">Compact / Any State</span>
                  ) : (
                    requiredStates.map((st) => (
                      <span key={st} className="px-2 py-0.5 rounded bg-[#16233B] border border-[#1E2A44] text-xs text-[#E6EDF7] font-mono">
                        {st}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {job.description && (
              <div className="pt-2 border-t border-[#1E2A44] text-xs text-[#8A9AB4] leading-relaxed">
                <span className="text-[10px] font-mono uppercase text-[#8A9AB4] block mb-1">Description</span>
                {job.description}
              </div>
            )}
          </div>

          {/* Employer Card & Capacity */}
          <div className="panel-card p-5 space-y-4">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7] border-b border-[#1E2A44] pb-2">
              Facility Account
            </h2>

            {employer ? (
              <div className="space-y-2 text-xs">
                <div className="font-bold text-sm text-[#E6EDF7]">{employer.name}</div>
                <div className="text-[#8A9AB4] uppercase font-mono text-[10px]">{employer.type}</div>
                <div className="text-[#8A9AB4]">
                  {employer.city}, {employer.state}
                </div>
                {employer.contact_name && (
                  <div className="pt-2 border-t border-[#1E2A44] space-y-1 text-[#8A9AB4]">
                    <div>Contact: <span className="text-[#E6EDF7]">{employer.contact_name}</span></div>
                    <div>Email: <a href={`mailto:${employer.contact_email}`} className="text-[#2DD4BF] hover:underline">{employer.contact_email}</a></div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-[#8A9AB4]">Employer info unavailable</div>
            )}

            <div className="pt-3 border-t border-[#1E2A44] space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#8A9AB4]">Openings:</span>
                <span className="text-[#E6EDF7] font-bold">{job.filled || 0} / {job.openings || 1} Filled</span>
              </div>
            </div>
          </div>
        </div>

        {/* Top Matches Engine Panel */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center gap-2 border-b border-[#1E2A44] pb-3">
            <Award className="w-4 h-4 text-[#2DD4BF]" />
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7]">
              Matched Candidates Evaluated for this Job ({matches.length})
            </h2>
          </div>

          {matches.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No matching clinicians meet the minimum threshold for this requisition.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {matches.map((m) => (
                <div key={m.clinician_id} className="p-3.5 rounded-lg bg-[#0B1220] border border-[#1E2A44] space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <Link to={`/candidates/${m.clinician_id}`} className="font-bold text-[#E6EDF7] hover:text-[#2DD4BF]">
                        {m.name}
                      </Link>
                      <div className="text-[11px] text-[#8A9AB4]">
                        {m.discipline} - {m.specialty} ({m.state})
                      </div>
                    </div>
                    <div className="px-2 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-mono text-xs font-bold">
                      {m.score}% Match
                    </div>
                  </div>

                  {m.reasons && m.reasons.length > 0 && (
                    <div className="space-y-1 text-[11px] text-[#8A9AB4]">
                      {m.reasons.slice(0, 3).map((r, i) => (
                        <div key={i} className="flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-[#34D399] shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-2 border-t border-[#1E2A44] flex items-center justify-between">
                    <span className="font-mono text-[#E6EDF7]">
                      {formatCurrency(m.rate_min)} - {formatCurrency(m.rate_max)}/hr
                    </span>
                    <button
                      disabled={submittingClinicianId === m.clinician_id}
                      onClick={() => handleQuickSubmitMatch(m.clinician_id)}
                      className="flex items-center gap-1 px-2.5 py-1 bg-[#2DD4BF] text-[#0B1220] font-semibold text-[11px] rounded hover:bg-[#2DD4BF]/90 disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      <span>{submittingClinicianId === m.clinician_id ? 'Submitting...' : 'Submit'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submissions Pipeline Table */}
        <div className="panel-card p-5 space-y-4">
          <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7] border-b border-[#1E2A44] pb-3">
            Current Active Submissions ({submissions.length})
          </h2>

          {submissions.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No candidates have been submitted to this requisition yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Clinician</th>
                    <th className="pb-2">Discipline</th>
                    <th className="pb-2">Match Score</th>
                    <th className="pb-2">Current Stage</th>
                    <th className="pb-2">Submitted Date</th>
                    <th className="pb-2 text-right">Stage / Interview</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-[#16233B]/50">
                      <td className="py-2.5 font-semibold text-[#E6EDF7]">
                        <Link to={`/candidates/${sub.clinician_id}`} className="hover:text-[#2DD4BF]">
                          {sub.clinician_name}
                        </Link>
                      </td>
                      <td className="py-2.5 text-[#8A9AB4]">
                        {sub.discipline} - {sub.specialty}
                      </td>
                      <td className="py-2.5 font-mono text-[#2DD4BF] font-bold">{sub.match_score}%</td>
                      <td className="py-2.5">
                        <StatusPill status={sub.stage} />
                      </td>
                      <td className="py-2.5 font-mono text-[#8A9AB4]">
                        {formatDate(sub.submitted_at)}
                      </td>
                      <td className="py-2.5 text-right">
                        <select
                          value={sub.stage}
                          onChange={(e) => handleStageChange(sub.id, e.target.value)}
                          className="bg-[#0B1220] border border-[#1E2A44] rounded text-[11px] text-[#E6EDF7] px-2 py-1 focus:outline-none focus:border-[#2DD4BF]"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                        <button
                          onClick={() => openInterviewModal(sub)}
                          className="ml-2 px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#2DD4BF] hover:border-[#2DD4BF]/50 transition-colors"
                        >
                          Interview
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Interview Schedule */}
        <div className="panel-card p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-wider text-[#E6EDF7] flex items-center gap-2">
              <Calendar className="w-3.5 h-3.5 text-[#2DD4BF]" />
              Interview Schedule ({interviews.length})
            </h2>
            {interviewMsg && <span className="text-[11px] text-[#34D399] font-mono">{interviewMsg}</span>}
          </div>

          {interviewError && <div className="text-[11px] text-[#FB7185] font-mono">{interviewError}</div>}

          {interviews.length === 0 ? (
            <div className="text-xs text-[#8A9AB4] text-center py-6">
              No interviews booked for this requisition. Use Interview on a submission to schedule one.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[10px] font-mono uppercase text-[#8A9AB4] border-b border-[#1E2A44]">
                    <th className="pb-2">Scheduled</th>
                    <th className="pb-2">Clinician</th>
                    <th className="pb-2">Mode</th>
                    <th className="pb-2">Interviewer</th>
                    <th className="pb-2">Outcome</th>
                    <th className="pb-2 text-right">Record Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E2A44]">
                  {interviews.map((iv) => (
                    <tr key={iv.id} className="hover:bg-[#16233B]/50">
                      <td className="py-2.5 font-mono text-[#E6EDF7] whitespace-nowrap">
                        {new Date(iv.scheduled_at).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                        <span className="text-[10px] text-[#8A9AB4] ml-1">{iv.duration_minutes}m</span>
                      </td>
                      <td className="py-2.5 text-[#E6EDF7] font-semibold">{iv.clinician_name}</td>
                      <td className="py-2.5 text-[#8A9AB4] uppercase text-[10px] font-mono">{iv.mode}</td>
                      <td className="py-2.5 text-[#8A9AB4]">{iv.interviewer || '—'}</td>
                      <td className="py-2.5">
                        <StatusPill status={iv.outcome} />
                      </td>
                      <td className="py-2.5 text-right">
                        {iv.outcome === 'scheduled' ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleInterviewOutcome(iv.id, 'completed')}
                              className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#34D399] hover:border-[#34D399]/50"
                            >
                              Completed
                            </button>
                            <button
                              onClick={() => handleInterviewOutcome(iv.id, 'no_show')}
                              className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#FB7185] hover:border-[#FB7185]/50"
                            >
                              No Show
                            </button>
                            <button
                              onClick={() => handleInterviewOutcome(iv.id, 'cancelled')}
                              className="px-2 py-1 rounded border border-[#1E2A44] text-[11px] text-[#8A9AB4] hover:text-[#FBBF24] hover:border-[#FBBF24]/50"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#8A9AB4]/60 font-mono">recorded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Schedule Interview Modal */}
      {interviewSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-md p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E2A44] pb-3">
              <h2 className="text-sm font-semibold text-[#E6EDF7]">
                Schedule Interview: {interviewSub.clinician_name}
              </h2>
              <button onClick={() => setInterviewSub(null)} className="text-[#8A9AB4]">✕</button>
            </div>

            <form onSubmit={handleScheduleInterview} className="space-y-3 text-xs">
              <div>
                <label className="block text-[#8A9AB4] mb-1">Date &amp; Time</label>
                <input
                  type="datetime-local"
                  required
                  value={interviewForm.scheduled_at}
                  onChange={(e) => setInterviewForm({ ...interviewForm, scheduled_at: e.target.value })}
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[#8A9AB4] mb-1">Duration (min)</label>
                  <select
                    value={interviewForm.duration_minutes}
                    onChange={(e) => setInterviewForm({ ...interviewForm, duration_minutes: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  >
                    {[30, 45, 60, 90].map((d) => (
                      <option key={d} value={d}>{d} minutes</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#8A9AB4] mb-1">Mode</label>
                  <select
                    value={interviewForm.mode}
                    onChange={(e) => setInterviewForm({ ...interviewForm, mode: e.target.value })}
                    className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                  >
                    {['video', 'phone', 'onsite'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[#8A9AB4] mb-1">Interviewer</label>
                <input
                  type="text"
                  value={interviewForm.interviewer}
                  onChange={(e) => setInterviewForm({ ...interviewForm, interviewer: e.target.value })}
                  placeholder="Hiring manager or panel lead"
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                />
              </div>

              <div>
                <label className="block text-[#8A9AB4] mb-1">Notes</label>
                <textarea
                  rows={3}
                  value={interviewForm.notes}
                  onChange={(e) => setInterviewForm({ ...interviewForm, notes: e.target.value })}
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded p-2 text-[#E6EDF7]"
                />
              </div>

              <div className="pt-3 border-t border-[#1E2A44] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewSub(null)}
                  className="px-3 py-1.5 border border-[#1E2A44] rounded text-[#8A9AB4]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={interviewSaving}
                  className="px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold rounded disabled:opacity-60"
                >
                  {interviewSaving ? 'Scheduling...' : 'Schedule Interview'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
