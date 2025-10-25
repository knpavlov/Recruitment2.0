import { CaseFileUploadDto } from '../../../shared/types/caseLibrary';

const readFileWithProgress = (
  file: File,
  onProgress: (loaded: number) => void
) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      onProgress(file.size);
      resolve(String(reader.result));
    };
    reader.onerror = () => reject(reader.error);
    reader.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(event.loaded);
      }
    };
    reader.readAsDataURL(file);
  });

export const convertFilesToRecordsWithProgress = async (
  files: File[],
  onProgress: (ratio: number) => void
): Promise<CaseFileUploadDto[]> => {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  if (totalBytes === 0) {
    onProgress(1);
    return [];
  }
  let processedBytes = 0;

  const records: CaseFileUploadDto[] = [];
  for (const file of files) {
    const dataUrl = await readFileWithProgress(file, (loaded) => {
      const absolute = processedBytes + Math.min(loaded, file.size);
      onProgress(Math.min(absolute / totalBytes, 1));
    });
    processedBytes += file.size;
    onProgress(Math.min(processedBytes / totalBytes, 1));
    records.push({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl
    });
  }
  return records;
};

export const convertFilesToRecords = async (files: File[]): Promise<CaseFileUploadDto[]> =>
  convertFilesToRecordsWithProgress(files, () => {});
