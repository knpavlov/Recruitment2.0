import { useMemo, useState } from 'react';
import styles from '../../styles/CasesScreen.module.css';
import { useCasesState } from '../../app/state/AppStateContext';
import { CaseFolderCard } from './components/CaseFolderCard';
import { convertFilesToRecords } from './services/fileAdapter';

export const CasesScreen = () => {
  const { folders, createFolder, renameFolder, deleteFolder, registerFiles, removeFile } = useCasesState();
  const [newFolderName, setNewFolderName] = useState('');
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name, 'ru-RU')),
    [folders]
  );

  const handleCreateFolder = async () => {
    const result = await createFolder(newFolderName);
    if (!result.ok) {
      setErrorMessage(result.error === 'duplicate' ? 'Папка с таким именем уже существует.' : 'Введите корректное название.');
      setInfoMessage(null);
      return;
    }
    setInfoMessage(`Папка «${result.data.name}» создана.`);
    setErrorMessage(null);
    setNewFolderName('');
  };

  const handleRename = async (folderId: string, folderVersion: number, name: string) => {
    const result = await renameFolder(folderId, name, folderVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        throw new Error('Папка была изменена другим пользователем. Обновите страницу.');
      }
      if (result.error === 'duplicate') {
        throw new Error('Папка с таким названием уже существует.');
      }
      throw new Error('Не удалось переименовать папку.');
    }
    setInfoMessage(`Папка переименована в «${result.data.name}».`);
    setErrorMessage(null);
  };

  const handleDelete = async (folderId: string) => {
    const confirmed = window.confirm('Удалить папку и все вложенные файлы безвозвратно?');
    if (!confirmed) {
      return;
    }
    const result = await deleteFolder(folderId);
    if (!result.ok) {
      setErrorMessage('Не удалось удалить папку.');
      return;
    }
    setInfoMessage('Папка удалена.');
    setErrorMessage(null);
  };

  const handleUpload = async (folderId: string, folderVersion: number, files: File[]) => {
    const records = await convertFilesToRecords(files);
    const result = await registerFiles(folderId, records, folderVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        throw new Error('Файлы не сохранены: папка была изменена другим пользователем.');
      }
      throw new Error('Не удалось загрузить файлы.');
    }
    setInfoMessage(`Загружено файлов: ${records.length}.`);
    setErrorMessage(null);
  };

  const handleRemoveFile = async (folderId: string, folderVersion: number, fileId: string) => {
    const result = await removeFile(folderId, fileId, folderVersion);
    if (!result.ok) {
      if (result.error === 'version-conflict') {
        throw new Error('Файл не удалён: в папке уже есть свежие изменения.');
      }
      throw new Error('Не удалось удалить файл.');
    }
    setInfoMessage('Файл удалён.');
    setErrorMessage(null);
  };

  return (
    <section className={styles.wrapper}>
      <header className={styles.header}>
        <div>
          <h1>База кейсов</h1>
          <p className={styles.subtitle}>Управляйте структурами кейсов и быстрым доступом к материалам.</p>
        </div>
        <div className={styles.createBlock}>
          <input
            value={newFolderName}
            onChange={(event) => setNewFolderName(event.target.value)}
            placeholder="Название новой папки"
          />
          <button className={styles.primaryButton} onClick={() => void handleCreateFolder()}>
            Создать папку
          </button>
        </div>
      </header>

      {(infoMessage || errorMessage) && (
        <div className={infoMessage ? styles.infoBanner : styles.errorBanner}>
          {infoMessage ?? errorMessage}
        </div>
      )}

      <div className={styles.foldersArea}>
        {sortedFolders.length === 0 ? (
          <div className={styles.emptyState}>
            <h2>Здесь пока пусто</h2>
            <p>Добавьте первую папку, чтобы начать наполнять базу кейсов.</p>
          </div>
        ) : (
          <div className={styles.foldersGrid}>
            {sortedFolders.map((folder) => (
              <CaseFolderCard
                key={folder.id}
                folder={folder}
                onRename={(name) => handleRename(folder.id, folder.version, name)}
                onDelete={() => void handleDelete(folder.id)}
                onUpload={(files) => handleUpload(folder.id, folder.version, files)}
                onRemoveFile={(fileId) => handleRemoveFile(folder.id, folder.version, fileId)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
