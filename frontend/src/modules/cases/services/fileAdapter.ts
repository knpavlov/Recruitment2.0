import { CaseFileRecord } from '../../../shared/types/caseLibrary';
import { generateId } from '../../../shared/ui/generateId';

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

export const convertFilesToRecords = async (files: File[]): Promise<CaseFileRecord[]> => {
  const timestamp = new Date().toISOString();
  const records = await Promise.all(
    files.map(async (file) => ({
      id: generateId(),
      fileName: file.name,
      mimeType: file.type,
      size: file.size,
      uploadedAt: timestamp,
      dataUrl: await readFileAsDataUrl(file)
    }))
  );
  return records;
};
