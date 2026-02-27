import {sha256} from 'js-sha256';
import {Buffer} from 'buffer';
import NativeHttpCache from './NativeHttpCache';
import type {LottieFetchResult, ImageFetchResult, ImageFormat, Mode, ServerState} from './types';

export async function fetchLottie(
  baseUrl: string,
  forceRefresh = false,
): Promise<LottieFetchResult> {
  const url = `${baseUrl}/lottie.json`;

  if (forceRefresh) {
    await NativeHttpCache.clearCache();
  }

  const start = Date.now();
  const res = await fetch(url);
  const bodyText = await res.text();
  const fetchTimeMs = Date.now() - start;

  const bodySha256 = sha256(bodyText);
  let json: Record<string, unknown> | null = null;
  let demoVersion: number | null = null;
  try {
    json = JSON.parse(bodyText);
    demoVersion =
      typeof json?.demoVersion === 'number' ? json.demoVersion : null;
  } catch {
    // body wasn't valid JSON
  }

  return {
    status: res.status,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
    cacheControl: res.headers.get('cache-control'),
    demoVersion,
    bodySha256,
    bodyLength: bodyText.length,
    fetchTimeMs,
    json,
  };
}

export async function fetchImage(
  baseUrl: string,
  format: ImageFormat,
  forceRefresh = false,
): Promise<ImageFetchResult> {
  const url = `${baseUrl}/image.${format}`;

  if (forceRefresh) {
    await NativeHttpCache.clearCache();
  }

  const start = Date.now();
  const res = await fetch(url);
  const fetchTimeMs = Date.now() - start;

  // Handle 304 Not Modified
  if (res.status === 304) {
    return {
      status: 304,
      etag: res.headers.get('etag'),
      lastModified: res.headers.get('last-modified'),
      cacheControl: res.headers.get('cache-control'),
      bodySha256: '',
      bodyLength: 0,
      fetchTimeMs,
      base64: null,
    };
  }

  const arrayBuffer = await res.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  const base64 = Buffer.from(bytes).toString('base64');
  const bodySha256 = sha256(bytes);

  return {
    status: res.status,
    etag: res.headers.get('etag'),
    lastModified: res.headers.get('last-modified'),
    cacheControl: res.headers.get('cache-control'),
    bodySha256,
    bodyLength: arrayBuffer.byteLength,
    fetchTimeMs,
    base64,
  };
}

export async function flipVersion(baseUrl: string): Promise<{version: number}> {
  const res = await fetch(`${baseUrl}/flip`, {method: 'POST'});
  return res.json();
}

export async function setMode(
  baseUrl: string,
  mode: Mode,
): Promise<{mode: string}> {
  const res = await fetch(`${baseUrl}/mode`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({mode}),
  });
  return res.json();
}

export async function setLastModified(
  baseUrl: string,
  iso: string,
): Promise<{lastModified: string}> {
  const res = await fetch(`${baseUrl}/lastModified`, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({iso}),
  });
  return res.json();
}

export async function getServerState(
  baseUrl: string,
): Promise<ServerState> {
  const res = await fetch(`${baseUrl}/state`);
  return res.json();
}

export async function resetServer(baseUrl: string): Promise<void> {
  await fetch(`${baseUrl}/reset`, {method: 'POST'});
}
