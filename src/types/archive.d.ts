export interface ArchiveOptions {
  year?: number; // 指定年份
  month?: number; // 指定月份
  pYears?: number[]; //指定年份数组
  limit?: number; // 初始加载的年份数量
  status?: string; // 博客状态
  subject?: string; // 博客类型
}

export interface ArchiveMonthData {
  month: number;
  monthName: string;
  count: number;
  posts: Array<{
    id: number;
    title: string;
    publishedAt: string;
    day: number;
    summary?: string;
    coverImage?: string;
  }>;
}

export interface ArchiveYearData {
  year: number;
  count: number;
  months: ArchiveMonthData[];
}

export interface ArchiveResponse {
  years: ArchiveYearData[];
  totalPosts: number;
  totalYears: number;
  stats: {
    earliestYear: number;
    latestYear: number;
    yearsWithPosts: number[];
  };
}
