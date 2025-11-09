import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

export function getPackageVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);

    const packageJsonPath = resolve(__dirname, '../package.json');
    const packageJsonContent = readFileSync(packageJsonPath, 'utf-8');
    const packageData = JSON.parse(packageJsonContent);

    if (typeof packageData.version === 'string') {
      return packageData.version;
    } else {
      throw new Error('Version nicht gefunden oder ungültig.');
    }
  } catch (error) {
    console.error('Fehler beim Lesen der Version aus package.json:', error);
    return 'unbekannt';
  }
}
