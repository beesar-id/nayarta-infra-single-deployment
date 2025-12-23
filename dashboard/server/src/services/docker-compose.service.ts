import { exec } from 'node:child_process';
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
}

