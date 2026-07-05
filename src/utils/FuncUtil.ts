import exifr from 'exifr';
import { ExifTool } from 'exiftool-vendored';
import logger from '../utils/logger';

// 枚举值查找函数
export function getEnumByValue<T extends Record<string, string>>(
  enumObj: T,
  value: string
): T[keyof T] | undefined {
  return Object.values(enumObj).find(v => v === value) as T[keyof T] | undefined;
}

// 创建反向映射对象
export function reverseMapping<T extends Record<string, string>>(enumObj: T) {
  const value = Object.fromEntries(
    Object.entries(enumObj).map(([key, value]) => [value, key])
  ) as Record<string, string>;
  return value;
}

/**
 * 生成随机偏移量数组
 * @param total - 总数
 * @param count - 需要的数量
 * @returns 随机偏移量数组
 */
export function generateRandomOffsets(total: number, count: number): number[] {
  const offsets: number[] = [];
  const maxOffset = Math.max(0, total - 1);

  while (offsets.length < Math.min(count, total)) {
    const offset = Math.floor(Math.random() * (maxOffset + 1));
    if (!offsets.includes(offset)) {
      offsets.push(offset);
    }
  }

  return offsets.sort((a, b) => a - b);
}

/**
 * 将时长字符串解析为秒数
 *
 * 支持格式：
 * - 30s / 30m / 2h / 7d / 1w / 1y
 * - 1h30m / 1.5h
 * - 90（纯数字表示秒）
 */
export function parseDurationToSeconds(duration: string | number): number {
  if (typeof duration === 'number') {
    if (!Number.isFinite(duration) || duration < 0) {
      throw new Error(`Invalid duration number: ${duration}`);
    }
    return duration;
  }

  const trimmed = duration.trim().toLowerCase();
  if (!trimmed) {
    throw new Error('Invalid duration format: empty string');
  }

  // Pure numeric string is treated as seconds
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  const unitMultipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
    w: 7 * 24 * 60 * 60,
    y: 365 * 24 * 60 * 60,
  };

  let totalSeconds = 0;
  let remaining = trimmed;
  const regex = /([0-9]+(?:\.[0-9]+)?)([smhdwy])/g;

  remaining = remaining.replace(regex, (_, value, unit) => {
    totalSeconds += Number(value) * unitMultipliers[unit];
    return '';
  });

  if (remaining.length !== 0 || totalSeconds === 0) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  return Math.floor(totalSeconds);
}

/**
 * 获取月份名称
 */
export function getMonthName(month: number): string {
  const monthNames = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ];
  return monthNames[month - 1];
}

/**
 * 格式化日期为字符串，支持自定义格式。
 * 默认格式为 "yyyy-MM-dd"
 * 支持标记：yyyy, yy, MM, dd, HH, mm, ss
 */
export function formatDate(input: Date | string | number, format: string = 'yyyy-MM-dd'): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return '';
  const replacements: Record<string, string> = {
    yyyy: d.getFullYear().toString(),
    yy: d.getFullYear().toString().slice(-2),
    MM: String(d.getMonth() + 1).padStart(2, '0'),
    dd: String(d.getDate()).padStart(2, '0'),
    HH: String(d.getHours()).padStart(2, '0'),
    mm: String(d.getMinutes()).padStart(2, '0'),
    ss: String(d.getSeconds()).padStart(2, '0'),
  };
  return Object.keys(replacements).reduce(
    (str, token) => str.replace(new RegExp(token, 'g'), replacements[token]),
    format
  );
}

export async function writePicExif(
  file: Express.Multer.File,
  exifData: Record<string, any>
): Promise<void> {
  // instance of ExifTool
  const exiftool = new ExifTool();

  // Get the file path
  const filePath = file.path;

  try {
    // Prepare the EXIF data to be written
    const exifToWrite = {
      DateTimeOriginal: exifData.DateTimeOriginal || '',
      CreateDate: exifData.CreateDate || '',
      ModifyDate: exifData.ModifyDate || '',
      DateTimeDigitized: exifData.DateTimeDigitized || '',
      Make: exifData.Make || '',
      Model: exifData.Model || '',
      Copyright: exifData.Copyright || '',
      Artist: exifData.Artist || '',
      ExposureTime: exifData.ExposureTime || '',
      FNumber: exifData.FNumber || '',
      ISO: exifData.ISO || '',
      FocalLength: exifData.FocalLength || '',
      Latitude: exifData.GPS?.Latitude || '',
      Longitude: exifData.GPS?.Longitude || '',
      Altitude: exifData.GPS?.Altitude || '',
    };

    // write EXIF
    await exiftool.write(filePath, exifToWrite, {
      writeArgs: ['-overwrite_original'],
      ignoreMinorErrors: true,
    });

    // Verify the new file
    const newMeta = await exifr.parse(filePath);
    logger.info('Shooting time:', newMeta.DateTimeOriginal);
  } catch (error) {
    logger.error('error:', error);
  } finally {
    // Close the process
    await exiftool.end();
  }
}
