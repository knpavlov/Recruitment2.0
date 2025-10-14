import { useEffect, useMemo, useRef, useState } from 'react';
import styles from '../../styles/CaseCriteriaScreen.module.css';
import { useCasesState } from '../../app/state/AppStateContext';
import { CaseEvaluationCriterion } from '../../shared/types/caseLibrary';
import { CaseCriterionEditor } from './components/CaseCriterionEditor';
import { cloneCriterion, createEmptyCriterion, serializeCriteria } from './utils';

type Banner = { type: 'info' | 'error'; text: string } | null;

export const CaseCriteriaScreen = () => {
  const { folders, saveCriteria } = useCasesState();
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => folders[0]?.id ?? '');
  const [draft, setDraft] = useState<CaseEvaluationCriterion[]>([]);
  const [banner, setBanner] = useState<Banner>(null);
  const [saving, setSaving] = useState(false);

  const sortedFolders = useMemo(
    () => [...folders].sort((a, b) => a.name.localeCompare(b.name, 'en-US')),
    [folders]
  );

  useEffect(() => {
    if (!sortedFolders.length) {
      setSelectedFolderId('');
      setDraft([]);
      return;
    }
    if (!selectedFolderId || !sortedFolders.find((folder) => folder.id === selectedFolderId)) {
      setSelectedFolderId(sortedFolders[0].id);
    }
  }, [sortedFolders, selectedFolderId]);

  const selectedFolder = useMemo(
    () => sortedFolders.find((folder) => folder.id === selectedFolderId) ?? null,
    [sortedFolders, selectedFolderId]
  );

  const normalizedDraftKey = useMemo(() => serializeCriteria(draft), [draft]);
  const normalizedOriginalKey = useMemo(
    () => serializeCriteria(selectedFolder?.evaluationCriteria ?? []),
    [selectedFolder]
  );

  const hasChanges = normalizedDraftKey !== normalizedOriginalKey;

  const lastLoadedFolderIdRef = useRef<string | null>(null);
  const lastLoadedCriteriaKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedFolder) {
      setDraft([]);
      lastLoadedFolderIdRef.current = null;
      lastLoadedCriteriaKeyRef.current = null;
      return;
    }

    const lastLoadedId = lastLoadedFolderIdRef.current;
    const lastLoadedKey = lastLoadedCriteriaKeyRef.current;
    const nextKey = normalizedOriginalKey;

    if (hasChanges && lastLoadedId === selectedFolder.id && lastLoadedKey === nextKey) {
      return;
    }

    setDraft(selectedFolder.evaluationCriteria.map((criterion) => cloneCriterion(criterion)));
    setBanner(null);
    lastLoadedFolderIdRef.current = selectedFolder.id;
    lastLoadedCriteriaKeyRef.current = nextKey;
  }, [selectedFolder, hasChanges, normalizedOriginalKey]);

  const handleSelectFolder = (id: string) => {
    if (id === selectedFolderId) {
      return;
    }
    if (hasChanges) {
      const shouldProceed = window.confirm('Discard unsaved changes?');
      if (!shouldProceed) {
        return;
      }
    }
    setSelectedFolderId(id);
  };

  const handleCriterionChange = (index: number, next: CaseEvaluationCriterion) => {
    setDraft((prev) => prev.map((item, idx) => (idx === index ? next : item)));
  };

  const handleCriterionRemove = (index: number) => {
    setDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddCriterion = () => {
    setDraft((prev) => [...prev, createEmptyCriterion()]);
    setBanner(null);
  };

  const handleReset = () => {
    if (!selectedFolder) {
      return;
    }
    setDraft(selectedFolder.evaluationCriteria.map((criterion) => cloneCriterion(criterion)));
    setBanner(null);
  };

  const handleSave = async () => {
    if (!selectedFolder) {
      setBanner({ type: 'error', text: 'Select a folder to save criteria.' });
      return;
    }
    if (draft.some((item) => !item.title.trim())) {
      setBanner({ type: 'error', text: 'Provide titles for all criteria before saving.' });
      return;
    }
    setSaving(true);
    setBanner(null);
    try {
      const result = await saveCriteria(selectedFolder.id, draft);
      if (!result.ok) {
        if (result.error === 'invalid-input') {
          setBanner({ type: 'error', text: 'Invalid data. Check titles and try again.' });
        } else if (result.error === 'not-found') {
          setBanner({ type: 'error', text: 'Folder not found. Refresh the page.' });
        } else {
          setBanner({ type: 'error', text: 'Failed to save criteria. Please retry.' });
        }
        return;
      }
      setDraft(result.data.evaluationCriteria.map((criterion) => cloneCriterion(criterion)));
      setBanner({ type: 'info', text: 'Case criteria saved.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={styles.wrapper}>
      <aside className={styles.sidebar}>
        <header className={styles.sidebarHeader}>
          <h2>Case folders</h2>
          <p>Select a folder to edit its evaluation criteria.</p>
        </header>
        <ul className={styles.folderList}>
          {sortedFolders.length === 0 ? (
            <li className={styles.emptyHint}>Create a case folder to add criteria.</li>
          ) : (
            sortedFolders.map((folder) => (
              <li key={folder.id}>
                <button
                  type="button"
                  className={
                    folder.id === selectedFolderId ? styles.folderButtonActive : styles.folderButton
                  }
                  onClick={() => handleSelectFolder(folder.id)}
                >
                  <span className={styles.folderName}>{folder.name}</span>
                  <span className={styles.folderMeta}>{folder.evaluationCriteria.length} criteria</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </aside>

      <div className={styles.contentArea}>
        {!selectedFolder ? (
          <div className={styles.placeholder}>Select a case folder to manage criteria.</div>
        ) : (
          <div className={styles.editorArea}>
            <header className={styles.header}>
              <div>
                <h1>{selectedFolder.name}</h1>
                <p>Define evaluation criteria that interviewers will use for this case.</p>
              </div>
              <button type="button" className={styles.addButton} onClick={handleAddCriterion}>
                Add criterion
              </button>
            </header>

            {banner && (
              <div className={banner.type === 'info' ? styles.infoBanner : styles.errorBanner}>
                {banner.text}
              </div>
            )}

            <div className={styles.criteriaList}>
              {draft.length === 0 ? (
                <div className={styles.emptyState}>
                  <h2>No criteria yet</h2>
                  <p>Use “Add criterion” to create the first evaluation metric.</p>
                </div>
              ) : (
                draft.map((criterion, index) => (
                  <CaseCriterionEditor
                    key={criterion.id}
                    criterion={criterion}
                    onChange={(next) => handleCriterionChange(index, next)}
                    onRemove={() => handleCriterionRemove(index)}
                    disableRemove={draft.length === 1}
                  />
                ))
              )}
            </div>

            <div className={styles.actionsRow}>
              <button
                type="button"
                className={styles.resetButton}
                onClick={handleReset}
                disabled={saving || !hasChanges}
              >
                Reset changes
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? 'Saving…' : 'Save criteria'}
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
