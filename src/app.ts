import fs from 'fs';
import path from 'path';
import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import config from './config';
import logger from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger, responseTime, errorLogger } from './middleware/loggerHandler';

// 导入路由
import routes from './routes/index';

const app: Express = express();

// 安全中间件
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    crossOriginEmbedderPolicy: false, // 如果需要加载外部资源
  })
);

// 请求日志中间件
app.use(requestLogger);
app.use(responseTime);

// CORS配置
const corsOptions = {
  origin:
    config.env === 'production'
      ? process.env.CORS_ORIGIN
        ? process.env.CORS_ORIGIN.split(',')
        : []
      : '*',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24小时
};
app.use(cors(corsOptions));

// 生产环境压缩
if (config.env === 'production') {
  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6, // 压缩级别 0-9，6 是平衡点
      threshold: 1024, // 只压缩大于 1KB 的响应
    })
  );
}

// 请求体解析
app.use(
  express.json({
    limit: '10mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf.toString(); // 保存原始请求体用于签名验证等
    },
  })
);
app.use(
  express.urlencoded({
    extended: true,
    limit: '10mb',
    parameterLimit: 10000, // 最多 10000 个参数
  })
);

// Cookie 解析（用于 session 或 CSRF token）
app.use(cookieParser(process.env.COOKIE_SECRET || 'your-cookie-secret'));

// 请求日志
// 开发环境使用彩色输出，生产环境使用文件日志
if (config.env === 'development') {
  app.use(
    morgan('dev', {
      stream: {
        write: (message: string) => logger.http(message.trim()),
      },
    })
  );
} else {
  // 创建访问日志目录
  const logDir = path.join(__dirname, '../logs');
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }

  const accessLogStream = fs.createWriteStream(path.join(logDir, 'access.log'), { flags: 'a' });

  app.use(
    morgan('combined', {
      stream: accessLogStream,
    })
  );
  // app.use(morgan('combined', { stream }));
}

// 速率限制
const apiLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: { error: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
  skip: req => {
    // 跳过健康检查
    return req.path === '/health';
  },
});
app.use('/api/', apiLimiter);

// 针对认证接口的更严格限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 每个 IP 15分钟内最多 5 次登录尝试
  message: { error: '登录尝试过多，请稍后再试' },
  skipSuccessfulRequests: true, // 成功的请求不计入限制
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// 静态文件服务
if (config.env === 'development') {
  // 创建必要的目录
  const publicDir = path.join(__dirname, '../public');
  const uploadsDir = path.join(__dirname, '../uploads');

  [publicDir, uploadsDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });

  // 前端静态文件
  app.use(
    express.static(publicDir, {
      maxAge: '1d', // 缓存 1 天
      index: 'index.html',
    })
  );

  // 上传的文件
  app.use(
    '/uploads',
    express.static(uploadsDir, {
      maxAge: '7d', // 缓存 7 天
      setHeaders: (res, filePath) => {
        // 跨域
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        // 对图片设置更长的缓存
        if (filePath.match(/\.(jpg|jpeg|png|gif|webp)$/)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1年
        }
      },
    })
  );
}

// 健康检查
app.get('/health', (req, res) => {
  const healthcheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: 'unknown',
  };

  // 异步检查数据库连接
  (async () => {
    try {
      const { sequelize } = await import('./models');
      await sequelize.authenticate();
      healthcheck.database = 'connected';
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      healthcheck.database = 'disconnected';
      healthcheck.status = 'WARNING';
    }

    // 如果是详细检查，返回完整状态
    if (req.query.detailed === 'true') {
      res.json(healthcheck);
    } else {
      res.json({ status: healthcheck.status });
    }
  })();
});

// API路由
app.use('/', routes);

// 404处理
app.use(notFoundHandler);

// 错误日志中间件
app.use(errorLogger);

// 错误处理
app.use(errorHandler);

export default app;
