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

export interface ServerState {
  mode: string;
  version: number;
  lastModified: string;
  etag: string;
  requestCount: number;
  cacheControl: string | null;
}

export type Mode = "A" | "B";
