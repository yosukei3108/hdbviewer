import * as vscode from 'vscode';
import { spawn } from 'child_process';


export interface Config {
  tchmgrPath: string;
  recordsPerPage: number;
  noLock: boolean;
}

export interface HdbRecord {
  key: string;
  value: string;
}

export interface RecordPage {
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
    recordsPerPage: Math.max(1, c.get<number>('recordsPerPage', 100)),
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


export async function readRecords(
  cfg: Config,
  lock: string,
  filePath: string,
  offset: number,
  prefix: string,
): Promise<RecordPage> {
  const limit = offset + cfg.recordsPerPage + 1;
  const matchArgs = prefix ? ['-fm', prefix] : [];
  const chunks: Buffer[] = [];
  await spawnTchmgr(
    cfg,
    ['list', lock, ...matchArgs, '-m', String(limit), '-px', '-pv', filePath],
    (chunk) => chunks.push(chunk)
  );

  // TODO: Stream the output instead of buffering it all with Buffer.concat.
  const all = parseRecords(Buffer.concat(chunks).toString('utf8'));

  return {
    records: all.slice(offset, offset + cfg.recordsPerPage),
    offset,
    pageSize: cfg.recordsPerPage,
    hasNext: all.length > offset + cfg.recordsPerPage,
  };
}

function parseRecords(output: string): HdbRecord[] {
  const records: HdbRecord[] = [];
  const lines = output.split('\n');
  // Drop the '' after the trailing newline. Note that Tokyo Cabinet allows empty keys.
  lines.pop();
  for (const line of lines) {
    // "66 6F 6F<TAB>62 61 72" -> key "666F6F", value "626172"
    const [key, value] = line.split('\t').map((hex) => hex.replace(/ /g, ''));
    records.push({
      key,
      value,
    });
  }

  return records;
}


function describeError(err: TchmgrError, stderr: string, cfg: Config): string {
  if (err.code === 'ENOENT') {
    return `tchmgr not found: ${cfg.tchmgrPath}\nSpecify the tchmgr path in the hdbviewer.tchmgrPath setting.`;
  }

  const detail = stderr.trim() || err.message;

  return `Failed to execute tchmgr.\n${detail}`;
}
