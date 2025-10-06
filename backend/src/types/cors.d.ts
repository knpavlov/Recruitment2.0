declare module 'cors' {
  import type { RequestHandler } from 'express';

  // Lightweight type declaration for cors so the build works without @types/cors
  type OriginCallback = (
    origin: string | undefined,
    callback: (err: Error | null, allow?: boolean | string | RegExp | (string | RegExp)[]) => void
  ) => void;

  export interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[] | OriginCallback;
    methods?: string | string[];
    allowedHeaders?: string | string[];
    exposedHeaders?: string | string[];
    credentials?: boolean;
    maxAge?: number;
    preflightContinue?: boolean;
    optionsSuccessStatus?: number;
  }

  export interface CorsRequest {
    method?: string;
  }

  export interface CorsOptionsDelegate<T extends CorsRequest = CorsRequest> {
    (req: T, callback: (err: Error | null, options?: CorsOptions) => void): void;
  }

  export default function cors<T extends CorsRequest = CorsRequest>(
    options?: CorsOptions | CorsOptionsDelegate<T>
  ): RequestHandler;
}
