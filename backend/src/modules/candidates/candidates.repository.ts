import { postgresPool } from '../../shared/database/postgres.client.js';
import type { CandidateRecord, CandidateUpsertInput } from './candidates.service.js';

interface CandidateRow extends Record<string, unknown> {
  id: string;
  first_name: string;
  last_name: string;
  gender: string | null;
  age: number | null;
  city: string | null;
  desired_position: string | null;
  phone: string | null;
  email: string | null;
  experience_summary: string | null;
  total_experience_years: number | null;
  consulting_experience_years: number | null;
  consulting_companies: string | null;
  last_company: string | null;
  last_position: string | null;
  last_duration: string | null;
  resume_id: string | null;
  resume_file_name: string | null;
  resume_mime_type: string | null;
  resume_size: number | null;
  resume_data_url: string | null;
  resume_uploaded_at: string | Date | null;
  resume_text_content: string | null;
  version: number;
  created_at: string | Date;
  updated_at: string | Date;
}

const toIsoString = (value: string | Date | null): string | undefined => {
  if (!value) {
    return undefined;
  }
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }
  return date.toISOString();
};

const mapRowToRecord = (row: CandidateRow): CandidateRecord => {
  const resumeUploadedAt = toIsoString(row.resume_uploaded_at);

  const resume = row.resume_file_name
    ? {
        id: row.resume_id ?? row.id,
        fileName: row.resume_file_name,
        mimeType: row.resume_mime_type ?? 'application/octet-stream',
        size: typeof row.resume_size === 'number' ? row.resume_size : Number(row.resume_size ?? 0),
        uploadedAt: resumeUploadedAt ?? toIsoString(row.updated_at) ?? new Date().toISOString(),
        dataUrl: row.resume_data_url ?? '',
        textContent: row.resume_text_content ?? undefined
      }
    : undefined;

  return {
    id: row.id,
    version: row.version,
    firstName: row.first_name,
    lastName: row.last_name,
    gender: row.gender ?? undefined,
    age: row.age ?? undefined,
    city: row.city ?? undefined,
    desiredPosition: row.desired_position ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    experienceSummary: row.experience_summary ?? undefined,
    totalExperienceYears: row.total_experience_years ?? undefined,
    consultingExperienceYears: row.consulting_experience_years ?? undefined,
    consultingCompanies: row.consulting_companies ?? undefined,
    lastCompany: row.last_company ?? undefined,
    lastPosition: row.last_position ?? undefined,
    lastDuration: row.last_duration ?? undefined,
    resume,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? toIsoString(row.created_at) ?? new Date().toISOString()
  };
};

const extractResumeParams = (input: CandidateUpsertInput) => {
  const resume = input.resume;
  if (!resume) {
    return {
      resume_id: null,
      resume_file_name: null,
      resume_mime_type: null,
      resume_size: null,
      resume_data_url: null,
      resume_uploaded_at: null,
      resume_text_content: null
    };
  }

  return {
    resume_id: resume.id ?? null,
    resume_file_name: resume.fileName ?? null,
    resume_mime_type: resume.mimeType ?? null,
    resume_size: typeof resume.size === 'number' ? resume.size : null,
    resume_data_url: resume.dataUrl ?? null,
    resume_uploaded_at: resume.uploadedAt ?? null,
    resume_text_content: resume.textContent ?? null
  };
};

export class CandidatesRepository {
  async listCandidates(): Promise<CandidateRecord[]> {
    const result = await postgresPool.query<CandidateRow>(
      `SELECT
        id,
        first_name,
        last_name,
        gender,
        age,
        city,
        desired_position,
        phone,
        email,
        experience_summary,
        total_experience_years,
        consulting_experience_years,
        consulting_companies,
        last_company,
        last_position,
        last_duration,
        resume_id,
        resume_file_name,
        resume_mime_type,
        resume_size,
        resume_data_url,
        resume_uploaded_at,
        resume_text_content,
        version,
        created_at,
        updated_at
      FROM candidates
      ORDER BY updated_at DESC, created_at DESC;`
    );
    return result.rows.map(mapRowToRecord);
  }

  async findCandidate(id: string): Promise<CandidateRecord | null> {
    const result = await postgresPool.query<CandidateRow>(
      `SELECT
        id,
        first_name,
        last_name,
        gender,
        age,
        city,
        desired_position,
        phone,
        email,
        experience_summary,
        total_experience_years,
        consulting_experience_years,
        consulting_companies,
        last_company,
        last_position,
        last_duration,
        resume_id,
        resume_file_name,
        resume_mime_type,
        resume_size,
        resume_data_url,
        resume_uploaded_at,
        resume_text_content,
        version,
        created_at,
        updated_at
      FROM candidates
      WHERE id = $1
      LIMIT 1;`,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToRecord(result.rows[0]!);
  }

  async createCandidate(id: string, input: CandidateUpsertInput): Promise<CandidateRecord> {
    const resumeParams = extractResumeParams(input);
    const result = await postgresPool.query<CandidateRow>(
      `INSERT INTO candidates (
        id,
        first_name,
        last_name,
        gender,
        age,
        city,
        desired_position,
        phone,
        email,
        experience_summary,
        total_experience_years,
        consulting_experience_years,
        consulting_companies,
        last_company,
        last_position,
        last_duration,
        resume_id,
        resume_file_name,
        resume_mime_type,
        resume_size,
        resume_data_url,
        resume_uploaded_at,
        resume_text_content
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23
      )
      RETURNING
        id,
        first_name,
        last_name,
        gender,
        age,
        city,
        desired_position,
        phone,
        email,
        experience_summary,
        total_experience_years,
        consulting_experience_years,
        consulting_companies,
        last_company,
        last_position,
        last_duration,
        resume_id,
        resume_file_name,
        resume_mime_type,
        resume_size,
        resume_data_url,
        resume_uploaded_at,
        resume_text_content,
        version,
        created_at,
        updated_at;`,
      [
        id,
        input.firstName,
        input.lastName,
        input.gender ?? null,
        input.age ?? null,
        input.city ?? null,
        input.desiredPosition ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.experienceSummary ?? null,
        input.totalExperienceYears ?? null,
        input.consultingExperienceYears ?? null,
        input.consultingCompanies ?? null,
        input.lastCompany ?? null,
        input.lastPosition ?? null,
        input.lastDuration ?? null,
        resumeParams.resume_id,
        resumeParams.resume_file_name,
        resumeParams.resume_mime_type,
        resumeParams.resume_size,
        resumeParams.resume_data_url,
        resumeParams.resume_uploaded_at,
        resumeParams.resume_text_content
      ]
    );

    return mapRowToRecord(result.rows[0]!);
  }

  async updateCandidate(
    id: string,
    input: CandidateUpsertInput,
    expectedVersion: number
  ): Promise<CandidateRecord | null> {
    const resumeParams = extractResumeParams(input);
    const result = await postgresPool.query<CandidateRow>(
      `UPDATE candidates SET
        first_name = $2,
        last_name = $3,
        gender = $4,
        age = $5,
        city = $6,
        desired_position = $7,
        phone = $8,
        email = $9,
        experience_summary = $10,
        total_experience_years = $11,
        consulting_experience_years = $12,
        consulting_companies = $13,
        last_company = $14,
        last_position = $15,
        last_duration = $16,
        resume_id = $17,
        resume_file_name = $18,
        resume_mime_type = $19,
        resume_size = $20,
        resume_data_url = $21,
        resume_uploaded_at = $22,
        resume_text_content = $23,
        updated_at = NOW(),
        version = version + 1
      WHERE id = $1 AND version = $24
      RETURNING
        id,
        first_name,
        last_name,
        gender,
        age,
        city,
        desired_position,
        phone,
        email,
        experience_summary,
        total_experience_years,
        consulting_experience_years,
        consulting_companies,
        last_company,
        last_position,
        last_duration,
        resume_id,
        resume_file_name,
        resume_mime_type,
        resume_size,
        resume_data_url,
        resume_uploaded_at,
        resume_text_content,
        version,
        created_at,
        updated_at;`,
      [
        id,
        input.firstName,
        input.lastName,
        input.gender ?? null,
        input.age ?? null,
        input.city ?? null,
        input.desiredPosition ?? null,
        input.phone ?? null,
        input.email ?? null,
        input.experienceSummary ?? null,
        input.totalExperienceYears ?? null,
        input.consultingExperienceYears ?? null,
        input.consultingCompanies ?? null,
        input.lastCompany ?? null,
        input.lastPosition ?? null,
        input.lastDuration ?? null,
        resumeParams.resume_id,
        resumeParams.resume_file_name,
        resumeParams.resume_mime_type,
        resumeParams.resume_size,
        resumeParams.resume_data_url,
        resumeParams.resume_uploaded_at,
        resumeParams.resume_text_content,
        expectedVersion
      ]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return mapRowToRecord(result.rows[0]!);
  }

  async deleteCandidate(id: string): Promise<boolean> {
    const result = await postgresPool.query('DELETE FROM candidates WHERE id = $1;', [id]);
    const affected = (result as unknown as { rowCount?: number }).rowCount ?? 0;
    return affected > 0;
  }
}
