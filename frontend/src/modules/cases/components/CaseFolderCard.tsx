import { useEffect, useRef, useState } from 'react';
import { CaseFolder, CaseFileRecord } from '../../../shared/types/caseLibrary';
import styles from '../../../styles/CasesScreen.module.css';

interface CaseFolderCardProps {
  folder: CaseFolder;
  onRename: (name: string) => Promise<void>;
  onDelete: () => void;
  onUpload: (files: File[]) => Promise<void>;
  onRemoveFile: (fileId: string) => Promise<void>;
}

export const CaseFolderCard = ({ folder, onRename, onDelete, onUpload, onRemoveFile }: CaseFolderCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraftName(folder.name);
  }, [folder.name]);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files || []);
    if (!files.length) {
      return;
    }
    try {
      await onUpload(files);
      setError(null);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    }
  };

  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (!files.length) {
      return;
    }
    try {
      await onUpload(files);
      event.target.value = '';
      setError(null);
    } catch (uploadError) {
      setError((uploadError as Error).message);
    }
  };

  const submitRename = async () => {
    if (draftName === folder.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await onRename(draftName);
      setIsEditingName(false);
      setError(null);
    } catch (renameError) {
      setError((renameError as Error).message);
    }
  };

  const renderFile = (file: CaseFileRecord) => (
    <li key={file.id} className={styles.fileRow}>
      <div className={styles.fileInfo}>
        <p className={styles.fileName}>{file.fileName}</p>
        <p className={styles.fileMeta}>
          {Math.round(file.size / 1024)} Кб · {new Date(file.uploadedAt).toLocaleString('ru-RU')}
        </p>
      </div>
      <div className={styles.fileActions}>
        <a className={styles.secondaryButton} href={file.dataUrl} download={file.fileName}>
          Скачать
        </a>
        <button
          className={styles.dangerButton}
          onClick={async () => {
            try {
              await onRemoveFile(file.id);
              setError(null);
            } catch (removeError) {
              setError((removeError as Error).message);
            }
          }}
        >
          Удалить
        </button>
      </div>
    </li>
  );

  return (
    <div className={styles.folderCard}>
      <header className={styles.folderHeader}>
        <div>
          {isEditingName ? (
            <div className={styles.renameRow}>
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
              <button className={styles.primaryButton} onClick={submitRename}>
                Сохранить
              </button>
            </div>
          ) : (
            <>
              <h3>{folder.name}</h3>
              <p className={styles.folderId}>ID: {folder.id}</p>
            </>
          )}
        </div>
      </header>

      <div
        className={styles.dropZone}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <p>Перетащите файлы сюда или загрузите вручную</p>
        <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
          Выбрать файлы
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleManualUpload}
        />
      </div>

      {folder.files.length === 0 ? (
        <div className={styles.emptyFiles}>Папка пустая. Загрузите кейсы, чтобы сделать её активной.</div>
      ) : (
        <ul className={styles.filesList}>{folder.files.map(renderFile)}</ul>
      )}

      <div className={styles.folderActionsFooter}>
        <button className={styles.secondaryButton} onClick={() => setIsEditingName((prev) => !prev)}>
          {isEditingName ? 'Отмена' : 'Переименовать'}
        </button>
        <button className={styles.dangerButton} onClick={onDelete}>
          Удалить
        </button>
      </div>

      <footer className={styles.folderFooter}>
        <span>Обновлено: {new Date(folder.updatedAt).toLocaleString('ru-RU')}</span>
        <span>Версия: {folder.version}</span>
      </footer>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};
