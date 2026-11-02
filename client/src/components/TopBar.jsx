import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, Plus } from 'lucide-react';

export default function TopBar({ onOpenNewSubmission, title, actions }) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/candidates?query=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  // Derive title from route if not provided
  const getPageTitle = () => {
    if (title) return title;
    const path = location.pathname;
    if (path === '/') return 'Ops Overview';
    if (path.startsWith('/candidates')) return 'Candidate Roster';
    if (path.startsWith('/jobs')) return 'Requisitions & Jobs';
    if (path.startsWith('/pipeline')) return 'Placement Pipeline';
    if (path.startsWith('/employers')) return 'Employer Accounts';
    if (path.startsWith('/compliance')) return 'Credential Compliance';
    if (path.startsWith('/placements')) return 'Active Placements';
    return 'Recruiting Ops';
  };

  return (
    <header className="h-14 bg-[#111A2C] border-b border-[#1E2A44] fixed top-0 left-60 right-0 z-20 px-6 flex items-center justify-between gap-4">
      {/* Page Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-sm font-semibold text-[#E6EDF7] uppercase tracking-wide font-mono">
          {getPageTitle()}
        </h1>
      </div>

      {/* Center/Right Controls */}
      <div className="flex items-center gap-4">
        {/* Global Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-72">
          <Search className="w-3.5 h-3.5 text-[#8A9AB4] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search candidates (e.g. RN, Travel)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0B1220] border border-[#1E2A44] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[#E6EDF7] placeholder-[#8A9AB4]/60 focus:outline-none focus:border-[#2DD4BF] transition-colors"
          />
        </form>

        {/* Page-level actions (exports, etc.) */}
        {actions}

        {/* New Submission Primary Button */}
        <button
          onClick={onOpenNewSubmission}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2DD4BF] text-[#0B1220] font-semibold text-xs rounded-lg hover:bg-[#2DD4BF]/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Submission</span>
        </button>
      </div>
    </header>
  );
}
