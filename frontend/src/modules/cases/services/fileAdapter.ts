import { CaseFileUploadDto } from '../../../shared/types/caseLibrary';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const convertFilesToRecords = async (files: File[]): Promise<CaseFileUploadDto[]> => {
  const records = await Promise.all(
    files.map(async (file) => ({
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      dataUrl: await readFileAsDataUrl(file)
    }))
  );
  return records;
};
