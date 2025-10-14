export type DomainErrorCode =
  | 'not-found'
  | 'version-conflict'
  | 'duplicate'
  | 'invalid-input'
  | 'mailer-unavailable'
  | 'process-already-started'
  | 'process-not-started'
  | 'missing-assignment-data'
  | 'no-updates'
  | 'access-denied'
  | 'invalid-portal-url'
  | 'unknown';

export interface DomainFailure {
  ok: false;
  error: DomainErrorCode;
}

export interface DomainSuccess<T> {
  ok: true;
  data: T;
}

export type DomainResult<T> = DomainSuccess<T> | DomainFailure;
