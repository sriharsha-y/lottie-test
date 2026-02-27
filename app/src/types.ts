export interface LottieFetchResult {
  status: number;
  etag: string | null;
  lastModified: string | null;
  cacheControl: string | null;
  demoVersion: number | null;
  bodySha256: string;
  bodyLength: number;
  fetchTimeMs: number;
  json: Record<string, unknown> | null;
}

export interface ImageFetchResult {
  status: number;
  etag: string | null;
  lastModified: string | null;
  cacheControl: string | null;
  bodySha256: string;
  bodyLength: number;
  fetchTimeMs: number;
  base64: string | null;
}

export type ImageFormat = 'png' | 'svg';

export interface ServerState {
  mode: string;
  version: number;
  lastModified: string;
  etag: string;
  requestCount: number;
  jsonCount: number;
  pngCount: number;
  svgCount: number;
  cacheControl: string | null;
}

export type Mode = "A" | "B";
