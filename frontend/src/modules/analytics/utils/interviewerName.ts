export const sanitizeInterviewerName = (value: string): string => {
  if (!value) {
    return '';
  }

  const emailPattern = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
  let cleaned = value.replace(emailPattern, '').replace(/[<>]/g, ' ');
  cleaned = cleaned.replace(/\(\s*\)/g, ' ');
  cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
  return cleaned || value.trim();
};
