import React, { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import NewSubmissionModal from './NewSubmissionModal';

export default function Layout({ children, pageTitle, actions }) {
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0B1220] text-[#E6EDF7] flex">
      {/* Sidebar */}
      <Sidebar />

      {/* Top Header */}
      <TopBar
        title={pageTitle}
        actions={actions}
        onOpenNewSubmission={() => setIsSubmissionModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 ml-60 mt-14 p-6 overflow-y-auto">
        {children}
      </main>

      {/* Global New Submission Modal */}
      <NewSubmissionModal
        isOpen={isSubmissionModalOpen}
        onClose={() => setIsSubmissionModalOpen(false)}
        onSuccess={() => {
          // Trigger a window event or let pages handle state re-fetch if needed
          window.dispatchEvent(new CustomEvent('submission-created'));
        }}
      />
    </div>
  );
}
