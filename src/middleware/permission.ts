// import { Request, Response, NextFunction } from 'express';

// // 角色检查
// export const requireRole = (roles: string | string[]) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ message: '请先登录' })
//     }

//     const userRole = req.user.role
//     const allowedRoles = Array.isArray(roles) ? roles : [roles]

//     if (!allowedRoles.includes(userRole)) {
//       return res.status(403).json({ message: '权限不足' })
//     }

//     next()
//   }
// }

// // 应用访问控制
// export const checkAppAccess = (appType: string) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ message: '请先登录' })
//     }

//     if (req.user.app !== appType && req.user.role !== 'admin') {
//       return res.status(403).json({ message: '无权访问此应用' })
//     }

//     next()
//   }
// }

// // 权限检查
// export const requirePermission = (permission: string) => {
//   return (req: Request, res: Response, next: NextFunction) => {
//     if (!req.user) {
//       return res.status(401).json({ message: '请先登录' })
//     }

//     if (!req.user.permissions?.includes(permission) && req.user.role !== 'admin') {
//       return res.status(403).json({ message: '权限不足' })
//     }

//     next()
//   }
// }