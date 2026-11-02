import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/Layout';
import api from '../api';
import { LoadingState, EmptyState, ErrorBanner } from '../components/LoadingState';
import StatusPill from '../components/StatusPill';
import { formatRelativeTime } from '../utils/formatters';
import { GitMerge, ChevronRight, XCircle, Building2, User } from 'lucide-react';

const STAGES = [
  { id: 'sourced', name: 'Sourced' },
  { id: 'screened', name: 'Screened' },
  { id: 'submitted', name: 'Submitted' },
  { id: 'client_review', name: 'Client Review' },
  { id: 'interview', name: 'Interview' },
  { id: 'offer', name: 'Offer' },
  { id: 'placed', name: 'Placed' },
  { id: 'rejected', name: 'Rejected' },
  { id: 'withdrawn', name: 'Withdrawn' },
];

export default function PipelinePage() {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadPipeline = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/submissions', { limit: 200 });
      setSubmissions(res.items || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch pipeline submissions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPipeline();

    const handleSubmissionCreated = () => loadPipeline();
    window.addEventListener('submission-created', handleSubmissionCreated);
    return () => window.removeEventListener('submission-created', handleSubmissionCreated);
  }, []);

  const handleAdvanceStage = async (id, currentStage) => {
    const stageIds = STAGES.map((s) => s.id);
    const currentIndex = stageIds.indexOf(currentStage);
    if (currentIndex >= 0 && currentIndex < stageIds.length - 1) {
      const nextStage = stageIds[currentIndex + 1];
      updateStage(id, nextStage);
    }
  };

  const updateStage = async (id, stage, rejection_reason = undefined) => {
    setUpdatingId(id);
    try {
      await api.patch(`/submissions/${id}`, { stage, rejection_reason });
      loadPipeline();
    } catch (err) {
      alert(err.message || 'Failed to update submission stage.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleReject = (id) => {
    const reason = prompt('Enter rejection reason (optional):') || 'Client passed on candidate';
    updateStage(id, 'rejected', reason);
  };

  if (loading) {
    return (
      <Layout pageTitle="Placement Pipeline">
        <LoadingState message="Fetching pipeline Kanban stages..." />
      </Layout>
    );
  }

  return (
    <Layout pageTitle="Placement Pipeline">
      <div className="space-y-4">
        {error && <ErrorBanner message={error} onRetry={loadPipeline} />}

        {/* 9 Kanban Columns Board */}
        <div className="flex gap-3 overflow-x-auto pb-6 min-h-[calc(100vh-140px)]">
          {STAGES.map((stageObj) => {
            const stageSubs = submissions.filter((s) => s.stage === stageObj.id);

            return (
              <div
                key={stageObj.id}
                className="w-72 shrink-0 bg-[#111A2C] border border-[#1E2A44] rounded-xl flex flex-col h-full"
              >
                {/* Column Header */}
                <div className="p-3 border-b border-[#1E2A44] flex items-center justify-between bg-[#0B1220]/40 rounded-t-xl">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold text-[#E6EDF7] uppercase tracking-wider">
                      {stageObj.name}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-[#16233B] text-[#2DD4BF] font-mono text-[11px] font-bold border border-[#1E2A44]">
                    {stageSubs.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto max-h-[70vh]">
                  {stageSubs.length === 0 ? (
                    <div className="py-8 text-center text-[11px] text-[#8A9AB4]/60 font-mono">
                      No submissions
                    </div>
                  ) : (
                    stageSubs.map((sub) => (
                      <div
                        key={sub.id}
                        className="panel-card p-3 space-y-2 bg-[#0B1220] border-[#1E2A44] hover:border-[#2DD4BF]/40 transition-all text-xs"
                      >
                        <div className="flex items-start justify-between gap-1">
                          <Link
                            to={`/candidates/${sub.clinician_id}`}
                            className="font-bold text-[#E6EDF7] hover:text-[#2DD4BF] transition-colors truncate"
                          >
                            {sub.clinician_name}
                          </Link>
                          <span className="px-1.5 py-0.5 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 font-mono text-[10px] font-bold shrink-0">
                            {sub.match_score}% Match
                          </span>
                        </div>

                        <div className="text-[11px] text-[#8A9AB4] space-y-1">
                          <Link
                            to={`/jobs/${sub.job_id}`}
                            className="text-[#E6EDF7] hover:underline block truncate font-medium"
                          >
                            {sub.job_title}
                          </Link>
                          <div className="flex items-center gap-1 text-[10px] text-[#8A9AB4]">
                            <Building2 className="w-3 h-3 text-[#2DD4BF]" />
                            <span className="truncate">{sub.employer_name}</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-[#1E2A44] flex items-center justify-between text-[10px] text-[#8A9AB4]">
                          <span className="font-mono">{formatRelativeTime(sub.submitted_at)}</span>

                          {/* Quick Controls */}
                          <div className="flex items-center gap-1">
                            {sub.stage !== 'rejected' && sub.stage !== 'withdrawn' && sub.stage !== 'placed' && (
                              <button
                                onClick={() => handleReject(sub.id)}
                                title="Reject candidate"
                                className="p-1 rounded hover:bg-[#FB7185]/20 text-[#FB7185] transition-colors"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sub.stage !== 'placed' && sub.stage !== 'rejected' && sub.stage !== 'withdrawn' && (
                              <button
                                disabled={updatingId === sub.id}
                                onClick={() => handleAdvanceStage(sub.id, sub.stage)}
                                title="Advance to next stage"
                                className="p-1 rounded bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30 transition-colors flex items-center gap-0.5"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
