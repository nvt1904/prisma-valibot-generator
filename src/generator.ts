#!/usr/bin/env node

import { generatorHandler, GeneratorOptions } from '@prisma/generator-helper';
import { generateSchemas } from './lib/generate-schemas';
import { writeFileSafely } from './utils/write-file';
import path from 'path';
import fs from 'fs';

generatorHandler({
  onManifest() {
    return {
      defaultOutput: '../generated/valibot',
      prettyName: 'Prisma Valibot Generator',
      requiresGenerators: ['prisma-client-js'],
    };
  },

  async onGenerate(options: GeneratorOptions) {
    const outputDir = options.generator.output?.value || '../generated/valibot';

    // Clean output directory
    if (fs.existsSync(outputDir)) {
      fs.rmSync(outputDir, { recursive: true, force: true });
    }
    fs.mkdirSync(outputDir, { recursive: true });

    // Generate all schemas
    const files = generateSchemas(options.dmmf);

    // Write all generated files
    for (const [filename, content] of Object.entries(files)) {
      const filePath = path.join(outputDir, filename);
      await writeFileSafely(filePath, content);
    }

    console.log(`✅ Generated Valibot schemas in ${outputDir}`);
  },
});
