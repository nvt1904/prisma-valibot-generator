import fs from 'fs';
import path from 'path';

export async function writeFileSafely(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, content, 'utf-8');
}

export function formatCode(code: string): string {
  // Basic code formatting - you can integrate prettier here if needed
  return code;
}
