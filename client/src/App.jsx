import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, ProtectedRoute } from './auth';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import CandidatesPage from './pages/CandidatesPage';
import CandidateDetailPage from './pages/CandidateDetailPage';
import JobsPage from './pages/JobsPage';
import JobDetailPage from './pages/JobDetailPage';
import PipelinePage from './pages/PipelinePage';
import EmployersPage from './pages/EmployersPage';
import CompliancePage from './pages/CompliancePage';
import PlacementsPage from './pages/PlacementsPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidates"
          element={
            <ProtectedRoute>
              <CandidatesPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/candidates/:id"
          element={
            <ProtectedRoute>
              <CandidateDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs"
          element={
            <ProtectedRoute>
              <JobsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/jobs/:id"
          element={
            <ProtectedRoute>
              <JobDetailPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/pipeline"
          element={
            <ProtectedRoute>
              <PipelinePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/employers"
          element={
            <ProtectedRoute>
              <EmployersPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/compliance"
          element={
            <ProtectedRoute>
              <CompliancePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/placements"
          element={
            <ProtectedRoute>
              <PlacementsPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}
