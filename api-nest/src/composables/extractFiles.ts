import AdmZip from 'adm-zip';
import { isCodeFile } from './isCodeFile';
import { Ollama } from 'ollama';

const MAX_LINES = 500;

export interface ExtractedFile {
  name: string;
  content: string;
  isImage: boolean;
  imageBase64?: string;
  mimetype?: string;
}

export interface FileProcessingProgress {
  current: number;
  total: number;
  fileName: string;
}

/**
 * Extract files from a zip buffer in memory.
 * Returns an array of extracted file entries.
 */
export function extractZipEntries(buffer: Buffer): ExtractedFile[] {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files: ExtractedFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const name = entry.entryName;
    console.log(`[ZipExtract] Found entry: "${name}"`);
    const data = entry.getData();

    // Guess mimetype from extension
    const isImage = /\.(png|jpe?g|gif|webp|bmp|svg|ico|tiff?)$/i.test(name);

    if (isImage) {
      files.push({
        name,
        content: '',
        isImage: true,
        imageBase64: data.toString('base64'),
        mimetype: guessMimetype(name),
      });
    } else {
      files.push({
        name,
        content: data.toString('utf-8'),
        isImage: false,
      });
    }
  }

  return files;
}

function guessMimetype(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    svg: 'image/svg+xml',
    ico: 'image/x-icon',
    tif: 'image/tiff',
    tiff: 'image/tiff',
  };
  return map[ext] ?? 'application/octet-stream';
}

/**
 * Build a folder-tree string from the extracted file paths so the AI
 * can see the full project structure at a glance.
 */
export function buildFolderMap(files: ExtractedFile[]): string {
  // Sort paths so the tree is rendered in a stable order
  const paths = files.map(f => f.name).sort();

  // Build a nested tree object
  const tree: Record<string, any> = {};
  for (const p of paths) {
    const parts = p.split('/');
    let node = tree;
    for (const part of parts) {
      node[part] = node[part] ?? {};
      node = node[part];
    }
  }

  // Render the tree into indented text
  const lines: string[] = [];
  function render(node: Record<string, any>, indent: string) {
    const keys = Object.keys(node);
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i];
      const isLast = i === keys.length - 1;
      const children = Object.keys(node[key]);
      const connector = isLast ? '└── ' : '├── ';
      const suffix = children.length > 0 ? '/' : '';
      lines.push(`${indent}${connector}${key}${suffix}`);
      if (children.length > 0) {
        render(node[key], indent + (isLast ? '    ' : '│   '));
      }
    }
  }
  render(tree, '');
  return lines.join('\n');
}

/**
 * Process extracted files: if a text file exceeds MAX_LINES, summarize it via Ollama.
 * Emits progress events via the provided callback.
 * Images are passed through as-is (no summarization).
 */
export async function processExtractedFiles(
  files: ExtractedFile[],
  ollamaClient: Ollama,
  model: string,
  onProgress: (progress: FileProcessingProgress) => void,
  abortSignal?: AbortSignal,
): Promise<string[]> {
  const contextParts: string[] = [];
  const total = files.length;

  // Prepend a folder map so the AI can see the full project structure
  const folderMap = buildFolderMap(files);
  contextParts.push(`--- Zip File Structure ---\n${folderMap}\n--- End of structure ---`);

  for (let i = 0; i < files.length; i++) {
    if (abortSignal?.aborted) break;

    const file = files[i];
    onProgress({ current: i + 1, total, fileName: file.name });

    if (file.isImage) {
      // Images are not summarized — they'll be attached separately
      continue;
    }

    const lines = file.content.split('\n');

    if (lines.length <= MAX_LINES) {
      // Small file: include as-is
      contextParts.push(
        `--- File: ${file.name} (${lines.length} lines) ---\n${file.content}\n--- End of file ---`
      );
    } else {
      // Large file: summarize via Ollama
      try {
        const summary = await summarizeFile(ollamaClient, model, file.name, file.content, abortSignal);
        contextParts.push(
          `--- File: ${file.name} (summarized from ${lines.length} lines) ---\n${summary}\n--- End of file ---`
        );
      } catch (err) {
        contextParts.push(
          `--- File: ${file.name} (${lines.length} lines — summarization failed) ---\n[File too large to include, summarization failed]\n--- End of file ---`
        );
      }
    }
  }

  return contextParts;
}

async function summarizeFile(
  ollamaClient: Ollama,
  model: string,
  fileName: string,
  content: string,
  abortSignal?: AbortSignal,
): Promise<string> {
  const response = await ollamaClient.chat({
    model,
    messages: [
      {
        role: 'system',
        content: 'You are a file summarizer. Summarize the following file content concisely, keeping all important information such as key functions, classes, configurations, logic, and structure. Be thorough but concise.'
      },
      {
        role: 'user',
        content: `Summarize this file "${fileName}":\n\n${content}`
      }
    ],
    stream: false,
  });

  return response.message.content;
}
