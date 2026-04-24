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
// Directories to skip entirely when extracting zips
const IGNORED_DIRS = [
  'node_modules', '.git', '.svn', '.hg', '.DS_Store',
  '__pycache__', '.venv', 'venv', 'env',
  '.tox', '.mypy_cache', '.pytest_cache',
  'vendor', 'bower_components',
  '.gradle', '.idea', '.vscode',
  'dist', 'build', 'out', 'target',
  '.next', '.nuxt', '.cache',
  'Pods', '.dart_tool', '.pub-cache',
];

// Dotfiles to keep (config files that matter)
const KEEP_DOTFILES = new Set([
  '.gitignore', '.dockerignore', '.npmignore',
  '.eslintrc', '.eslintrc.json', '.eslintrc.js', '.eslintrc.cjs',
  '.prettierrc', '.prettierrc.json', '.prettierignore',
  '.editorconfig', '.env', '.env.example', '.env.local',
  '.babelrc', '.browserslistrc', '.nvmrc', '.node-version',
  '.tsconfig.json', '.stylelintrc',
]);

function shouldSkipEntry(entryName: string): boolean {
  const parts = entryName.split('/');

  for (const part of parts) {
    // Skip entries inside ignored directories
    if (IGNORED_DIRS.includes(part)) return true;

    // Skip hidden directories (starting with .) unless they are the file itself (last segment)
    if (part.startsWith('.') && part !== parts[parts.length - 1]) return true;
  }

  // For the file itself (last segment), skip hidden files unless they're in the keep list
  const fileName = parts[parts.length - 1];
  if (fileName.startsWith('.') && !KEEP_DOTFILES.has(fileName)) return true;

  return false;
}

export function extractZipEntries(buffer: Buffer): ExtractedFile[] {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();
  const files: ExtractedFile[] = [];

  for (const entry of entries) {
    if (entry.isDirectory) continue;

    const name = entry.entryName;

    if (shouldSkipEntry(name)) {
      console.log(`[ZipExtract] Skipping: "${name}"`);
      continue;
    }

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
 * onSummaryChunk is called with each streaming chunk during summarization.
 */
export async function processExtractedFiles(
  files: ExtractedFile[],
  ollamaClient: Ollama,
  model: string,
  onProgress: (progress: FileProcessingProgress) => void,
  abortSignal?: AbortSignal,
  onSummaryChunk?: (chunk: string) => void,
  onSummaryStart?: (fileName: string) => void,
  onSummaryComplete?: (fileName: string, summary: string) => void,
): Promise<string[]> {
  const contextParts: string[] = [];
  const total = files.length;

  // Prepend a folder map so the AI can see the full project structure
  const folderMap = buildFolderMap(files);
  contextParts.push(`--- Zip File Structure ---\n${folderMap}\n--- End of structure ---`);

  // Stream the folder structure to the client
  onSummaryChunk?.(`**📁 Folder Structure**\n\n\`\`\`\n${folderMap}\n\`\`\`\n`);

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
      // Small file: include as-is (no summary saved)
      onSummaryStart?.(file.name);
      onSummaryChunk?.(`\n\n**📄 ${file.name}** (${lines.length} lines — included in full)\n\n`);
      contextParts.push(
        `--- File: ${file.name} (${lines.length} lines) ---\n${file.content}\n--- End of file ---`
      );
    } else {
      // Large file: summarize via Ollama with streaming
      try {
        onSummaryStart?.(file.name);
        onSummaryChunk?.(`\n\n**📄 ${file.name}** (${lines.length} lines — summarized)\n\n`);
        const summary = await summarizeFileStreaming(ollamaClient, model, file.name, file.content, abortSignal, onSummaryChunk);
        console.log(`[ZipSummary] "${file.name}" (${lines.length} lines) summary:\n${summary}`);
        onSummaryComplete?.(file.name, summary);
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

const SUMMARY_SYSTEM_PROMPT = `You are a detailed file summarizer. Analyze the file content thoroughly and provide:
1. **Purpose**: What this file does and its role in the project.
2. **Key structures**: Classes, interfaces, types, and their relationships.
3. **Important functions/methods**: Name, parameters, return type, and what they do.
4. **Code snippets**: Include important code snippets (function signatures, key logic, configurations) wrapped in fenced code blocks with the appropriate language.
5. **Dependencies**: Notable imports, external libraries, or modules used.
6. **Configuration & constants**: Any important config values, environment variables, or constants.
Be thorough but organized. Preserve code snippets that are essential to understanding the file.`;

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
        content: SUMMARY_SYSTEM_PROMPT
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

async function summarizeFileStreaming(
  ollamaClient: Ollama,
  model: string,
  fileName: string,
  content: string,
  abortSignal?: AbortSignal,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const stream = await ollamaClient.chat({
    model,
    messages: [
      {
        role: 'system',
        content: SUMMARY_SYSTEM_PROMPT
      },
      {
        role: 'user',
        content: `Summarize this file "${fileName}":\n\n${content}`
      }
    ],
    stream: true,
  });

  const chunks: string[] = [];
  for await (const chunk of stream) {
    if (abortSignal?.aborted) break;
    const text = chunk.message.content;
    if (text) {
      chunks.push(text);
      onChunk?.(text);
    }
  }

  return chunks.join('');
}
