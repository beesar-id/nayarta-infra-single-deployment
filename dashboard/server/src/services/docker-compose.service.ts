import { exec, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { PROJECT_ROOT } from '../config/constants';
import type { ComposeResult } from '../types';

const execAsync = promisify(exec);

export class DockerComposeService {
  async execute(profile: string, action: 'up' | 'down', detach: boolean = true): Promise<ComposeResult> {
    try {
      const detachFlag = (action === 'up' && detach) ? '-d' : '';
      const command = `docker compose --profile ${profile} ${action} ${detachFlag}`.trim();
      
      console.log(`Executing: ${command} in ${PROJECT_ROOT}`);
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: PROJECT_ROOT,
        maxBuffer: 10 * 1024 * 1024, // 10MB
      });

      return {
        success: true,
        output: stdout || stderr || 'Command executed successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        output: '',
        error: error.message || 'Unknown error occurred',
      };
    }
  }

  /**
   * Execute docker compose with streaming output (for progress tracking)
   */
  async executeWithStream(
    profile: string,
    action: 'up' | 'down',
    onOutput: (data: string) => Promise<void> | void,
    onError: (error: string) => Promise<void> | void,
    onComplete: (success: boolean) => Promise<void> | void
  ): Promise<void> {
    try {
      const detachFlag = (action === 'up') ? '-d' : '';
      const args = ['compose', '--profile', profile, action];
      if (detachFlag) {
        args.push(detachFlag);
      }

      console.log(`Executing: docker ${args.join(' ')} in ${PROJECT_ROOT}`);

      const child = spawn('docker', args, {
        cwd: PROJECT_ROOT,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let hasError = false;
      let outputBuffer = '';

      child.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        outputBuffer += text;
        onOutput(text);
      });

      child.stderr?.on('data', (data: Buffer) => {
        const text = data.toString();
        outputBuffer += text;
        // Docker compose sends progress to stderr
        onOutput(text);
      });

      child.on('error', (error: Error) => {
        hasError = true;
        onError(error.message);
        onComplete(false);
      });

      child.on('close', (code: number) => {
        if (code === 0) {
          onComplete(true);
        } else {
          hasError = true;
          onError(`Process exited with code ${code}`);
          onComplete(false);
        }
      });
    } catch (error: any) {
      onError(error.message || 'Unknown error occurred');
      onComplete(false);
    }
  }
}

