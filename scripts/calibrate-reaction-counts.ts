import { sequelize } from '../src/models';
import Blog from '../src/models/Blog';
import BlogReaction, { ReactionType } from '../src/models/BlogReaction';
import logger from '../src/utils/logger';

async function calibrate() {
  logger.info('开始校准文章反应计数...');

  // 1. 统计每篇文章的实际点赞/不喜欢数
  const [likeStats, dislikeStats] = await Promise.all([
    BlogReaction.findAll({
      attributes: ['articleId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { reactionType: ReactionType.LIKE },
      group: ['articleId'],
      raw: true,
    }) as any,
    BlogReaction.findAll({
      attributes: ['articleId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { reactionType: ReactionType.DISLIKE },
      group: ['articleId'],
      raw: true,
    }) as any,
  ]);

  const likeMap = new Map<string, number>();
  const dislikeMap = new Map<string, number>();
  likeStats.forEach(s => likeMap.set(s.articleId, parseInt(s.count, 10)));
  dislikeStats.forEach(s => dislikeMap.set(s.articleId, parseInt(s.count, 10)));

  // 2. 对比并修复
  const blogs = await Blog.findAll({ attributes: ['id', 'likeCount', 'dislikeCount'] });
  let fixed = 0;

  for (const blog of blogs) {
    const realLike = likeMap.get(String(blog.id)) || 0;
    const realDislike = dislikeMap.get(String(blog.id)) || 0;

    if (blog.likeCount !== realLike || blog.dislikeCount !== realDislike) {
      await Blog.update(
        { likeCount: realLike, dislikeCount: realDislike },
        { where: { id: blog.id } }
      );
      fixed++;
      logger.info(
        `修复文章 ${blog.id}: 赞 ${blog.likeCount}→${realLike}, 踩 ${blog.dislikeCount}→${realDislike}`
      );
    }
  }

  logger.info(`校准完成，修复 ${fixed} 篇文章`);
  process.exit(0);
}

calibrate();
