/**
 *  常用状态码
 */

// 成功
const OK: number = 200;

// 请求语法错误或参数不合法
const BadRequest: number = 400;

// 未授权/未登录，通常缺少 token 或 token 无效。
const Unauthorized = 401;

// 权限不足
const Forbidden = 403;

// 资源不存在
const NotFound = 404;

// 请求与服务器当前状态冲突（如重复创建资源）。
const Conflict = 409;

// 请求格式正确，但语义错误（如字段验证失败）。
const ValidationError = 422;

// 请求频率过高，触发限流。
const TooManyRequests = 429;

// 服务器内部错误
const InternalServerError = 500;

// 网关错误
const BadGateway = 502;

// 服务不可用
const ServiceUnavailable = 503;

// 网关超时
const GatewayTimeout = 504;

export default {
  OK,
  BadRequest,
  Unauthorized,
  Forbidden,
  NotFound,
  Conflict,
  ValidationError,
  TooManyRequests,
  InternalServerError,
  BadGateway,
  ServiceUnavailable,
  GatewayTimeout,
};
