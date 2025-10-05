declare module 'cors' {
  import type { RequestHandler } from 'express';

  // Облегчённое объявление типов для cors, чтобы сборка не падала даже без @types/cors
  export interface CorsOptions {
    origin?: boolean | string | RegExp | (string | RegExp)[];
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
