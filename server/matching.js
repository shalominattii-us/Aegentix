export function scoreClinicianForJob(job, clinician, credentials = []) {
  let score = 0;
  const reasons = [];

  // Parse required_certs & required_states if string
  let reqCerts = [];
  if (Array.isArray(job.required_certs)) {
    reqCerts = job.required_certs;
  } else if (typeof job.required_certs === 'string' && job.required_certs.trim()) {
    try { reqCerts = JSON.parse(job.required_certs); } catch (e) { reqCerts = []; }
  }

  let reqStates = [];
  if (Array.isArray(job.required_states)) {
    reqStates = job.required_states;
  } else if (typeof job.required_states === 'string' && job.required_states.trim()) {
    try { reqStates = JSON.parse(job.required_states); } catch (e) { reqStates = []; }
  }

  // 1. Discipline (20 pts)
  if (clinician.discipline && job.discipline && clinician.discipline === job.discipline) {
    score += 20;
    reasons.push(`${clinician.discipline} matches requisition discipline`);
  }

  // 2. Specialty (25 pts or 15 pts)
  const cSpec = (clinician.specialty || '').trim().toLowerCase();
  const jSpec = (job.specialty || '').trim().toLowerCase();
  if (cSpec && jSpec) {
    if (cSpec === jSpec) {
      score += 25;
      reasons.push(`Specialty match: ${clinician.specialty}`);
    } else if (cSpec.includes(jSpec) || jSpec.includes(cSpec)) {
      score += 15;
      reasons.push(`Related specialty: ${clinician.specialty}`);
    }
  }

  // 3. License state (20 pts or 12 pts or 0)
  const verifiedLicInState = credentials.some(c =>
    c.type === 'license' &&
    c.status === 'verified' &&
    c.state && job.state &&
    c.state.toUpperCase() === job.state.toUpperCase()
  );

  const hasCompactLic = credentials.some(c =>
    c.type === 'license' &&
    c.status === 'verified' &&
    ( (c.name && (c.name.includes('IMLC') || c.name.includes('NLC') || c.name.toLowerCase().includes('compact'))) ||
      (c.issuer && (c.issuer.includes('IMLC') || c.issuer.includes('NLC'))) ||
      (c.number && (c.number.includes('IMLC') || c.number.includes('NLC'))) )
  );

  if (verifiedLicInState) {
    score += 20;
    reasons.push(`Licensed in ${job.state}`);
  } else if (hasCompactLic || reqStates.length === 0) {
    score += 12;
    reasons.push(hasCompactLic ? `Compact license eligibility` : `State criteria eligible`);
  }

  // 4. Availability (10 pts, 6 pts, 2 pts)
  if (clinician.availability_date && job.start_date) {
    const avail = new Date(clinician.availability_date);
    const start = new Date(job.start_date);
    if (!isNaN(avail.getTime()) && !isNaN(start.getTime())) {
      const diffDays = Math.ceil((avail.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      if (avail <= start) {
        score += 10;
        reasons.push(`Available before start date`);
      } else if (diffDays <= 30) {
        score += 6;
        reasons.push(`Available within 30 days of start date`);
      } else {
        score += 2;
      }
    } else {
      score += 6;
    }
  } else {
    score += 6;
  }

  // 5. Rate (15 pts, 8 pts, 0 pts)
  if (typeof clinician.rate_min === 'number' && typeof job.rate_max === 'number' && job.rate_max > 0) {
    if (clinician.rate_min <= job.rate_max) {
      score += 15;
      reasons.push(`Rate within bill range`);
    } else if (clinician.rate_min > job.rate_max * 1.15) {
      // 0 pts
    } else {
      score += 8;
      reasons.push(`Rate slightly above target range`);
    }
  } else {
    score += 8;
  }

  // 6. Required Certifications (0-10 pts)
  if (reqCerts.length === 0) {
    score += 10;
    reasons.push(`All required certifications met`);
  } else {
    let matchedCerts = 0;
    for (const cert of reqCerts) {
      const certLower = cert.toLowerCase();
      const hasCert = credentials.some(c =>
        (c.status === 'verified' || c.status === 'pending') &&
        ( (c.name && c.name.toLowerCase().includes(certLower)) ||
          (c.type && c.type.toLowerCase().includes(certLower)) )
      );
      if (hasCert) matchedCerts++;
    }
    const certPts = Math.round(10 * (matchedCerts / reqCerts.length));
    score += certPts;
    reasons.push(`${matchedCerts} of ${reqCerts.length} certifications`);
  }

  // 7. Willing to travel (+5 pts)
  if (clinician.state && job.state && clinician.state.toUpperCase() !== job.state.toUpperCase()) {
    if (clinician.willing_to_travel === 1 || clinician.willing_to_travel === true) {
      score += 5;
      reasons.push(`Willing to travel`);
    }
  }

  const finalScore = Math.min(100, Math.max(0, Math.round(score)));
  return { score: finalScore, reasons };
}
