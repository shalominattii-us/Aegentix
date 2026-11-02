import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import authRoutes from './routes/auth.js';
import dashboardRoutes from './routes/dashboard.js';
import cliniciansRoutes from './routes/clinicians.js';
import credentialsRoutes from './routes/credentials.js';
import employersRoutes from './routes/employers.js';
import jobsRoutes from './routes/jobs.js';
import submissionsRoutes from './routes/submissions.js';
import placementsRoutes from './routes/placements.js';
import complianceRoutes from './routes/compliance.js';
import messagesRoutes from './routes/messages.js';
import exportsRoutes from './routes/exports.js';

const app = express();

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/dashboard', dashboardRoutes);
app.use('/api/v1/clinicians', cliniciansRoutes);
app.use('/api/v1/credentials', credentialsRoutes);
app.use('/api/v1/employers', employersRoutes);
app.use('/api/v1/jobs', jobsRoutes);
app.use('/api/v1/submissions', submissionsRoutes);
app.use('/api/v1/placements', placementsRoutes);
app.use('/api/v1/compliance', complianceRoutes);
app.use('/api/v1/messages', messagesRoutes);
app.use('/api/v1/exports', exportsRoutes);

// Serve static frontend from client/dist if present
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, '..', 'client', 'dist');

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    res.sendFile(path.resolve(clientDistPath, 'index.html'));
  });
}

const PORT = process.env.PORT || 8787;

const isMain = process.argv[1] && (
  process.argv[1].endsWith('server/index.js') ||
  process.argv[1].endsWith('server/index') ||
  process.argv[1] === fileURLToPath(import.meta.url)
);

if (isMain) {
  app.listen(PORT, () => {
    console.log(`AEGENTIX Prosurance API server listening on port ${PORT}`);
  });
}

export { app };
export default app;
