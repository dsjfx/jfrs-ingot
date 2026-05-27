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
