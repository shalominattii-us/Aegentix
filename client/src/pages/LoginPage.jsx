import React, { useState } from 'react';
import { useAuth } from '../auth';
import { ShieldCheck, Lock, Mail, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('recruiter@aegentix.health');
  const [password, setPassword] = useState('Prosurance!2026');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoUser = (demoEmail) => {
    setEmail(demoEmail);
    setPassword('Prosurance!2026');
  };

  return (
    <div className="min-h-screen bg-[#0B1220] flex flex-col items-center justify-center p-4">
      {/* Container */}
      <div className="w-full max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#111A2C] border border-[#1E2A44] mb-3 text-[#2DD4BF]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-wider text-[#E6EDF7] font-mono">
            AEGENTIX <span className="text-[#2DD4BF]">PROSURANCE</span>
          </h1>
          <p className="text-xs text-[#8A9AB4] mt-1 font-mono">
            Clinical Recruiting Ops Console
          </p>
        </div>

        {/* Card */}
        <div className="panel-card p-6 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-[#FB7185]/10 border border-[#FB7185]/30 text-xs text-[#FB7185]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#8A9AB4] uppercase tracking-wider mb-1.5 font-mono">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="recruiter@aegentix.health"
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8A9AB4] uppercase tracking-wider mb-1.5 font-mono">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg pl-9 pr-3 py-2 text-xs text-[#E6EDF7] focus:outline-none focus:border-[#2DD4BF]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                'Authenticating...'
              ) : (
                <>
                  <span>Sign In to Ops Room</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Preset Demo Accounts */}
          <div className="mt-6 pt-4 border-t border-[#1E2A44]">
            <div className="text-[10px] font-mono text-[#8A9AB4] uppercase tracking-wider mb-2">
              Demo Credentials
            </div>
            <div className="grid grid-cols-3 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemoUser('recruiter@aegentix.health')}
                className="px-2 py-1.5 rounded bg-[#16233B] border border-[#1E2A44] text-[#E6EDF7] hover:border-[#2DD4BF] transition-colors truncate text-center"
              >
                Recruiter
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('admin@aegentix.health')}
                className="px-2 py-1.5 rounded bg-[#16233B] border border-[#1E2A44] text-[#E6EDF7] hover:border-[#2DD4BF] transition-colors truncate text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoUser('talent@mercyhealth.example')}
                className="px-2 py-1.5 rounded bg-[#16233B] border border-[#1E2A44] text-[#E6EDF7] hover:border-[#2DD4BF] transition-colors truncate text-center"
              >
                Employer
              </button>
            </div>
          </div>
        </div>

        <div className="text-center mt-6 text-[11px] text-[#8A9AB4]">
          Place clinicians faster, with every credential proven.
        </div>
      </div>
    </div>
  );
}
