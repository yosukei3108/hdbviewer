import * as vscode from 'vscode';
import { spawn } from 'child_process';


export interface Config {
  tchmgrPath: string;
  maxRecords: number;
  previewBytes: number;
  maxFullValueBytes: number;
  noLock: boolean;
}

export interface HdbRecord {
  key: string;
  keyTruncated: boolean;
  keyBytes: number;
  value: string;
  valueTruncated: boolean;
  valueBytes: number;
  valueLoaded: boolean;
}

export interface HdbSnapshot {
  info: Record<string, string>;
  records: HdbRecord[];
  offset: number;
  pageSize: number;
  hasNext: boolean;
}

interface TchmgrError {
  code?: string;
  message: string;
}


export function readConfig(): Config {
  const c = vscode.workspace.getConfiguration('hdbviewer');

  return {
    tchmgrPath: c.get<string>('tchmgrPath', 'tchmgr'),
    maxRecords: Math.max(1, c.get<number>('maxRecords', 1000)),
    previewBytes: Math.max(1, c.get<number>('previewBytes', 1024)),
    maxFullValueBytes: Math.max(1, c.get<number>('maxFullValueBytes', 8 * 1024 * 1024)),
    noLock: c.get<boolean>('noLock', false)
  };
}

function spawnTchmgr(cfg: Config, args: string[], onStdout: (chunk: Buffer) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(cfg.tchmgrPath, args, {stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';

    const fail = (err: TchmgrError) => {
      reject(new Error(describeError(err, stderr, cfg)));
    };

    child.stdout.on('data', onStdout);
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });

    child.on('error', fail);

    child.on('close', (code, signal) => {
      if (code === 0) {
        resolve();
      } else {
        fail({ message: `exit ${code ?? signal}` });
      }
    });
  });
}

export async function readInform(cfg: Config, lock: string, filePath: string): Promise<Record<string, string>> {
// async function readInform(cfg: Config, lock: string, filePath: string): Promise<Record<string, string>> {
  const chunks: Buffer[] = [];
  await spawnTchmgr(cfg, ['inform', lock, filePath], (chunk) => chunks.push(chunk));

  return parseInform(Buffer.concat(chunks).toString('utf8'));
}

function parseInform(output: string): Record<string, string> {
  const inform: Record<string, string> = {};
  for (const line of output.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) {
      continue;
    }
    inform[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }

  return inform;
}

export async function readKeys(cfg: Config, lock: string, filePath: string): Promise<string[]> {
  const chunks: Buffer[] = [];
  await spawnTchmgr(cfg, ['list', lock, '-px', filePath], (chunk) => chunks.push(chunk));

  return parseKeys(Buffer.concat(chunks).toString('utf8'));
}

function parseKeys(output: string): string[] {
  const keys: string[] = [];
  const lines = output.split('\n');
  // Drop the '' after the trailing newline. Note that Tokyo Cabinet allows empty keys.
  lines.pop();
  for (const line of lines) {
    // "66 6F 6F" -> "666F6F" -> "foo"
    keys.push(Buffer.from(line.replace(/ /g, ''), 'hex').toString('utf8'));
  }

  return keys;
}


function describeError(err: TchmgrError, stderr: string, cfg: Config): string {
  if (err.code === 'ENOENT') {
    return `tchmgr not found: ${cfg.tchmgrPath}\nSpecify the tchmgr path in the hdbviewer.tchmgrPath setting.`;
  }

  const detail = stderr.trim() || err.message;
  if (/no record found/i.test(detail)) {
    return 'No record was found (it may have been deleted after loading).';
  }

  return `Failed to execute tchmgr.\n${detail}`;
}
