import type { ConfigFile } from '@chatbox-converter/core';
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate';

const TEXT_EXTENSIONS = new Set(['.json', '.txt', '.xml']);

function extensionOf(path: string): string {
  const dot = path.lastIndexOf('.');
  return dot === -1 ? '' : path.slice(dot).toLowerCase();
}

function relativePath(file: File): string {
  // Folder uploads carry webkitRelativePath; plain files and test doubles may not.
  const relative = 'webkitRelativePath' in file ? file.webkitRelativePath : '';
  const path = relative === '' ? file.name : relative;
  // Drop the top-level folder a directory upload adds, so codecs see "modules/x.json".
  const parts = path.split('/');
  return parts.length > 1 ? parts.slice(1).join('/') : path;
}

function decodeText(bytes: Uint8Array): string {
  // VRCOSC may write UTF-16 LE; everything else is UTF-8.
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }
  if (bytes.length >= 2 && bytes[1] === 0x00 && bytes[0] === 0x7b) {
    return new TextDecoder('utf-16le').decode(bytes);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

function unzipTextFiles(archive: Uint8Array): ConfigFile[] {
  return Object.entries(unzipSync(archive))
    .filter(
      ([entryPath]) => TEXT_EXTENSIONS.has(extensionOf(entryPath)) && !entryPath.endsWith('/'),
    )
    .map(([entryPath, bytes]) => ({ path: entryPath, content: decodeText(bytes) }));
}

/** Turn a browser file selection (files, a folder, or zips) into codec input. */
export async function readConfigFiles(files: Iterable<File>): Promise<ConfigFile[]> {
  const result: ConfigFile[] = [];
  for (const file of files) {
    const path = relativePath(file);
    const extension = extensionOf(path);
    if (extension === '.zip') {
      result.push(...unzipTextFiles(new Uint8Array(await file.arrayBuffer())));
      continue;
    }
    if (TEXT_EXTENSIONS.has(extension)) {
      result.push({ path, content: decodeText(new Uint8Array(await file.arrayBuffer())) });
    }
  }
  return result;
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Download one file directly, or several as a zip archive. */
export function downloadConfigFiles(files: readonly ConfigFile[], archiveName: string): void {
  const [only] = files;
  if (files.length === 1 && only !== undefined) {
    const name = only.path.split('/').pop() ?? only.path;
    downloadBlob(new Blob([only.content], { type: 'application/json;charset=utf-8' }), name);
    return;
  }
  const entries: Record<string, Uint8Array> = {};
  for (const file of files) {
    entries[file.path] = strToU8(file.content);
  }
  const zipped = zipSync(entries, { level: 6 });
  downloadBlob(new Blob([zipped], { type: 'application/zip' }), archiveName);
}

export { strFromU8 };
