import { CandidateResume } from '../../../shared/types/candidate';
import { generateId } from '../../../shared/ui/generateId';

type ResumeProgressListener = (value: number) => void;

const readFileAsDataUrl = (file: File, onProgress?: ResumeProgressListener) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      onProgress?.(0.85);
      resolve(String(reader.result));
    };
    reader.onerror = () => reject(reader.error);
    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const total = Math.max(event.total, file.size, 1);
      const ratio = Math.max(0, Math.min(1, event.loaded / total));
      onProgress?.(ratio * 0.85);
    };
    reader.readAsDataURL(file);
  });

const readFileAsText = (file: File, onProgress?: ResumeProgressListener) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      onProgress?.(1);
      resolve(String(reader.result));
    };
    reader.onerror = () => reject(reader.error);
    reader.onprogress = (event) => {
      if (!event.lengthComputable) {
        return;
      }
      const total = Math.max(event.total, file.size, 1);
      const ratio = Math.max(0, Math.min(1, event.loaded / total));
      onProgress?.(0.85 + ratio * 0.15);
    };
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
  onProgress?: ResumeProgressListener
): Promise<CandidateResume> => {
  onProgress?.(0);
  const dataUrl = await readFileAsDataUrl(file, onProgress);
  let textContent: string | undefined;
  if (isTextLikeFile(file)) {
    try {
      textContent = await readFileAsText(file, onProgress);
    } catch {
      onProgress?.(1);
      textContent = undefined;
    }
  } else {
    onProgress?.(1);
  }

  return {
    id: generateId(),
    fileName: file.name,
    mimeType: file.type,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    dataUrl,
    textContent
  } satisfies CandidateResume;
};
