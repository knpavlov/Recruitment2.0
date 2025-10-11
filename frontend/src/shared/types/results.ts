export type DomainErrorCode =
  | 'not-found'
  | 'version-conflict'
  | 'duplicate'
  | 'invalid-input'
  | 'invalid-setup'
  | 'already-started'
  | 'process-not-started'
  | 'mailer-unavailable'
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
