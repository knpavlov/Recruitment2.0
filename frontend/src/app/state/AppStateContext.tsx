import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { CaseFolder } from '../../shared/types/caseLibrary';
import { CandidateProfile } from '../../shared/types/candidate';
import { EvaluationConfig } from '../../shared/types/evaluation';
import { AccountRecord, AccountRole } from '../../shared/types/account';
import { DomainResult } from '../../shared/types/results';
import { casesApi, CaseFileUploadDto } from '../../modules/cases/api/casesApi';
import { accountsApi } from '../../modules/accounts/api/accountsApi';
import { HttpError } from '../../shared/api/httpClient';

interface AppStateContextValue {
  cases: {
    folders: CaseFolder[];
    createFolder: (name: string) => Promise<DomainResult<CaseFolder>>;
    renameFolder: (
      id: string,
      name: string,
      expectedVersion: number
    ) => Promise<DomainResult<CaseFolder>>;
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

const toHttpError = (error: unknown): HttpError => {
  if (error instanceof Error) {
    return error as HttpError;
  }
  const fallback = new Error('invalid-input') as HttpError;
  fallback.status = 400;
  return fallback;
};

const mapHttpError = <T,>(error: HttpError): DomainResult<T> => {
  const normalizedMessage = error.message?.toLowerCase?.() ?? '';
  if (normalizedMessage === 'duplicate') {
    return { ok: false, error: 'duplicate' };
  }
  if (normalizedMessage === 'version-conflict') {
    return { ok: false, error: 'version-conflict' };
  }
  if (normalizedMessage === 'not-found' || error.status === 404) {
    return { ok: false, error: 'not-found' };
  }
  if (normalizedMessage === 'invalid-input' || error.status === 400) {
    return { ok: false, error: 'invalid-input' };
  }
  if (error.status === 409) {
    return { ok: false, error: 'duplicate' };
  }
  return { ok: false, error: 'invalid-input' };
};

export const AppStateProvider = ({ children }: { children: ReactNode }) => {
  const [folders, setFolders] = useState<CaseFolder[]>([]);
  const [candidates, setCandidates] = useState<CandidateProfile[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationConfig[]>([]);
  const [accounts, setAccounts] = useState<AccountRecord[]>([]);

  useEffect(() => {
    let cancelled = false;
    const loadFolders = async () => {
      try {
        const data = await casesApi.list();
        if (!cancelled) {
          setFolders(data);
        }
      } catch (error) {
        console.error('Не удалось загрузить список папок кейсов', error);
      }
    };
    void loadFolders();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const loadAccounts = async () => {
      try {
        const data = await accountsApi.list();
        if (!cancelled) {
          setAccounts(data);
        }
      } catch (error) {
        console.error('Не удалось загрузить список аккаунтов', error);
      }
    };
    void loadAccounts();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AppStateContextValue>(() => ({
    cases: {
      folders,
      createFolder: async (name) => {
        try {
          const folder = await casesApi.create(name);
          setFolders((prev) => {
            const next = [...prev];
            const index = next.findIndex((item) => item.id === folder.id);
            if (index >= 0) {
              next[index] = folder;
              return next;
            }
            next.push(folder);
            return next;
          });
          return { ok: true, data: folder };
        } catch (error) {
          return mapHttpError<CaseFolder>(toHttpError(error));
        }
      },
      renameFolder: async (id, name, expectedVersion) => {
        try {
          const folder = await casesApi.rename(id, name, expectedVersion);
          setFolders((prev) => prev.map((item) => (item.id === id ? folder : item)));
          return { ok: true, data: folder };
        } catch (error) {
          return mapHttpError<CaseFolder>(toHttpError(error));
        }
      },
      deleteFolder: async (id) => {
        try {
          await casesApi.remove(id);
          setFolders((prev) => prev.filter((item) => item.id !== id));
          return { ok: true, data: id };
        } catch (error) {
          return mapHttpError<string>(toHttpError(error));
        }
      },
      registerFiles: async (id, files, expectedVersion) => {
        try {
          const folder = await casesApi.uploadFiles(id, files, expectedVersion);
          setFolders((prev) => prev.map((item) => (item.id === id ? folder : item)));
          return { ok: true, data: folder };
        } catch (error) {
          return mapHttpError<CaseFolder>(toHttpError(error));
        }
      },
      removeFile: async (folderId, fileId, expectedVersion) => {
        try {
          const folder = await casesApi.removeFile(folderId, fileId, expectedVersion);
          setFolders((prev) => prev.map((item) => (item.id === folderId ? folder : item)));
          return { ok: true, data: folder };
        } catch (error) {
          return mapHttpError<CaseFolder>(toHttpError(error));
        }
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
      inviteAccount: async (email, role) => {
        try {
          const record = await accountsApi.invite(email, role);
          setAccounts((prev) => {
            const next = [...prev];
            const index = next.findIndex((item) => item.id === record.id);
            if (index >= 0) {
              next[index] = record;
              return next;
            }
            next.push(record);
            return next;
          });
          return { ok: true, data: record };
        } catch (error) {
          return mapHttpError<AccountRecord>(toHttpError(error));
        }
      },
      activateAccount: async (id) => {
        try {
          const record = await accountsApi.activate(id);
          setAccounts((prev) => prev.map((item) => (item.id === id ? record : item)));
          return { ok: true, data: record };
        } catch (error) {
          return mapHttpError<AccountRecord>(toHttpError(error));
        }
      },
      removeAccount: async (id) => {
        try {
          await accountsApi.remove(id);
          setAccounts((prev) => prev.filter((item) => item.id !== id));
          return { ok: true, data: id };
        } catch (error) {
          return mapHttpError<string>(toHttpError(error));
        }
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
