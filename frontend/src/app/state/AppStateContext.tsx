import { createContext, ReactNode, useContext, useMemo, useState } from 'react';
import { CaseFolder, CaseFileRecord } from '../../shared/types/caseLibrary';
import { CandidateProfile } from '../../shared/types/candidate';
import { EvaluationConfig } from '../../shared/types/evaluation';
import { AccountRecord, AccountRole } from '../../shared/types/account';
import { DomainResult } from '../../shared/types/results';
import { generateId } from '../../shared/ui/generateId';
import { slugify } from '../../shared/utils/slugify';

interface AppStateContextValue {
  cases: {
    folders: CaseFolder[];
    createFolder: (name: string) => DomainResult<CaseFolder>;
    renameFolder: (id: string, name: string, expectedVersion: number) => DomainResult<CaseFolder>;
    deleteFolder: (id: string) => DomainResult<string>;
    registerFiles: (
      id: string,
      files: CaseFileRecord[],
      expectedVersion: number
    ) => DomainResult<CaseFolder>;
    removeFile: (
      folderId: string,
      fileId: string,
      expectedVersion: number
    ) => DomainResult<CaseFolder>;
  };
  candidates: {
    list: CandidateProfile[];
    saveProfile: (profile: CandidateProfile, expectedVersion: number | null) => DomainResult<CandidateProfile>;
    removeProfile: (id: string) => DomainResult<string>;
  };
  evaluations: {
    list: EvaluationConfig[];
    saveEvaluation: (config: EvaluationConfig, expectedVersion: number | null) => DomainResult<EvaluationConfig>;
    removeEvaluation: (id: string) => DomainResult<string>;
  };
  accounts: {
    list: AccountRecord[];
    inviteAccount: (email: string, role: AccountRole) => DomainResult<AccountRecord>;
    activateAccount: (id: string) => DomainResult<AccountRecord>;
    removeAccount: (id: string) => DomainResult<string>;
  };
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const buildFolderId = (name: string, used: Set<string>) => {
  const base = slugify(name) || `papka-${used.size + 1}`;
  let candidate = base;
  let index = 1;
  while (used.has(candidate)) {
    candidate = `${base}-${index}`;
    index += 1;
  }
  return candidate;
};

const nowIso = () => new Date().toISOString();

const createEmptyFolder = (name: string, used: Set<string>): CaseFolder => ({
  id: buildFolderId(name, used),
  name,
  version: 1,
  createdAt: nowIso(),
  updatedAt: nowIso(),
  files: []
});

const touchFolder = (folder: CaseFolder): CaseFolder => ({
  ...folder,
  version: folder.version + 1,
  updatedAt: nowIso()
});

const touchCandidate = (profile: CandidateProfile, shouldIncrement = true): CandidateProfile => ({
  ...profile,
  version: shouldIncrement ? profile.version + 1 : profile.version,
  updatedAt: nowIso()
});

const touchEvaluation = (config: EvaluationConfig, shouldIncrement = true): EvaluationConfig => ({
  ...config,
  version: shouldIncrement ? config.version + 1 : config.version,
  updatedAt: nowIso()
});

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [folders, setFolders] = useState<CaseFolder[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationConfig[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([
    {
      id: generateId(),
      email: 'super.admin@company.com',
      role: 'super-admin',
      status: 'active',
      invitedAt: nowIso(),
      activatedAt: nowIso()
    }
  ]);

  const value = useMemo<AppStateContextValue>(() => ({
    cases: {
      folders,
      createFolder: (name) => {
        if (!name.trim()) {
          return { ok: false, error: 'invalid-input' };
        }
        const trimmed = name.trim();
        const duplicate = folders.some((item) => item.name.toLowerCase() === trimmed.toLowerCase());
        if (duplicate) {
          return { ok: false, error: 'duplicate' };
        }
        const used = new Set(folders.map((item) => item.id));
        const folder = createEmptyFolder(trimmed, used);
        setFolders((prev) => [...prev, folder]);
        return { ok: true, data: folder };
      },
      renameFolder: (id, name, expectedVersion) => {
        const current = folders.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        if (current.version !== expectedVersion) {
          return { ok: false, error: 'version-conflict' };
        }
        const trimmed = name.trim();
        if (!trimmed) {
          return { ok: false, error: 'invalid-input' };
        }
        const duplicate = folders.some(
          (item) => item.id !== id && item.name.toLowerCase() === trimmed.toLowerCase()
        );
        if (duplicate) {
          return { ok: false, error: 'duplicate' };
        }
        const renamed: CaseFolder = {
          ...touchFolder(current),
          name: trimmed
        };
        setFolders((prev) => prev.map((item) => (item.id === id ? renamed : item)));
        return { ok: true, data: renamed };
      },
      deleteFolder: (id) => {
        const exists = folders.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        setFolders((prev) => prev.filter((item) => item.id !== id));
        return { ok: true, data: id };
      },
      registerFiles: (id, files, expectedVersion) => {
        const current = folders.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        if (current.version !== expectedVersion) {
          return { ok: false, error: 'version-conflict' };
        }
        const updated: CaseFolder = {
          ...touchFolder(current),
          files: [...current.files, ...files]
        };
        setFolders((prev) => prev.map((item) => (item.id === id ? updated : item)));
        return { ok: true, data: updated };
      },
      removeFile: (folderId, fileId, expectedVersion) => {
        const current = folders.find((item) => item.id === folderId);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        if (current.version !== expectedVersion) {
          return { ok: false, error: 'version-conflict' };
        }
        const updated: CaseFolder = {
          ...touchFolder(current),
          files: current.files.filter((file) => file.id !== fileId)
        };
        setFolders((prev) => prev.map((item) => (item.id === folderId ? updated : item)));
        return { ok: true, data: updated };
      }
    },
    candidates: {
      list: candidates,
      saveProfile: (profile, expectedVersion) => {
        if (!profile.firstName.trim() || !profile.lastName.trim()) {
          return { ok: false, error: 'invalid-input' };
        }
        const exists = candidates.find((item) => item.id === profile.id);
        if (!exists) {
          const base: CandidateProfile = {
            ...profile,
            version: profile.version || 1,
            createdAt: nowIso(),
            updatedAt: nowIso()
          };
          const next = touchCandidate(base, false);
          setCandidates((prev) => [...prev, next]);
          return { ok: true, data: next };
        }
        if (expectedVersion === null || exists.version !== expectedVersion) {
          return { ok: false, error: 'version-conflict' };
        }
        const next = touchCandidate(profile);
        setCandidates((prev) => prev.map((item) => (item.id === profile.id ? next : item)));
        return { ok: true, data: next };
      },
      removeProfile: (id) => {
        const exists = candidates.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        setCandidates((prev) => prev.filter((item) => item.id !== id));
        return { ok: true, data: id };
      }
    },
    evaluations: {
      list: evaluations,
      saveEvaluation: (config, expectedVersion) => {
        if (!config.candidateId) {
          return { ok: false, error: 'invalid-input' };
        }
        const exists = evaluations.find((item) => item.id === config.id);
        if (!exists) {
          const next: EvaluationConfig = {
            ...config,
            createdAt: nowIso(),
            updatedAt: nowIso(),
            version: 1
          };
          setEvaluations((prev) => [...prev, next]);
          return { ok: true, data: next };
        }
        if (expectedVersion === null || exists.version !== expectedVersion) {
          return { ok: false, error: 'version-conflict' };
        }
        const next = touchEvaluation(config);
        setEvaluations((prev) => prev.map((item) => (item.id === config.id ? next : item)));
        return { ok: true, data: next };
      },
      removeEvaluation: (id) => {
        const exists = evaluations.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        setEvaluations((prev) => prev.filter((item) => item.id !== id));
        return { ok: true, data: id };
      }
    },
    accounts: {
      list: accounts,
      inviteAccount: (email, role) => {
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) {
          return { ok: false, error: 'invalid-input' };
        }
        const duplicate = accounts.some((account) => account.email === trimmed);
        if (duplicate) {
          return { ok: false, error: 'duplicate' };
        }
        const next: AccountRecord = {
          id: generateId(),
          email: trimmed,
          role,
          status: 'pending',
          invitedAt: nowIso()
        };
        setAccounts((prev) => [...prev, next]);
        return { ok: true, data: next };
      },
      activateAccount: (id) => {
        const current = accounts.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        const updated: AccountRecord = {
          ...current,
          status: 'active',
          activatedAt: nowIso()
        };
        setAccounts((prev) => prev.map((item) => (item.id === id ? updated : item)));
        return { ok: true, data: updated };
      },
      removeAccount: (id) => {
        const exists = accounts.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        setAccounts((prev) => prev.filter((item) => item.id !== id));
        return { ok: true, data: id };
      }
    }
  }), [folders, candidates, evaluations, accounts]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('AppStateContext отсутствует. Оберните компонент в AppStateProvider.');
  }
  return context;
};

export const useCasesState = () => useAppState().cases;
export const useCandidatesState = () => useAppState().candidates;
export const useEvaluationsState = () => useAppState().evaluations;
export const useAccountsState = () => useAppState().accounts;
