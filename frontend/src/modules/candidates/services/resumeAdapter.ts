import { CandidateResume } from '../../../shared/types/candidate';
import { generateId } from '../../../shared/ui/generateId';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

const isTextLikeFile = (file: File) => {
  if (file.type.startsWith('text/')) {
    return true;
  }
  const lowercaseName = file.name.toLowerCase();
  return lowercaseName.endsWith('.txt') || lowercaseName.endsWith('.md') || lowercaseName.endsWith('.json');
};

export const convertFileToResume = async (file: File): Promise<CandidateResume> => ({
  id: generateId(),
  fileName: file.name,
  mimeType: file.type,
  size: file.size,
  uploadedAt: new Date().toISOString(),
  dataUrl: await readFileAsDataUrl(file),
  textContent: isTextLikeFile(file)
    ? await readFileAsText(file).catch(() => undefined)
    : undefined
});
