import { spawnSync } from 'node:child_process';

// Windows Python installations expose python.exe; Unix uses python3.
const executable = process.platform === 'win32' ? 'python' : 'python3';
const result = spawnSync(executable, ['scripts/validate_docs.py'], {
  stdio: 'inherit',
});
if (result.error) {
  console.error(
    `Python 3.9+ must be available as ${executable}: ${result.error.message}`,
  );
}
process.exit(result.status ?? 1);
