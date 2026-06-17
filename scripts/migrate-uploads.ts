#!/usr/bin/env ts-node
import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import logger from '../src/utils/logger';

const UPLOAD_DIR = process.env.UPLOAD_PATH || path.join(__dirname, '../uploads');

function parseExifDate(exifBuffer?: Buffer): Date | null {
  if (!exifBuffer) return null;
  try {
    const str = exifBuffer.toString('latin1');
    const m = str.match(/\d{4}:\d{2}:\d{2} \d{2}:\d{2}:\d{2}/);
    if (m && m[0]) {
      const d = m[0].replace(/^(\d{4}):(\d{2}):(\d{2})/, '$1-$2-$3');
      return new Date(d.replace(' ', 'T'));
    }
  } catch (err) {
    logger.error(err);
  }
  return null;
}

async function getImageDate(filePath: string): Promise<Date> {
  try {
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const exifDate = parseExifDate(metadata.exif as Buffer | undefined);
    if (exifDate) return exifDate;
  } catch (err) {
    logger.error(err);
  }

  try {
    const st = await fs.stat(filePath);
    if (st.birthtimeMs && !isNaN(st.birthtimeMs)) return st.birthtime;
  } catch (err) {
    logger.error(err);
  }

  return new Date();
}

async function migrateFile(filePath: string, dryRun = true) {
  const filename = path.basename(filePath);
  const date = await getImageDate(filePath);
  const year = date.getFullYear();
  const month = `${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  const targetDir = path.join(UPLOAD_DIR, `${year}`, `${month}`);
  const targetThumbDir = path.join(targetDir, 'thumbnails');
  const targetPath = path.join(targetDir, filename);

  if (filePath === targetPath) return null;

  // thumbnail candidates (common places)
  const thumbnailFilename = `thumb_${filename}`;
  const srcThumbCandidates = [
    path.join(path.dirname(filePath), 'thumbnails', thumbnailFilename),
    path.join(UPLOAD_DIR, 'thumbnails', thumbnailFilename),
  ];

  if (dryRun) {
    logger.info(`[dry-run] ${filePath} -> ${targetPath}`);
    for (const srcThumb of srcThumbCandidates) {
      try {
        await fs.access(srcThumb);
        logger.info(`[dry-run] ${srcThumb} -> ${path.join(targetThumbDir, thumbnailFilename)}`);
      } catch {
        // no thumbnail at this candidate
      }
    }
    return { from: filePath, to: targetPath };
  }

  await fs.mkdir(targetDir, { recursive: true });
  await fs.mkdir(targetThumbDir, { recursive: true });

  // move main file
  await fs.rename(filePath, targetPath);
  logger.info(`moved ${filePath} -> ${targetPath}`);

  // move possible thumbnails
  for (const srcThumb of srcThumbCandidates) {
    try {
      await fs.access(srcThumb);
      const destThumb = path.join(targetThumbDir, thumbnailFilename);
      try {
        await fs.rename(srcThumb, destThumb);
        logger.info(`moved thumbnail ${srcThumb} -> ${destThumb}`);
      } catch (err) {
        logger.warn(`failed to move thumbnail ${srcThumb} -> ${destThumb}`, err);
      }
    } catch {
      // ignore missing thumbnail
    }
  }

  return { from: filePath, to: targetPath };
}

async function walkAndMigrate(dryRun = true) {
  const items = await fs.readdir(UPLOAD_DIR).catch(() => [] as string[]);

  for (const item of items) {
    const full = path.join(UPLOAD_DIR, item);
    const st = await fs.stat(full).catch(() => null);
    if (!st) continue;

    // skip already year folders (simple heuristic: numeric folder name)
    if (st.isDirectory() && /^\d{4}$/.test(item)) {
      // skip
      continue;
    }

    if (st.isFile()) {
      await migrateFile(full, dryRun);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = !args.includes('--apply');

  logger.info(`Migrate uploads from ${UPLOAD_DIR} (apply=${!dryRun})`);
  await walkAndMigrate(dryRun);
  logger.info('done');
}

main().catch(err => {
  logger.error('migrate-uploads failed', err);
  process.exitCode = 1;
});
