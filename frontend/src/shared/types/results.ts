export type DomainErrorCode =
  | 'not-found'
  | 'version-conflict'
  | 'duplicate'
  | 'invalid-input'
  | 'mailer-unavailable'
  | 'portal-url-missing'
  | 'portal-url-invalid'
  | 'process-already-started'
  | 'missing-assignment-data'
  | 'access-denied'
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
