import React from 'react';

export function LoadingState({ message = 'Loading operations data...' }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 w-full min-h-[240px]">
      <div className="w-7 h-7 border-2 border-[#2DD4BF] border-t-transparent rounded-full animate-spin mb-3" />
      <span className="text-xs text-[#8A9AB4] font-medium tracking-wide uppercase">
        {message}
      </span>
    </div>
  );
}

export function EmptyState({ title = 'No records found', description, actionLabel, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center p-10 text-center panel-card my-4">
      <div className="w-10 h-10 rounded-lg bg-[#16233B] border border-[#1E2A44] flex items-center justify-center text-[#8A9AB4] mb-3">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-[#E6EDF7] mb-1">{title}</h3>
      {description && <p className="text-xs text-[#8A9AB4] max-w-sm mb-4">{description}</p>}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-3 py-1.5 text-xs font-semibold bg-[#2DD4BF] text-[#0B1220] rounded-lg hover:bg-[#2DD4BF]/90 transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

export function ErrorBanner({ message, onRetry }) {
  if (!message) return null;

  return (
    <div className="bg-[#FB7185]/10 border border-[#FB7185]/30 rounded-lg p-3 my-4 flex items-center justify-between text-xs text-[#FB7185]">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>{message}</span>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-2 py-1 bg-[#FB7185]/20 hover:bg-[#FB7185]/30 text-[#FB7185] rounded font-medium transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  );
}
