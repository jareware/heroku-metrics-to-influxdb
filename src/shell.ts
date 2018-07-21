import { exec } from 'child_process';
import { isString } from 'util';

// Promises the simple shell-output of the given command
export function execShell(command: string, ignoreStderrOutput = false): Promise<string> {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(`Could not exec command "${command}": "${error}"`));
      } else if (stderr.length && !ignoreStderrOutput) {
        reject(new Error(`Command "${command}" produced output on stderr: "${stderr}"`));
      } else if (!isString(stdout)) {
        reject(new Error(`Command "${command}" produced non-string stdout: "${stdout}"`));
      } else {
        resolve(stdout);
      }
    });
  });
}
