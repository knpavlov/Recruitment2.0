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

export const convertFileToResume = async (file: File): Promise<CandidateResume> => ({
  id: generateId(),
  fileName: file.name,
  mimeType: file.type,
  size: file.size,
  uploadedAt: new Date().toISOString(),
  dataUrl: await readFileAsDataUrl(file),
  textContent: await readFileAsText(file)
});
