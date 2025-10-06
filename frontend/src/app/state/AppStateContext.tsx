import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { CaseFolder, CaseFileUploadDto } from '../../shared/types/caseLibrary';
import { CandidateProfile } from '../../shared/types/candidate';
import { EvaluationConfig } from '../../shared/types/evaluation';
import { AccountRecord, AccountRole } from '../../shared/types/account';
import { DomainResult } from '../../shared/types/results';
import { casesApi } from '../../modules/cases/services/casesApi';
import { accountsApi } from '../../modules/accounts/services/accountsApi';
import { ApiError } from '../../shared/api/httpClient';
import { useAuth } from '../../modules/auth/AuthContext';

interface AppStateContextValue {
  cases: {
    folders: CaseFolder[];
    createFolder: (name: string) => Promise<DomainResult<CaseFolder>>;
    renameFolder: (id: string, name: string, expectedVersion: number) => Promise<DomainResult<CaseFolder>>;
    deleteFolder: (id: string) => Promise<DomainResult<string>>;
    registerFiles: (
      id: string,
      files: CaseFileUploadDto[],
      expectedVersion: number
    ) => Promise<DomainResult<CaseFolder>>;
    removeFile: (
      folderId: string,
      fileId: string,
      expectedVersion: number
    ) => Promise<DomainResult<CaseFolder>>;
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
    inviteAccount: (email: string, role: AccountRole) => Promise<DomainResult<AccountRecord>>;
    activateAccount: (id: string) => Promise<DomainResult<AccountRecord>>;
    removeAccount: (id: string) => Promise<DomainResult<string>>;
  };
}

const AppStateContext = createContext<AppStateContextValue | null>(null);

const nowIso = () => new Date().toISOString();

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
  const { session } = useAuth();
  const [folders, setFolders] = useState<CaseFolder[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationConfig[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  const syncFolders = useCallback(async (): Promise<CaseFolder[] | null> => {
    if (!session) {
      setFolders([]);
      return null;
    }
    try {
      const remote = await casesApi.list();
      setFolders(remote);
      return remote;
    } catch (error) {
      console.error('Failed to load case folders:', error);
      return null;
    }
  }, [session]);

  useEffect(() => {
    if (!session) {
      setFolders([]);
      return;
    }
    void syncFolders();
  }, [session, syncFolders]);

  useEffect(() => {
    const loadAccounts = async () => {
      if (!session) {
        setAccounts([]);
        setCandidates([]);
        setEvaluations([]);
        return;
      }
      try {
        const remote = await accountsApi.list();
        setAccounts(remote);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    void loadAccounts();
  }, [session]);

  const value = useMemo<AppStateContextValue>(() => ({
    cases: {
      folders,
      createFolder: async (name) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const trimmed = name.trim();
        if (!trimmed) {
          return { ok: false, error: 'invalid-input' };
        }
        try {
          const folder = await casesApi.create(trimmed);
          await syncFolders();
          return { ok: true, data: folder };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'duplicate') {
              return { ok: false, error: 'duplicate' };
            }
            if (error.code === 'invalid-input') {
              return { ok: false, error: 'invalid-input' };
            }
          }
          console.error('Failed to create folder:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      renameFolder: async (id, name, expectedVersion) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const current = folders.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        const trimmed = name.trim();
        if (!trimmed) {
          return { ok: false, error: 'invalid-input' };
        }
        try {
          const folder = await casesApi.rename(id, trimmed, expectedVersion);
          await syncFolders();
          return { ok: true, data: folder };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'duplicate') {
              return { ok: false, error: 'duplicate' };
            }
            if (error.code === 'version-conflict') {
              return { ok: false, error: 'version-conflict' };
            }
            if (error.code === 'invalid-input') {
              return { ok: false, error: 'invalid-input' };
            }
            if (error.code === 'not-found' || error.status === 404) {
              return { ok: false, error: 'not-found' };
            }
          }
          console.error('Failed to rename folder:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      deleteFolder: async (id) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const exists = folders.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        try {
          await casesApi.remove(id);
          await syncFolders();
          return { ok: true, data: id };
        } catch (error) {
          if (error instanceof ApiError && (error.code === 'not-found' || error.status === 404)) {
            return { ok: false, error: 'not-found' };
          }
          console.error('Failed to delete folder:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      registerFiles: async (id, files, expectedVersion) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        if (!files.length) {
          return { ok: false, error: 'invalid-input' };
        }
        const current = folders.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        try {
          const folder = await casesApi.uploadFiles(id, files, expectedVersion);
          await syncFolders();
          return { ok: true, data: folder };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'version-conflict') {
              return { ok: false, error: 'version-conflict' };
            }
            if (error.code === 'invalid-input') {
              return { ok: false, error: 'invalid-input' };
            }
            if (error.code === 'not-found' || error.status === 404) {
              return { ok: false, error: 'not-found' };
            }
          }
          console.error('Failed to upload files to folder:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      removeFile: async (folderId, fileId, expectedVersion) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const current = folders.find((item) => item.id === folderId);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        try {
          const folder = await casesApi.removeFile(folderId, fileId, expectedVersion);
          await syncFolders();
          return { ok: true, data: folder };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'version-conflict') {
              return { ok: false, error: 'version-conflict' };
            }
            if (error.code === 'not-found' || error.status === 404) {
              return { ok: false, error: 'not-found' };
            }
          }
          console.error('Failed to delete file from folder:', error);
          return { ok: false, error: 'unknown' };
        }
      }
    },
    candidates: {
      list: candidates,
      saveProfile: (profile, expectedVersion) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
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
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
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
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
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
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
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
      inviteAccount: async (email, role) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const trimmed = email.trim().toLowerCase();
        if (!trimmed) {
          return { ok: false, error: 'invalid-input' };
        }
        try {
          const account = await accountsApi.invite(trimmed, role);
          setAccounts((prev) => [...prev, account]);
          return { ok: true, data: account };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'duplicate' || error.status === 409) {
              return { ok: false, error: 'duplicate' };
            }
            if (error.code === 'invalid-input' || error.status === 400) {
              return { ok: false, error: 'invalid-input' };
            }
          }
          console.error('Failed to send invitation:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      activateAccount: async (id) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const current = accounts.find((item) => item.id === id);
        if (!current) {
          return { ok: false, error: 'not-found' };
        }
        try {
          const updated = await accountsApi.activate(id);
          setAccounts((prev) => prev.map((item) => (item.id === id ? updated : item)));
          return { ok: true, data: updated };
        } catch (error) {
          if (error instanceof ApiError && (error.code === 'not-found' || error.status === 404)) {
            return { ok: false, error: 'not-found' };
          }
          console.error('Failed to activate account:', error);
          return { ok: false, error: 'unknown' };
        }
      },
      removeAccount: async (id) => {
        if (!session) {
          return { ok: false, error: 'unauthorized' };
        }
        const exists = accounts.some((item) => item.id === id);
        if (!exists) {
          return { ok: false, error: 'not-found' };
        }
        try {
          await accountsApi.remove(id);
          setAccounts((prev) => prev.filter((item) => item.id !== id));
          return { ok: true, data: id };
        } catch (error) {
          if (error instanceof ApiError) {
            if (error.code === 'not-found' || error.status === 404) {
              return { ok: false, error: 'not-found' };
            }
            if (error.status === 403) {
              return { ok: false, error: 'invalid-input' };
            }
          }
          console.error('Failed to delete account:', error);
          return { ok: false, error: 'unknown' };
        }
      }
    }
  }), [folders, candidates, evaluations, accounts, session, syncFolders]);

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
};

export const useAppState = () => {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('AppStateContext is missing. Wrap the component in AppStateProvider.');
  }
  return context;
};

export const useCasesState = () => useAppState().cases;
export const useCandidatesState = () => useAppState().candidates;
export const useEvaluationsState = () => useAppState().evaluations;
export const useAccountsState = () => useAppState().accounts;
