export interface CandidateResume {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  dataUrl: string;
  textContent?: string;
}

export interface CandidateProfile {
  id: string;
  version: number;
  firstName: string;
  lastName: string;
  age?: number;
  city?: string;
  desiredPosition?: string;
  phone?: string;
  email?: string;
  experienceSummary?: string;
  totalExperienceYears?: number;
  consultingExperienceYears?: number;
  consultingCompanies?: string;
  lastCompany?: string;
  lastPosition?: string;
  lastDuration?: string;
  resume?: CandidateResume;
  createdAt: string;
  updatedAt: string;
}
