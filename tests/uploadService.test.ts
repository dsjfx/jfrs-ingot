import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import UploadService from '../src/services/UploadService';

describe('UploadService (basic non-image flow)', () => {
  const tmpRoot = path.join(os.tmpdir(), `jingot-test-${Date.now()}`);

  beforeAll(async () => {
    process.env.UPLOAD_PATH = tmpRoot;
    // require the service after env change (module is imported at top as UploadService)
    await fs.mkdir(tmpRoot, { recursive: true });
  });

  afterAll(async () => {
    // clean up
    await fs.rm(tmpRoot, { recursive: true, force: true }).catch(() => null);
  });

  test('uploadFile saves to year/month and getFileInfo/deleteFile work', async () => {
    // create a temporary file to simulate multer file
    const tmpFilePath = path.join(tmpRoot, 'temp', `testfile-${Date.now()}`);
    await fs.mkdir(path.dirname(tmpFilePath), { recursive: true });
    const content = 'hello world';
    await fs.writeFile(tmpFilePath, content);

    const multerFile: Express.Multer.File = {
      fieldname: 'file',
      originalname: 'hello.txt',
      encoding: '7bit',
      mimetype: 'text/plain',
      size: Buffer.byteLength(content),
      destination: path.dirname(tmpFilePath),
      filename: path.basename(tmpFilePath),
      path: tmpFilePath,
      buffer: undefined,
      stream: undefined as unknown as NodeJS.ReadableStream,
    } as unknown as Express.Multer.File;

    const result = await UploadService.uploadFile(multerFile, {
      allowedTypes: ['text/plain'],
    });
    expect(result).toHaveProperty('path');
    // path should contain year/month
    const parts = result.path!.split('/');
    expect(parts.length).toBeGreaterThanOrEqual(2);

    const fileInfo = await UploadService.getFileInfo(result.filename);
    expect(fileInfo.exists).toBe(true);
    expect(fileInfo.url).toBeDefined();

    const deleted = await UploadService.deleteFile(result.filename);
    expect(deleted).toBe(true);

    const after = await UploadService.getFileInfo(result.filename);
    expect(after.exists).toBe(false);
  });
});
