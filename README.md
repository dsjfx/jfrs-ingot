# 类型定义文档

## 目录结构
types/
├── index.ts # 类型导出入口
├── global.d.ts # 全局类型声明（环境变量、通用类型）
├── express.d.ts # Express 类型扩展
├── database.d.ts # 数据库相关类型
├── api.d.ts # API 响应/请求类型
├── user.d.ts # 用户相关类型
├── blog.d.ts # 博客相关类型
├── category.d.ts # 分类相关类型
├── tag.d.ts # 标签相关类型
├── comment.d.ts # 评论相关类型
├── logger.d.ts # 日志相关类型
└── utils.d.ts # 工具类型


## 使用指南

### 导入类型

```typescript
// 导入特定类型
import type { UserProfile } from '@/types/user';

// 导入所有类型
import type * as Types from '@/types';

// 使用类型别名
type UserWithBlogs = Types.UserProfile & { blogs: Types.BlogListItem[] };
