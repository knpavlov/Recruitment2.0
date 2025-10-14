export type DomainErrorCode =
  | 'not-found'
  | 'version-conflict'
  | 'duplicate'
  | 'invalid-input'
  | 'mailer-unavailable'
  | 'process-already-started'
  | 'forms-pending'
  | 'missing-assignment-data'
  | 'access-denied'
  | 'invalid-portal-url'
  | 'form-locked'
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
