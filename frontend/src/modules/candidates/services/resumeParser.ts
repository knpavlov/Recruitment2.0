import { CandidateProfile } from '../../../shared/types/candidate';

const extractValue = (text: string, patterns: RegExp[]): string | undefined => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
};

export const parseResumeText = (text: string): Partial<CandidateProfile> => {
  const safeText = text.replace(/\r/g, '');
  const firstLine = safeText.split('\n').find((line) => line.trim().length > 0) ?? '';
  const [maybeFirstName, maybeLastName] = firstLine.split(/\s+/);

  const firstName =
    extractValue(safeText, [/(?:First Name|Given Name|Name)[:\-]\s*(.+)/i]) || maybeFirstName;
  const lastName = extractValue(safeText, [/(?:Last Name|Family Name|Surname)[:\-]\s*(.+)/i]) || maybeLastName;
  const city = extractValue(safeText, [/(?:City|Location|Town)[:\-]\s*(.+)/i]);
  const desiredPosition = extractValue(safeText, [/(?:Desired Position|Target Role|Position)[:\-]\s*(.+)/i]);
  const phone = extractValue(safeText, [/(?:Phone|Mobile|Telephone)[:\-]\s*(.+)/i, /(\+\d[\d\s\-()]{6,})/]);
  const email = extractValue(safeText, [/Email[:\-]\s*(.+)/i, /E-mail[:\-]\s*(.+)/i, /([\w.-]+@[\w.-]+)/]);
  const lastCompany = extractValue(safeText, [/(?:Last Company|Most Recent Company|Employer)[:\-]\s*(.+)/i]);
  const lastPosition = extractValue(safeText, [/(?:Last Position|Most Recent Position|Role)[:\-]\s*(.+)/i]);
  const experienceSummary = extractValue(safeText, [/Summary[:\-]\s*([\s\S]+?)\n\n/i]);

  const totalExpMatch = safeText.match(/(\d{1,2})\s*(?:years|yrs)\s*(?:of\s+)?experience/i);
  const consultingExpMatch = safeText.match(/(\d{1,2})\s*(?:years|yrs).*consult/i);

  return {
    firstName: firstName || '',
    lastName: lastName || '',
    city,
    desiredPosition,
    phone,
    email,
    lastCompany,
    lastPosition,
    experienceSummary,
    totalExperienceYears: totalExpMatch ? Number(totalExpMatch[1]) : undefined,
    consultingExperienceYears: consultingExpMatch ? Number(consultingExpMatch[1]) : undefined
  };
};
