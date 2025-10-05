// Minimal slug generator based on folder names
export const slugify = (value: string) => {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}0-9\s-]/gu, '')
    .replace(/\s+/g, '-');
};
