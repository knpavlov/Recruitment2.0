import { CandidateResume } from '../../../shared/types/candidate';
import { generateId } from '../../../shared/ui/generateId';

type ProgressListener = (value: number) => void;

const readFileAsDataUrl = (file: File, onProgress?: ProgressListener) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();

    const emitProgress = (loaded: number) => {
      if (!onProgress) {
        return;
      }
      const ratio = file.size > 0 ? loaded / file.size : 1;
      onProgress(Math.max(0, Math.min(1, ratio)));
    };

    reader.onload = () => {
      emitProgress(file.size);
      resolve(String(reader.result));
    };
    reader.onerror = () => reject(reader.error);
    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      emitProgress(event.loaded);
    };
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

export const convertFileToResume = async (
  file: File,
  onProgress?: ProgressListener
): Promise<CandidateResume> => {
  const dataUrl = await readFileAsDataUrl(file, onProgress);
  const textContent = isTextLikeFile(file)
    ? await readFileAsText(file).catch(() => undefined)
    : undefined;
  onProgress?.(1);
  return {
    id: generateId(),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    textContent
  };
};
