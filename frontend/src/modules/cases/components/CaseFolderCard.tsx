import { useEffect, useRef, useState } from 'react';
import { CaseFolder, CaseFileRecord } from '../../../shared/types/caseLibrary';
import styles from '../../../styles/CasesScreen.module.css';
import { formatDate } from '../../../shared/utils/date';

interface CaseFolderCardProps {
  folder: CaseFolder;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpload: (files: File[], options?: { onProgress?: (percentage: number) => void }) => Promise<void>;
  onRemoveFile: (fileId: string) => Promise<void>;
}

export const CaseFolderCard = ({ folder, onRename, onDelete, onUpload, onRemoveFile }: CaseFolderCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Счётчик нужен, чтобы корректно отслеживать вложенные события dragenter/leave
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const progressResetTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setDraftName(folder.name);
  }, [folder.name]);

  useEffect(() => {
    // Очищаем отложенное обновление прогресса при размонтировании карточки
    return () => {
      if (progressResetTimeoutRef.current) {
        window.clearTimeout(progressResetTimeoutRef.current);
      }
    };
  }, []);

  const runUpload = async (files: File[]) => {
    if (!files.length) {
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    try {
      await onUpload(files, {
        onProgress: (value) => {
          setUploadProgress(Math.max(0, Math.min(100, Math.round(value))));
        }
      });
      setError(null);
      setUploadProgress(100);
      if (progressResetTimeoutRef.current) {
        window.clearTimeout(progressResetTimeoutRef.current);
      }
      progressResetTimeoutRef.current = window.setTimeout(() => {
        setUploadProgress(null);
        progressResetTimeoutRef.current = null;
      }, 800);
    } catch (uploadError) {
      setError((uploadError as Error).message);
      setUploadProgress(null);
      if (progressResetTimeoutRef.current) {
        window.clearTimeout(progressResetTimeoutRef.current);
        progressResetTimeoutRef.current = null;
      }
      throw uploadError;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    if (isUploading) {
      return;
    }
    const files = Array.from(event.dataTransfer.files || []);
    try {
      await runUpload(files);
    } catch {
      // Ошибку уже обработали в runUpload
    }
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (isUploading) {
      return;
    }
    if (!event.dataTransfer.types?.includes('Files')) {
      return;
    }
    dragCounterRef.current += 1;
    setIsDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = Math.max(0, dragCounterRef.current - 1);
    if (dragCounterRef.current === 0) {
      setIsDragActive(false);
    }
  };

  const handleManualUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    try {
      await runUpload(files);
      event.target.value = '';
    } catch (uploadError) {
      event.target.value = '';
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
          {Math.round(file.size / 1024)} KB · {formatDate(file.uploadedAt)}
        </p>
      </div>
      <div className={styles.fileActionsInline}>
        <a className={styles.secondaryButton} href={file.dataUrl} download={file.fileName}>
          Download
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
          Delete
        </button>
      </div>
    </li>
  );

  return (
    <div className={styles.folderCard}>
      <header className={styles.folderHeader}>
        {isEditingName ? (
          <div className={styles.titleEdit}>
            <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
            <div className={styles.titleActions}>
              <button className={styles.primaryButton} onClick={() => void submitRename()}>
                Save
              </button>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setIsEditingName(false);
                  setDraftName(folder.name);
                  setError(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <h3 className={styles.folderTitle}>{folder.name}</h3>
            <div className={styles.folderHeaderActions}>
              <button
                className={styles.secondaryButton}
                onClick={() => {
                  setIsEditingName(true);
                  setDraftName(folder.name);
                  setError(null);
                }}
              >
                Rename
              </button>
              <button
                className={styles.dangerButton}
                onClick={async () => {
                  const confirmed = window.confirm('Delete the folder and all nested files permanently?');
                  if (!confirmed) {
                    return;
                  }
                  try {
                    await onDelete();
                    setError(null);
                  } catch (deleteError) {
                    setError((deleteError as Error).message);
                  }
                }}
              >
                Delete
              </button>
            </div>
          </>
        )}
      </header>

      <div className={styles.folderMetaRow}>
        <span>Updated: {formatDate(folder.updatedAt)}</span>
        <span>Version: {folder.version}</span>
      </div>

      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''} ${
          isUploading ? styles.dropZoneUploading : ''
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-busy={isUploading}
      >
        <p className={styles.dropZoneMessage}>
          {isUploading
            ? `Uploading files…${uploadProgress != null ? ` ${uploadProgress}%` : ''}`
            : isDragActive
              ? 'Release files to upload'
              : 'Drag files here or upload manually'}
        </p>
        {isUploading ? (
          <div className={styles.uploadProgress}>
            <div className={styles.progressTrack}>
              <div
                className={styles.progressValue}
                style={{ width: `${uploadProgress ?? 0}%` }}
              />
            </div>
            <span className={styles.progressLabel}>
              {uploadProgress != null ? `${uploadProgress}%` : 'Preparing files…'}
            </span>
          </div>
        ) : (
          <button
            className={styles.secondaryButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            type="button"
          >
            Select files
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleManualUpload}
        />
      </div>

      {folder.files.length === 0 ? (
        <div className={styles.emptyFiles}>The folder is empty. Upload cases to activate it.</div>
      ) : (
        <ul className={styles.filesList}>{folder.files.map(renderFile)}</ul>
      )}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};
