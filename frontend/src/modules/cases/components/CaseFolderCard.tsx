import { useEffect, useRef, useState } from 'react';
import { CaseFolder, CaseFileRecord } from '../../../shared/types/caseLibrary';
import styles from '../../../styles/CasesScreen.module.css';

interface CaseFolderCardProps {
  folder: CaseFolder;
  onRename: (name: string) => Promise<void>;
  onDelete: () => Promise<void>;
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
          {Math.round(file.size / 1024)} KB · {new Date(file.uploadedAt).toLocaleString('en-US')}
        </p>
      </div>
      <div className={styles.fileActionsStack}>
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
        <div>
          <h3>{folder.name}</h3>
          <p className={styles.folderId}>ID: {folder.id}</p>
        </div>
      </header>

      <div
        className={styles.dropZone}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDrop={handleDrop}
      >
        <p>Drag files here or upload them manually</p>
        <button className={styles.secondaryButton} onClick={() => fileInputRef.current?.click()}>
          Choose files
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
        <div className={styles.emptyFiles}>The folder is empty. Upload cases to activate it.</div>
      ) : (
        <ul className={styles.filesList}>{folder.files.map(renderFile)}</ul>
      )}

      <footer className={styles.folderFooter}>
        <div className={styles.folderActionsSection}>
          {isEditingName ? (
            <div className={styles.renameRow}>
              <input value={draftName} onChange={(event) => setDraftName(event.target.value)} />
              <div className={styles.renameButtons}>
                <button className={styles.primaryButton} onClick={submitRename}>
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
            <div className={styles.folderActionsBar}>
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
          )}
        </div>
        <div className={styles.folderMeta}>
          <span>Updated: {new Date(folder.updatedAt).toLocaleString('en-US')}</span>
          <span>Version: {folder.version}</span>
        </div>
      </footer>

      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};
