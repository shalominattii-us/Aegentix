import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GitMerge,
  Building2,
  ShieldCheck,
  CheckCircle2,
  LogOut,
  User,
} from 'lucide-react';
import { useAuth } from '../auth';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/candidates', label: 'Candidates', icon: Users },
  { path: '/jobs', label: 'Jobs', icon: Briefcase },
  { path: '/pipeline', label: 'Pipeline', icon: GitMerge },
  { path: '/employers', label: 'Employers', icon: Building2 },
  { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
  { path: '/placements', label: 'Placements', icon: CheckCircle2 },
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="w-60 bg-[#111A2C] border-r border-[#1E2A44] flex flex-col h-screen fixed left-0 top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#1E2A44] flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 bg-[#2DD4BF] rounded-sm" />
          <span className="font-bold tracking-wider text-sm text-[#E6EDF7] font-mono">
            AEGENTIX
          </span>
        </div>
        <div className="flex items-center gap-2 pl-4">
          <span className="text-[10px] font-mono font-semibold tracking-widest text-[#2DD4BF] uppercase bg-[#2DD4BF]/10 px-1.5 py-0.5 rounded border border-[#2DD4BF]/20">
            PROSURANCE
          </span>
          <span className="text-[10px] text-[#8A9AB4] font-mono">OPS v1.0</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[10px] font-semibold text-[#8A9AB4] uppercase tracking-wider">
          Main Console
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/30 font-semibold'
                    : 'text-[#8A9AB4] hover:bg-[#16233B] hover:text-[#E6EDF7] border border-transparent'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* User Block Footer */}
      <div className="p-3 border-t border-[#1E2A44] bg-[#0B1220]/50">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#111A2C] border border-[#1E2A44]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[#16233B] border border-[#1E2A44] flex items-center justify-center text-[#2DD4BF] shrink-0 font-semibold text-xs">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-[#E6EDF7] truncate">
                {user?.full_name || 'Ops User'}
              </div>
              <div className="text-[10px] text-[#8A9AB4] capitalize truncate">
                {user?.role || 'Recruiter'}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-[#8A9AB4] hover:text-[#FB7185] hover:bg-[#FB7185]/10 rounded transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
