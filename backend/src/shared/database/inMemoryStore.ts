import { randomUUID } from 'crypto';
import type { AccountRecord } from '../../modules/accounts/accounts.service.js';
import type { CaseFileRecord, CaseFileUpload, CaseFolder } from '../../modules/cases/cases.types.js';
import type { AccessCodeRecord } from '../../modules/auth/accessCodes.repository.js';

type MutableAccountRecord = AccountRecord & { activatedAt?: Date };

type AccessCodeState = {
  email: string;
  code: string;
  expiresAt: Date;
};

type CaseFolderState = CaseFolder & { files: CaseFileRecord[] };

interface InMemoryState {
  accounts: MutableAccountRecord[];
  accessCodes: AccessCodeState[];
  caseFolders: CaseFolderState[];
}

const state: InMemoryState = {
  accounts: [],
  accessCodes: [],
  caseFolders: []
};

const cloneAccount = (record: MutableAccountRecord): AccountRecord => ({
  ...record,
  createdAt: new Date(record.createdAt),
  activatedAt: record.activatedAt ? new Date(record.activatedAt) : undefined
});

const cloneFolder = (folder: CaseFolderState): CaseFolder => ({
  id: folder.id,
  name: folder.name,
  version: folder.version,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
  files: folder.files.map((file) => ({ ...file }))
});

const nowIso = () => new Date().toISOString();

const sortCaseFiles = (files: CaseFileRecord[]) =>
  files.slice().sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));

const sortCaseFolders = (folders: CaseFolderState[]) =>
  folders
    .slice()
    .sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt) || a.name.localeCompare(b.name)
    );

const hasExpectedVersion = (folder: CaseFolderState, expectedVersion: number) =>
  folder.version === expectedVersion;

export const inMemoryStore = {
  accounts: {
    list(): AccountRecord[] {
      return state.accounts
        .slice()
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
        .map(cloneAccount);
    },
    findByEmail(email: string): AccountRecord | null {
      const found = state.accounts.find((item) => item.email === email);
      return found ? cloneAccount(found) : null;
    },
    findById(id: string): AccountRecord | null {
      const found = state.accounts.find((item) => item.id === id);
      return found ? cloneAccount(found) : null;
    },
    insert(record: AccountRecord): AccountRecord {
      const stored: MutableAccountRecord = {
        ...record,
        createdAt: new Date(record.createdAt),
        activatedAt: record.activatedAt ? new Date(record.activatedAt) : undefined
      };
      state.accounts.push(stored);
      return cloneAccount(stored);
    },
    updateActivation(id: string, activatedAt: Date): AccountRecord | null {
      const target = state.accounts.find((item) => item.id === id);
      if (!target) {
        return null;
      }
      target.status = 'active';
      target.activatedAt = new Date(activatedAt);
      return cloneAccount(target);
    },
    remove(id: string): AccountRecord | null {
      const index = state.accounts.findIndex((item) => item.id === id);
      if (index === -1) {
        return null;
      }
      const [removed] = state.accounts.splice(index, 1);
      return cloneAccount(removed);
    },
    ensureSuperAdmin(email: string) {
      const sortedSupers = state.accounts
        .filter((item) => item.role === 'super-admin')
        .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

      const conflict = state.accounts.find(
        (item) => item.email === email && item.role !== 'super-admin'
      );

      if (!sortedSupers.length) {
        if (conflict) {
          console.warn(
            `Невозможно создать суперадмина: адрес ${email} занят другим аккаунтом.`
          );
          return;
        }
        const now = new Date();
        state.accounts.push({
          id: randomUUID(),
          email,
          role: 'super-admin',
          status: 'active',
          invitationToken: 'seed',
          createdAt: now,
          activatedAt: now
        });
        return;
      }

      const current = sortedSupers[0];
      if (current.email !== email) {
        if (conflict) {
          console.warn(
            `Невозможно обновить email суперадмина: адрес ${email} уже занят другим аккаунтом.`
          );
          return;
        }
        current.email = email;
      }
      current.status = 'active';
      current.invitationToken = 'seed';
      if (!current.activatedAt) {
        current.activatedAt = new Date();
      }
    }
  },
  accessCodes: {
    async save(record: AccessCodeRecord): Promise<void> {
      const existing = state.accessCodes.find((item) => item.email === record.email);
      if (existing) {
        existing.code = record.code;
        existing.expiresAt = new Date(record.expiresAt);
        return;
      }
      state.accessCodes.push({
        email: record.email,
        code: record.code,
        expiresAt: new Date(record.expiresAt)
      });
    },
    async find(email: string, code: string): Promise<AccessCodeRecord | null> {
      const found = state.accessCodes.find(
        (item) => item.email === email && item.code === code
      );
      if (!found) {
        return null;
      }
      return {
        email: found.email,
        code: found.code,
        expiresAt: new Date(found.expiresAt)
      };
    },
    async delete(email: string): Promise<void> {
      state.accessCodes = state.accessCodes.filter((item) => item.email !== email);
    }
  },
  cases: {
    list(): CaseFolder[] {
      return sortCaseFolders(state.caseFolders).map(cloneFolder);
    },
    isNameTaken(name: string, excludeId?: string): boolean {
      return state.caseFolders.some((folder) => {
        if (excludeId && folder.id === excludeId) {
          return false;
        }
        return folder.name.toLowerCase() === name.toLowerCase();
      });
    },
    create(name: string): CaseFolder {
      const now = nowIso();
      const folder: CaseFolderState = {
        id: randomUUID(),
        name,
        version: 1,
        createdAt: now,
        updatedAt: now,
        files: []
      };
      state.caseFolders.push(folder);
      return cloneFolder(folder);
    },
    rename(id: string, name: string, expectedVersion: number): 'version-conflict' | CaseFolder | null {
      const target = state.caseFolders.find((folder) => folder.id === id);
      if (!target) {
        return null;
      }
      if (!hasExpectedVersion(target, expectedVersion)) {
        return 'version-conflict';
      }
      target.name = name;
      target.version += 1;
      target.updatedAt = nowIso();
      return cloneFolder(target);
    },
    remove(id: string): boolean {
      const index = state.caseFolders.findIndex((folder) => folder.id === id);
      if (index === -1) {
        return false;
      }
      state.caseFolders.splice(index, 1);
      return true;
    },
    addFiles(
      folderId: string,
      files: CaseFileUpload[],
      expectedVersion: number
    ): 'version-conflict' | CaseFolder | null {
      const target = state.caseFolders.find((folder) => folder.id === folderId);
      if (!target) {
        return null;
      }
      if (!hasExpectedVersion(target, expectedVersion)) {
        return 'version-conflict';
      }
      const uploadedAtBase = new Date();
      const newFiles: CaseFileRecord[] = files.map((file, index) => ({
        id: randomUUID(),
        fileName: file.fileName,
        mimeType: file.mimeType,
        size: file.size,
        dataUrl: file.dataUrl,
        uploadedAt: new Date(uploadedAtBase.getTime() + index).toISOString()
      }));
      target.files = sortCaseFiles([...target.files, ...newFiles]);
      target.version += 1;
      target.updatedAt = nowIso();
      return cloneFolder(target);
    },
    removeFile(
      folderId: string,
      fileId: string,
      expectedVersion: number
    ): 'version-conflict' | CaseFolder | null {
      const target = state.caseFolders.find((folder) => folder.id === folderId);
      if (!target) {
        return null;
      }
      if (!hasExpectedVersion(target, expectedVersion)) {
        return 'version-conflict';
      }
      const exists = target.files.some((file) => file.id === fileId);
      if (!exists) {
        return null;
      }
      target.files = target.files.filter((file) => file.id !== fileId);
      target.files = sortCaseFiles(target.files);
      target.version += 1;
      target.updatedAt = nowIso();
      return cloneFolder(target);
    },
    findById(id: string): CaseFolder | null {
      const target = state.caseFolders.find((folder) => folder.id === id);
      return target ? cloneFolder(target) : null;
    }
  }
};
