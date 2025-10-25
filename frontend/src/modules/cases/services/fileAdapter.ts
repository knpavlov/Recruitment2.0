import { CaseFileUploadDto } from '../../../shared/types/caseLibrary';

const readFileAsDataUrl = (file: File, onChunk?: (loadedBytes: number) => void) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    let reported = 0;

    reader.onload = () => {
      if (onChunk) {
        const remaining = file.size - reported;
        if (remaining > 0) {
          onChunk(remaining);
        }
      }
      resolve(String(reader.result));
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read the file.'));
    };

    if (onChunk) {
      reader.onprogress = (event) => {
        if (!event.lengthComputable) {
          return;
        }
        const delta = event.loaded - reported;
        if (delta > 0) {
          reported += delta;
          onChunk(delta);
        }
      };
    }

    reader.readAsDataURL(file);
  });

export const convertFilesToRecords = async (
  files: File[],
  onProgress?: (percentage: number) => void
): Promise<CaseFileUploadDto[]> => {
  if (!files.length) {
    return [];
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  let loaded = 0;

  const updateProgress = () => {
    if (!onProgress) {
      return;
    }
    const percentage = totalSize ? (loaded / totalSize) * 100 : 100;
    onProgress(Math.min(100, Math.max(0, percentage)));
  };

  if (onProgress) {
    onProgress(0);
  }

  const records: CaseFileUploadDto[] = [];
  for (const file of files) {
    const dataUrl = await readFileAsDataUrl(file, (chunk) => {
      loaded += chunk;
      updateProgress();
    });

    if (!totalSize) {
      updateProgress();
    }

    records.push({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl
    });
  }

  if (onProgress) {
    onProgress(100);
  }

  return records;
};
