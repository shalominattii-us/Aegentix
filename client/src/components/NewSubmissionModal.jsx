import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import api from '../api';

export default function NewSubmissionModal({ isOpen, onClose, onSuccess, initialClinicianId, initialJobId }) {
  const [clinicians, setClinicians] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [selectedClinicianId, setSelectedClinicianId] = useState(initialClinicianId || '');
  const [selectedJobId, setSelectedJobId] = useState(initialJobId || '');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setSelectedClinicianId(initialClinicianId || '');
      setSelectedJobId(initialJobId || '');
      setNotes('');
      setError('');
      loadData();
    }
  }, [isOpen, initialClinicianId, initialJobId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [clinRes, jobsRes] = await Promise.all([
        api.get('/clinicians', { limit: 100, status: 'active' }),
        api.get('/jobs', { limit: 100, status: 'open' }),
      ]);
      setClinicians(clinRes.items || []);
      setJobs(jobsRes.items || []);
    } catch (err) {
      setError(err.message || 'Failed to load options for submission.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedClinicianId || !selectedJobId) {
      setError('Please select both a clinician and a job.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/submissions', {
        job_id: Number(selectedJobId),
        clinician_id: Number(selectedClinicianId),
        notes: notes.trim() || undefined,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to create submission.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-[#111A2C] border border-[#1E2A44] rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-5 py-4 border-b border-[#1E2A44] flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#E6EDF7]">New Candidate Submission</h2>
          <button
            onClick={onClose}
            className="text-[#8A9AB4] hover:text-[#E6EDF7] p-1 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-lg text-[#FB7185]">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-[#8A9AB4]">Loading active candidates and open jobs...</div>
          ) : (
            <>
              <div>
                <label className="block text-[#8A9AB4] font-medium mb-1.5 uppercase tracking-wide text-[11px]">
                  Select Clinician
                </label>
                <select
                  value={selectedClinicianId}
                  onChange={(e) => setSelectedClinicianId(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg px-3 py-2 text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
                  required
                >
                  <option value="">-- Choose Clinician --</option>
                  {clinicians.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name} ({c.discipline} - {c.specialty || 'General'}, {c.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8A9AB4] font-medium mb-1.5 uppercase tracking-wide text-[11px]">
                  Select Job Requisition
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg px-3 py-2 text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
                  required
                >
                  <option value="">-- Choose Job --</option>
                  {jobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      #{j.id} - {j.title} ({j.employer_name || `Employer #${j.employer_id}`}, {j.state})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[#8A9AB4] font-medium mb-1.5 uppercase tracking-wide text-[11px]">
                  Submission Notes (Optional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Add recruiter notes regarding availability, rate agreement, or client fit..."
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg p-3 text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF] placeholder-[#8A9AB4]/50"
                />
              </div>
            </>
          )}

          <div className="pt-3 border-t border-[#1E2A44] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-[#1E2A44] text-[#8A9AB4] hover:text-[#E6EDF7] font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loading}
              className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-[#0B1220] font-semibold hover:bg-[#2DD4BF]/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              {submitting ? 'Submitting...' : 'Submit Candidate'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
