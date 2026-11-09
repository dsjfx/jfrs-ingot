import { QueryTypes } from 'sequelize';
import { Blog, Op, sequelize } from '../models';
import logger from '../utils/logger';
import {
  ArchiveMonthData,
  ArchiveOptions,
  ArchiveResponse,
  ArchiveYearData,
} from '../types/archive';
import { getMonthName } from '../utils/FuncUtil';
import Constance from '../utils/Constance';

class ArchiveService {
  /**
   * 获取博客归档数据
   * @param options - 查询选项
   * @returns 按年月分组的归档数据
   */
  async getArchive(options: ArchiveOptions = {}): Promise<ArchiveResponse> {
    try {
      const {
        year,
        month,
        pYears = [],
        limit = 3, // 默认加载最近3年
        status = 'published',
        subject,
      } = options;

      // 1. 构建查询条件
      const where: any = { status, subject };

      if (year) {
        where.publishedAt = {
          [Op.between]: [new Date(year, 0, 1), new Date(year, 11, 31, 23, 59, 59)],
        };
      }

      // 处理年份数组（优先于单个年份）
      if (pYears && pYears.length > 0) {
        const yearConditions = pYears.map(y => ({
          [Op.and]: [
            sequelize.where(sequelize.fn('YEAR', sequelize.col('published_at')), y),
            // 如果需要精确到日期的范围查询
            // sequelize.where(sequelize.col('publishedAt'), {
            //   [Op.between]: [new Date(y, 0, 1), new Date(y, 11, 31, 23, 59, 59)]
            // })
          ],
        }));

        where[Op.or] = yearConditions;
      }

      if (month && year) {
        where.publishedAt = {
          [Op.between]: [new Date(year, month - 1, 1), new Date(year, month, 0, 23, 59, 59)],
        };
      }

      // 2. 查询所有符合条件的博客
      const blogs = await Blog.findAll({
        where,
        attributes: ['id', 'title', 'subtitle', 'publishedAt', 'summary', 'coverImage'],
        order: [['published_at', 'DESC']],
      });

      if (blogs.length === 0) {
        return {
          years: [],
          totalPosts: 0,
          totalYears: 0,
          stats: {
            earliestYear: new Date().getFullYear(),
            latestYear: new Date().getFullYear(),
            yearsWithPosts: [],
          },
        };
      }

      // 3. 按年月分组
      const groupedData: Map<number, Map<number, any[]>> = new Map();

      blogs.forEach(blog => {
        const date = new Date(blog.publishedAt);
        const blogYear = date.getFullYear();
        const blogMonth = date.getMonth() + 1;
        const blogDay = date.getDate();

        if (!groupedData.has(blogYear)) {
          groupedData.set(blogYear, new Map());
        }

        const yearMap = groupedData.get(blogYear)!;
        if (!yearMap.has(blogMonth)) {
          yearMap.set(blogMonth, []);
        }

        yearMap.get(blogMonth)!.push({
          id: blog.id,
          title: blog.title,
          subtitle: blog.subtitle,
          publishedAt: blog.publishedAt,
          day: blogDay,
          summary: blog.summary,
          coverImage: blog.coverImage,
        });
      });

      // 4. 构建归档数据
      const years: ArchiveYearData[] = [];
      const yearsList = Array.from(groupedData.keys()).sort((a, b) => b - a);

      // 获取最近N年（或全部）
      const yearsToProcess = limit && !year ? yearsList.slice(0, limit) : yearsList;

      for (const yearNum of yearsToProcess) {
        const yearMap = groupedData.get(yearNum)!;
        const monthsData: ArchiveMonthData[] = [];
        let yearTotalCount = 0;

        // 获取该年的所有月份并排序
        const months = Array.from(yearMap.keys()).sort((a, b) => b - a);

        for (const monthNum of months) {
          const posts = yearMap.get(monthNum)!;
          const monthCount = posts.length;
          yearTotalCount += monthCount;

          monthsData.push({
            month: monthNum,
            monthName: getMonthName(monthNum),
            count: monthCount,
            posts: posts.map(post => ({
              id: post.id,
              title: post.title,
              subtitle: post.subtitle,
              publishedAt: post.publishedAt,
              day: post.day,
              summary: post.summary,
              coverImage: post.coverImage,
            })),
          });
        }

        years.push({
          year: yearNum,
          count: yearTotalCount,
          months: monthsData,
        });
      }

      // 5. 获取统计信息
      const allYears = yearsList;

      return {
        years,
        totalPosts: blogs.length,
        totalYears: allYears.length,
        stats: {
          earliestYear: allYears[allYears.length - 1] || new Date().getFullYear(),
          latestYear: allYears[0] || new Date().getFullYear(),
          yearsWithPosts: allYears,
        },
      };
    } catch (error) {
      logger.error('获取博客归档失败:', error);
      throw error;
    }
  }

  /**
   * 懒加载更多年份数据（滚动加载）
   */
  async getArchiveByYears(
    options: {
      years?: number[]; // 指定要加载的年份
      startYear?: number; // 起始年份
      endYear?: number; // 结束年份
      limit?: number; // 加载的年份数量
      status?: string;
      subject?: string;
    } = {}
  ): Promise<ArchiveResponse> {
    try {
      const {
        years,
        startYear,
        endYear,
        limit = 2,
        status = 'published',
        subject = Constance.DEFAULT_SUBJECT,
      } = options;
      let targetYears: number[] = [];

      if (years && years.length > 0) {
        targetYears = years;
      } else {
        // 获取所有有文章的年份
        const allYears = await this.getYearsWithPosts(status, subject);

        // 确定要加载的年份范围
        const start = startYear || (endYear ? endYear - limit : allYears[allYears.length - 1]);
        const end = endYear || (startYear ? startYear + limit : allYears[0]);

        targetYears = allYears.filter(y => y >= start && y <= end);
      }

      if (targetYears.length === 0) {
        return {
          years: [],
          totalPosts: 0,
          totalYears: 0,
          stats: {
            earliestYear: new Date().getFullYear(),
            latestYear: new Date().getFullYear(),
            yearsWithPosts: [],
          },
        };
      }

      // 查询指定年份的数据
      return await this.getArchive({
        status,
        subject,
        pYears: targetYears,
      });
    } catch (error) {
      logger.error('懒加载归档数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有有文章的年份列表
   */
  private async getYearsWithPosts(
    status: string = 'published',
    subject: string
  ): Promise<number[]> {
    const result = (await sequelize.query(
      `SELECT DISTINCT YEAR(published_at) as year 
      FROM ingot_blogs 
      WHERE status = :status AND subject = :subject
      ORDER BY year DESC`,
      {
        replacements: { status, subject },
        type: QueryTypes.SELECT,
      }
    )) as Array<{ year: number }>;

    return result.map(r => r.year);
  }
}

export default new ArchiveService();
