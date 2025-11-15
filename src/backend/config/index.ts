import fs from 'fs';
import path from 'path';
import os from 'os';

export interface MimirlinkConfig {
  // The base directory for the project, often where the project-level config is found
  workspace: string;
  // The directory where notes (journals, pages) are actually stored
  notesDirectory: string;
  port: number;
  watcher?: {
    enabled: boolean;
  };
  // Add other configuration properties as needed
}

const DEFAULT_CONFIG: MimirlinkConfig = {
  workspace: process.cwd(), // Default to current working directory
  notesDirectory: path.join(process.cwd(), 'docs', 'samples'), // Default to 'docs/samples' subdirectory
  port: 3001, // Default port for the server
  watcher: {
    enabled: true,
  },
};

// Function to load a single config file
function loadConfigFile(filePath: string): Partial<MimirlinkConfig> | null {
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (e) {
      console.error(`Error parsing config file ${filePath}:`, e);
      return null;
    }
  }
  return null;
}

// Function to find and load project-level config
function findProjectConfig(): Partial<MimirlinkConfig> | null {
  let currentDir = process.cwd();
  while (currentDir !== path.parse(currentDir).root) {
    const configPath = path.join(currentDir, 'mimirlink.config.json');
    const config = loadConfigFile(configPath);
    if (config) {
      // If a project config is found, its workspace should be its directory
      return { ...config, workspace: currentDir };
    }
    currentDir = path.dirname(currentDir);
  }
  return null;
}

// Main function to load configuration hierarchically
export function loadConfiguration(): MimirlinkConfig {
  try {
    let config: MimirlinkConfig = { ...DEFAULT_CONFIG };

    // 1. Load System-wide config (e.g., /etc/mimirlink/mimirlink.config.json)
    // For simplicity, we'll skip this for now and add it if explicitly requested or needed.
    // const systemConfigPath = process.platform === 'win32'
    //   ? path.join(process.env.PROGRAMDATA || 'C:\\ProgramData', 'mimirlink', 'mimirlink.config.json')
    //   : '/etc/mimirlink/mimirlink.config.json';
    // const systemConfig = loadConfigFile(systemConfigPath);
    // if (systemConfig) {
    //   config = { ...config, ...systemConfig };
    // }

    // 2. Load User-specific config (~/.mimirlink/mimirlink.config.json)
    const userConfigPath = path.join(os.homedir(), '.mimirlink', 'mimirlink.config.json');
    const userConfig = loadConfigFile(userConfigPath);
    if (userConfig) {
      const { watcher: userWatcher, ...restOfUserConfig } = userConfig;
      config = { ...config, ...restOfUserConfig };
      if (userWatcher) {
        config.watcher = { ...config.watcher, ...userWatcher };
      }
    } else {
      // If user config doesn't exist, create a default one
      const userConfigDir = path.dirname(userConfigPath);
      try {
        if (!fs.existsSync(userConfigDir)) {
          fs.mkdirSync(userConfigDir, { recursive: true });
        }
        fs.writeFileSync(userConfigPath, JSON.stringify({
          workspace: path.join(os.homedir(), 'mimirlink'), // Default user workspace
          notesDirectory: path.join(os.homedir(), 'mimirlink', 'notes'),
          port: DEFAULT_CONFIG.port,
        }, null, 2), 'utf-8');
        // Reload to ensure the newly created config is used
        const createdUserConfig = loadConfigFile(userConfigPath);
        if (createdUserConfig) {
          config = { ...config, ...createdUserConfig };
        }
      } catch (error) {
        console.error(`Error creating or writing default user config at ${userConfigPath}:`, error);
        // Continue with default config if user config creation fails
      }
    }
    // 3. Load Project-specific config (mimirlink.config.json in CWD or parent)
    const projectConfig = findProjectConfig();
    if (projectConfig) {
      const { watcher: projectWatcher, ...restOfProjectConfig } = projectConfig;
      config = { ...config, ...restOfProjectConfig };
      if (projectWatcher) {
        config.watcher = { ...config.watcher, ...projectWatcher };
      }
    }

    // 4. Apply Environment Variables (e.g., MIMIRLINK_PORT, MIMIRLINK_NOTES_DIRECTORY)
    if (process.env.MIMIRLINK_WORKSPACE) {
      config.workspace = process.env.MIMIRLINK_WORKSPACE;
    }
    if (process.env.MIMIRLINK_NOTES_DIRECTORY) {
      config.notesDirectory = process.env.MIMIRLINK_NOTES_DIRECTORY;
    }
    if (process.env.MIMIRLINK_PORT) {
      config.port = parseInt(process.env.MIMIRLINK_PORT, 10);
    }

    // Ensure notesDirectory is absolute and relative to workspace if not absolute
    if (!path.isAbsolute(config.notesDirectory)) {
      config.notesDirectory = path.join(config.workspace, config.notesDirectory);
    }

    // Ensure the notesDirectory exists
    if (!fs.existsSync(config.notesDirectory)) {
      console.log(`Creating notes directory: ${config.notesDirectory}`);
      fs.mkdirSync(config.notesDirectory, { recursive: true });
    }

    console.log(`Resolved workspace: ${config.workspace}`);
    console.log(`Resolved notesDirectory: ${config.notesDirectory}`);
    console.log(`Resolved port: ${config.port}`);

    return config;
  } catch (error) {
    console.error('An unexpected error occurred during configuration loading:', error);
    // Return default config as a fallback
    return DEFAULT_CONFIG;
  }
}

// Export the loaded configuration for easy access
export const AppConfig = loadConfiguration();
