import { sequelize } from '../src/models';
import Comment from '../src/models/Comment';
import CommentLike from '../src/models/CommentLike';
import logger from '../src/utils/logger';

/**
 * 评论点赞数校准脚本
 */
async function calibrate() {
  logger.info('开始校准点赞数...');

  // 1. 找出所有评论的真实点赞数
  const stats = (await CommentLike.findAll({
    attributes: ['commentId', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
    group: ['commentId'],
    raw: true,
  })) as any[];

  const realCounts = new Map<string, number>();
  stats.forEach(s => realCounts.set(s.commentId, parseInt(s.count, 10)));

  // 2. 更新所有评论的 likes
  const comments = await Comment.findAll({ attributes: ['id', 'likes'] });

  let fixed = 0;
  for (const comment of comments) {
    const realCount = realCounts.get(String(comment.id)) || 0;
    if (comment.likes !== realCount) {
      await Comment.update({ likes: realCount }, { where: { id: comment.id } });
      fixed++;
      logger.info(`修复评论 ${comment.id}: ${comment.likes} → ${realCount}`);
    }
  }

  logger.info(`校准完成，修复 ${fixed} 条评论`);
  process.exit(0);
}

calibrate();
