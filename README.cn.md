# jingot（元宝博客）

一个基于 TypeScript 的博客后台 API 项目，提供用户、分类、标签、文章、评论、图片等管理接口。项目使用 Express、Sequelize（MySQL）、Redis，并支持文件上传与图片处理。

## 功能

- RESTful API（用户、分类、标签、文章、评论、图片）
- TypeScript + Express
- Sequelize ORM（带迁移和数据填充）
- JWT 鉴权
- 文件上传（multer）与图片处理（sharp）
- 限流、请求校验与日志

## 环境要求

- Node.js 18 及以上（建议使用 LTS）
- pnpm / npm / yarn（推荐 pnpm）
- MySQL 数据库
- Redis（可选，建议用于缓存 / 验证码）

## 快速开始

1. 安装依赖

```bash
pnpm install
# 或者
npm install
```

2. 创建 `.env`（或使用 `.env.example`）并配置数据库、Redis、JWT 等环境变量，例如：

- NODE_ENV
- DATABASE_URL / DB_HOST / DB_USER / DB_PASS / DB_NAME
- REDIS_URL / REDIS_HOST / REDIS_PORT
- JWT_SECRET

3. 创建并初始化数据库（开发环境）

```bash
pnpm run db:create
pnpm run db:init
```

4. 如果需要，也可以单独运行迁移和填充：

```bash
pnpm run migrate
pnpm run seed
```

5. 开发模式运行：

```bash
pnpm run dev
```

生产构建与启动：

```bash
pnpm run build
pnpm start
```

## 常用脚本

在 `package.json` 中定义了常用脚本：

- `pnpm run dev` - 开发模式（nodemon + ts-node）
- `pnpm run build` - 编译 TypeScript 到 `dist`
- `pnpm start` - 运行已编译的服务
- `pnpm run test` - 运行测试（Jest）
- `pnpm run lint` / `lint:fix` - ESLint
- `pnpm run format` - Prettier
- 数据库相关：`db:create`、`db:drop`、`db:init`、`db:reset`、`db:refresh`、`migrate`、`seed` 等

详细脚本请参见 `package.json`。

## 配置

配置文件位于 `config/` 目录，使用 `dotenv` / `dotenv-flow` 进行环境变量管理。

## 数据库

项目使用 Sequelize，迁移文件在 `db/migrations`，数据填充（seeders）在 `db/seeders`。

运行迁移：

```bash
pnpm run migrate
```

回滚迁移：

```bash
pnpm run migrate:undo
pnpm run migrate:undo:all
```

## 测试

运行单元/集成测试：

```bash
pnpm test
pnpm run test:watch
pnpm run test:coverage
```

## 开发说明

- 源码目录：`src/`
- 编译输出：`dist/`
- 开发时使用 `ts-node` 与 `tsconfig-paths` 以支持路径别名

## 贡献

欢迎贡献！对于大型改动建议先打开 issue 讨论。请遵循现有代码风格，并为新增功能添加测试。

## 协议

MIT
