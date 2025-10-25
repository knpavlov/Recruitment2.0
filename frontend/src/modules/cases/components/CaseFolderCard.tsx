import { useEffect, useRef, useState } from 'react';
import { CaseFolder, CaseFileRecord, CaseFileUploadDto } from '../../../shared/types/caseLibrary';
import styles from '../../../styles/CasesScreen.module.css';
import { formatDate } from '../../../shared/utils/date';
import { convertFilesToRecords } from '../services/fileAdapter';
import { EditIcon } from '../../../components/icons/EditIcon';
import { CheckIcon } from '../../../components/icons/CheckIcon';
import { CloseIcon } from '../../../components/icons/CloseIcon';

interface CaseFolderCardProps {
  folder: CaseFolder;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpload: (files: CaseFileUploadDto[]) => Promise<void>;
  onRemoveFile: (fileId: string) => Promise<void>;
}

type UploadState = { status: 'idle' | 'processing' | 'uploading' | 'done'; progress: number };

export const CaseFolderCard = ({ folder, onRename, onDelete, onUpload, onRemoveFile }: CaseFolderCardProps) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [draftName, setDraftName] = useState(folder.name);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  // Счётчик нужен, чтобы корректно отслеживать вложенные события dragenter/leave
  const dragCounterRef = useRef(0);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle', progress: 0 });
  const hideProgressTimeout = useRef<number | null>(null);

  useEffect(() => {
    setDraftName(folder.name);
  }, [folder.name]);

  useEffect(() => {
    // При размонтировании очищаем таймер скрытия индикатора загрузки
    return () => {
      if (hideProgressTimeout.current) {
        window.clearTimeout(hideProgressTimeout.current);
        hideProgressTimeout.current = null;
      }
    };
  }, []);

  const scheduleHideProgress = () => {
    if (hideProgressTimeout.current) {
      window.clearTimeout(hideProgressTimeout.current);
    }
    hideProgressTimeout.current = window.setTimeout(() => {
      setUploadState({ status: 'idle', progress: 0 });
      hideProgressTimeout.current = null;
    }, 1200);
  };

  const performUpload = async (files: File[]) => {
    if (!files.length) {
      return;
    }

    if (hideProgressTimeout.current) {
      window.clearTimeout(hideProgressTimeout.current);
      hideProgressTimeout.current = null;
    }

    setUploadState({ status: 'processing', progress: 0 });

    try {
      const records = await convertFilesToRecords(files, (percentage) => {
        setUploadState((previous) => {
          const nextProgress = Math.max(previous.progress, percentage * 0.82);
          return previous.status === 'processing'
            ? { status: 'processing', progress: nextProgress }
            : previous;
        });
      });

      setUploadState((previous) => ({
        status: 'uploading',
        progress: Math.max(previous.progress, 0.86)
      }));

      await onUpload(records);
      setError(null);
      setUploadState({ status: 'done', progress: 1 });
      scheduleHideProgress();
    } catch (uploadError) {
      setUploadState({ status: 'idle', progress: 0 });
      setError((uploadError as Error).message);
    }
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    dragCounterRef.current = 0;
    setIsDragActive(false);
    const files = Array.from(event.dataTransfer.files || []);
    await performUpload(files);
  };

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
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
    if (!files.length) {
      return;
    }
    await performUpload(files);
    event.target.value = '';
  };

  const submitRename = async () => {
    const trimmedName = draftName.trim();
    if (!trimmedName) {
      setError('Введите название папки перед сохранением.');
      return;
    }
    if (trimmedName === folder.name.trim()) {
      setIsEditingName(false);
      setDraftName(folder.name);
      setError(null);
      return;
    }
    try {
      await onRename(trimmedName);
      setIsEditingName(false);
      setError(null);
    } catch (renameError) {
      setError((renameError as Error).message);
    }
  };

  const handleCancelRename = () => {
    setIsEditingName(false);
    setDraftName(folder.name);
    setError(null);
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

  const uploadPercent = Math.round(Math.min(Math.max(uploadState.progress, 0), 1) * 100);

  return (
    <div className={styles.folderCard}>
      <header className={styles.folderHeader}>
        <div className={styles.folderTitleColumn}>
          {isEditingName ? (
            <div className={styles.titleEdit}>
              <input
                className={styles.titleInput}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    void submitRename();
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault();
                    handleCancelRename();
                  }
                }}
              />
              <div className={styles.titleEditActions}>
                <button
                  type="button"
                  className={styles.iconButtonPositive}
                  onClick={() => void submitRename()}
                  aria-label="Сохранить название папки"
                >
                  <CheckIcon width={16} height={16} />
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={handleCancelRename}
                  aria-label="Отменить переименование папки"
                >
                  <CloseIcon width={16} height={16} />
                </button>
              </div>
            </div>
          ) : (
            <div className={styles.folderTitleRow}>
              <h3 className={styles.folderTitle}>{folder.name}</h3>
              <button
                type="button"
                className={styles.iconButton}
                onClick={() => {
                  setIsEditingName(true);
                  setDraftName(folder.name);
                  setError(null);
                }}
                aria-label="Переименовать папку"
              >
                <EditIcon width={18} height={18} />
              </button>
            </div>
          )}
        </div>
        <div className={styles.folderHeaderActions}>
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
      </header>

      <div className={styles.folderMetaRow}>
        <span>Updated: {formatDate(folder.updatedAt)}</span>
        <span>Version: {folder.version}</span>
      </div>

      <div
        className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
        onDragOver={(event) => {
          event.preventDefault();
          event.dataTransfer.dropEffect = 'copy';
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <p>{isDragActive ? 'Release files to upload' : 'Drag files here or upload manually'}</p>
        <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
          Select files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className={styles.hiddenInput}
          onChange={handleManualUpload}
        />
        {uploadState.status !== 'idle' ? (
          <div className={styles.uploadStatus} aria-live="polite">
            <div className={styles.uploadStatusRow}>
              <span className={styles.uploadStatusLabel}>
                {uploadState.status === 'processing'
                  ? 'Preparing files…'
                  : uploadState.status === 'uploading'
                    ? 'Uploading files…'
                    : 'Upload complete'}
              </span>
              <span className={styles.uploadStatusValue}>{uploadPercent}%</span>
            </div>
            <div className={styles.uploadProgressTrack}>
              <div
                className={styles.uploadProgressValue}
                style={{ width: `${uploadPercent}%` }}
              />
            </div>
          </div>
        ) : null}
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
