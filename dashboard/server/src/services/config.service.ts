import { promises as fs } from 'node:fs';
import { join } from 'node:path';
import { PROJECT_ROOT } from '../config/constants';

export class ConfigService {
  private static getEnvPath() {
    return join(PROJECT_ROOT, '.env');
  }

  private static getMediamtxPath() {
    return join(PROJECT_ROOT, 'stream', 'config', 'mediamtx.yml');
  }

  static async getEnvFile(): Promise<string> {
    const path = this.getEnvPath();
    try {
      const content = await fs.readFile(path, 'utf8');
      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // If file doesn't exist, return empty string
        return '';
      }
      throw new Error(`Failed to read .env file: ${error.message}`);
    }
  }

  static async updateEnvFile(content: string): Promise<void> {
    const path = this.getEnvPath();
    try {
      await fs.writeFile(path, content, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to write .env file: ${error.message}`);
    }
  }

  static async getMediamtxConfig(): Promise<string> {
    const path = this.getMediamtxPath();
    try {
      const content = await fs.readFile(path, 'utf8');
      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error('mediamtx.yml not found');
      }
      throw new Error(`Failed to read mediamtx.yml: ${error.message}`);
    }
  }

  static async updateMediamtxConfig(content: string): Promise<void> {
    const path = this.getMediamtxPath();
    try {
      await fs.writeFile(path, content, 'utf8');
    } catch (error: any) {
      throw new Error(`Failed to write mediamtx.yml: ${error.message}`);
    }
  }

  /**
   * Update HOST_IP and add IP to SSE_ALLOW_ORIGINS in .env file
   */
  static async updateHostIp(ip: string): Promise<void> {
    const path = this.getEnvPath();
    try {
      // Read current .env content
      let content = await this.getEnvFile();
      
      // Validate IP format (basic validation)
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        throw new Error('Invalid IP address format');
      }

      // Get old IP from HOST_IP before updating
      let oldIp: string | null = null;
      const oldIpMatch = content.match(/^HOST_IP=(.+)$/m);
      if (oldIpMatch && ipRegex.test(oldIpMatch[1].trim())) {
        oldIp = oldIpMatch[1].trim();
      }

      const lines = content.split('\n');
      let hostIpFound = false;
      let sseAllowOriginsFound = false;
      let baseUrlFound = false;
      let homepageUrlFound = false;
      const updatedLines: string[] = [];

      for (const element of lines) {
        const line = element;
        const trimmedLine = line.trim();

        // Update HOST_IP
        if (trimmedLine.startsWith('HOST_IP=') || trimmedLine.startsWith('#HOST_IP=')) {
          updatedLines.push(`HOST_IP=${ip}`);
          hostIpFound = true;
          continue;
        }

        // Update SSE_ALLOW_ORIGINS
        if (trimmedLine.startsWith('SSE_ALLOW_ORIGINS=') || trimmedLine.startsWith('#SSE_ALLOW_ORIGINS=')) {
          const match = line.match(/^(#?\s*SSE_ALLOW_ORIGINS=)(.*)$/);
          if (match) {
            const prefix = match[1];
            const existingValue = match[2].trim();
            
            // Parse existing origins (could be comma-separated or space-separated)
            let origins: string[] = [];
            if (existingValue) {
              origins = existingValue.split(/[,\s]+/).filter(o => o.trim());
            }
            
            // Format IP with http:// prefix
            const ipWithProtocol = `http://${ip}`;
            
            // Check if IP (with or without http://) is already present
            const ipExists = origins.some(origin => 
              origin === ip || 
              origin === ipWithProtocol || 
              origin === `http://${ip}` ||
              origin === `https://${ip}` ||
              origin.includes(ip)
            );
            
            // Add new IP with http:// prefix if not already present
            if (!ipExists) {
              origins.push(ipWithProtocol);
            }
            
            updatedLines.push(`${prefix}${origins.join(',')}`);
            sseAllowOriginsFound = true;
            continue;
          }
        }

        // Update BASE_URL - replace localhost with IP
        if (trimmedLine.startsWith('BASE_URL=') || trimmedLine.startsWith('#BASE_URL=')) {
          const match = line.match(/^(#?\s*BASE_URL=)(.*)$/);
          if (match) {
            const prefix = match[1];
            const urlValue = match[2].trim();
            // Replace localhost with IP in URL
            const updatedUrl = urlValue.replaceAll('http://localhost:', `http://${ip}:`);
            updatedLines.push(`${prefix}${updatedUrl}`);
            baseUrlFound = true;
            continue;
          }
        }

        // Update HOMEPAGE_URL - replace localhost with IP
        if (trimmedLine.startsWith('HOMEPAGE_URL=') || trimmedLine.startsWith('#HOMEPAGE_URL=')) {
          const match = line.match(/^(#?\s*HOMEPAGE_URL=)(.*)$/);
          if (match) {
            const prefix = match[1];
            const urlValue = match[2].trim();
            // Replace localhost with IP in URL
            const updatedUrl = urlValue.replaceAll('http://localhost:', `http://${ip}:`);
            updatedLines.push(`${prefix}${updatedUrl}`);
            homepageUrlFound = true;
            continue;
          }
        }

        // Keep other lines as is
        updatedLines.push(line);
      }

      // Add HOST_IP if not found
      if (!hostIpFound) {
        updatedLines.push(`HOST_IP=${ip}`);
      }

      // Add SSE_ALLOW_ORIGINS if not found (with http:// prefix)
      if (!sseAllowOriginsFound) {
        updatedLines.push(`SSE_ALLOW_ORIGINS=http://${ip}`);
      }

      // Add BASE_URL if not found (with default port 8457)
      if (!baseUrlFound) {
        updatedLines.push(`BASE_URL=http://${ip}:8457/api/v1`);
      }

      // Add HOMEPAGE_URL if not found (with default port 80)
      if (!homepageUrlFound) {
        updatedLines.push(`HOMEPAGE_URL=http://${ip}:80`);
      }

      // Write updated content
      const updatedContent = updatedLines.join('\n');
      await fs.writeFile(path, updatedContent, 'utf8');

      // Also update mediamtx.yml webrtcAdditionalHosts
      await this.updateMediamtxWebrtcHosts(ip, oldIp);
    } catch (error: any) {
      throw new Error(`Failed to update HOST_IP: ${error.message}`);
    }
  }

  /**
   * Update webrtcAdditionalHosts in mediamtx.yml
   * Uses regex to preserve comments and formatting
   */
  private static async updateMediamtxWebrtcHosts(newIp: string, oldIp: string | null): Promise<void> {
    const path = this.getMediamtxPath();
    try {
      // Read current mediamtx.yml content
      const content = await this.getMediamtxConfig();
      
      // IP regex for validation
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      
      // Find the webrtcAdditionalHosts line
      const lines = content.split('\n');
      const updatedLines: string[] = [];
      let webrtcHostsFound = false;
      
      for (const line of lines) {
        const trimmedLine = line.trim();
        
        // Match webrtcAdditionalHosts line (with or without comment)
        if (trimmedLine.startsWith('webrtcAdditionalHosts:')) {
          webrtcHostsFound = true;
          
          // Parse the array value from the line
          // Format: webrtcAdditionalHosts: ["localhost", "127.0.0.1", "192.168.1.100"]
          const arrayMatch = line.match(/webrtcAdditionalHosts:\s*(.+?)(\s*#.*)?$/);
          
          if (arrayMatch) {
            const arrayValue = arrayMatch[1].trim();
            
            // Parse the array (handle both YAML array format and inline format)
            let hosts: string[] = [];
            
            // Try to parse as YAML array: ["item1", "item2"] or [item1, item2]
            const arrayContentMatch = arrayValue.match(/\[(.*?)\]/);
            if (arrayContentMatch) {
              const itemsStr = arrayContentMatch[1];
              // Split by comma and clean up quotes
              hosts = itemsStr
                .split(',')
                .map(item => item.trim().replaceAll(/(^["']|["']$)/g, ''))
                .filter(item => item.length > 0);
            } else {
              // Fallback: treat as single value
              const singleValue = arrayValue.replaceAll(/(^["']|["']$)/g, '');
              if (singleValue) {
                hosts = [singleValue];
              }
            }
            
            // If old IP exists, replace it with new IP
            if (oldIp && oldIp !== newIp) {
              hosts = hosts.map((host: string) => {
                if (host === oldIp) {
                  return newIp;
                }
                return host;
              });
            }
            
            // Remove other IP addresses (keep only localhost, 127.0.0.1, and the new IP)
            hosts = hosts.filter((host: string) => {
              // Keep localhost and 127.0.0.1
              if (host === 'localhost' || host === '127.0.0.1') {
                return true;
              }
              // Keep the new IP
              if (host === newIp) {
                return true;
              }
              // Remove other IP addresses
              return !ipRegex.test(host);
            });
            
            // Add new IP if not already present
            if (!hosts.includes(newIp)) {
              hosts.push(newIp);
            }
            
            // Reconstruct the line with preserved formatting and comments
            const comment = arrayMatch[2] || '';
            const indent = line.match(/^(\s*)/)?.[1] || '';
            const formattedHosts = hosts.map(h => `"${h}"`).join(', ');
            updatedLines.push(`${indent}webrtcAdditionalHosts: [${formattedHosts}]${comment}`);
          } else {
            // If we can't parse, keep the original line
            updatedLines.push(line);
          }
        } else {
          // Keep all other lines as-is (preserves comments)
          updatedLines.push(line);
        }
      }
      
      // If webrtcAdditionalHosts not found, add it (find a good place after webrtc settings)
      if (!webrtcHostsFound) {
        let insertIndex = -1;
        for (let i = 0; i < updatedLines.length; i++) {
          if (updatedLines[i].trim().startsWith('webrtcLocalTCPAddress:')) {
            insertIndex = i + 1;
            break;
          }
        }
        
        if (insertIndex === -1) {
          // If we can't find a good place, append at the end of webrtc section
          insertIndex = updatedLines.length;
        }
        
        const hosts = ['localhost', '127.0.0.1', newIp].filter(Boolean);
        const formattedHosts = hosts.map(h => `"${h}"`).join(', ');
        updatedLines.splice(insertIndex, 0, `webrtcAdditionalHosts: [${formattedHosts}]`);
      }
      
      // Write updated content (preserves all comments and formatting)
      const updatedContent = updatedLines.join('\n');
      await fs.writeFile(path, updatedContent, 'utf8');
    } catch (error: any) {
      // Log error but don't throw - we don't want to fail the entire update if mediamtx update fails
      console.warn(`Failed to update mediamtx.yml webrtcAdditionalHosts: ${error.message}`);
    }
  }
}



