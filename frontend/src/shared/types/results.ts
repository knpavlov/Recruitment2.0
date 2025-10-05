export type DomainErrorCode = 'not-found' | 'version-conflict' | 'duplicate' | 'invalid-input';

export interface DomainFailure {
  ok: false;
  error: DomainErrorCode;
}

export interface DomainSuccess<T> {
  ok: true;
  data: T;
}

export type DomainResult<T> = DomainSuccess<T> | DomainFailure;
