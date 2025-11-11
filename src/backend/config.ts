import path from 'path';
import fs from 'fs';

export interface MimirlinkConfig {
  workspace: string;
  port: number;
}

export function findAndLoadConfig(): MimirlinkConfig {
  let currentDir = process.cwd();

  while (currentDir !== path.parse(currentDir).root) {
    const configPath = path.join(currentDir, 'mimirlink.config.json');
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      return {
        ...config,
        workspace: currentDir,
      };
    }
    currentDir = path.dirname(currentDir);
  }

  throw new Error('mimirlink.config.json not found in any parent directory.');
}
