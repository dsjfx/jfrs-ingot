import { Request, Response } from 'express';
import SystemService from '../services/SystemService';
import { ConfigGroup } from '../models/System';

class SystemApi {
  async getAll(_req: Request, res: Response): Promise<void> {
    try {
      const configs = await SystemService.getAllConfigs();
      res.json({
        code: 0,
        message: 'success',
        data: configs,
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '获取配置失败',
      });
    }
  }

  async getByKey(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const value = await SystemService.getConfig(key as string);

      if (value === null) {
        res.status(404).json({
          code: -1,
          message: '配置不存在',
        });
      }

      res.json({
        code: 0,
        data: value,
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '获取配置失败',
      });
    }
  }

  async getByGroup(req: Request, res: Response): Promise<void> {
    try {
      const { group } = req.params;

      if (!Object.values(ConfigGroup).includes(group as ConfigGroup)) {
        res.status(400).json({
          code: -1,
          message: '无效的分组',
        });
      }

      const configs = await SystemService.getConfigsByGroup(group as ConfigGroup);
      res.json({
        code: 0,
        data: configs,
      });
    } catch (error) {
      console.error('获取配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '获取配置失败',
      });
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      await SystemService.updateConfigs(req.body);
      res.json({
        code: 0,
        message: '保存成功',
      });
    } catch (error) {
      console.error('更新配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '保存失败',
      });
    }
  }

  async updateSingle(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const { value } = req.body;

      const success = await SystemService.updateConfig(key as string, value);

      if (!success) {
        res.status(404).json({
          code: -1,
          message: '配置不存在',
        });
      }

      res.json({
        code: 0,
        message: '更新成功',
      });
    } catch (error) {
      console.error('更新配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '更新失败',
      });
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { key, value, group, description } = req.body;

      const exists = await SystemService.configExists(key);
      if (exists) {
        res.status(400).json({
          code: -1,
          message: '配置键已存在',
        });
      }

      const config = await SystemService.createConfig(key, value, group, description);

      res.json({
        code: 0,
        message: '创建成功',
        data: config,
      });
    } catch (error) {
      console.error('创建配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '创建失败',
      });
    }
  }

  async upsert(req: Request, res: Response): Promise<void> {
    try {
      const { key, value, group, description } = req.body;

      const config = await SystemService.upsertConfig(key, value, group, description);

      res.json({
        code: 0,
        message: '操作成功',
        data: config,
      });
    } catch (error) {
      console.error('操作失败:', error);
      res.status(500).json({
        code: -1,
        message: '操作失败',
      });
    }
  }

  async deleteConfig(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const success = await SystemService.deleteConfig(key as string);

      if (!success) {
        res.status(404).json({
          code: -1,
          message: '配置不存在',
        });
      }

      res.json({
        code: 0,
        message: '删除成功',
      });
    } catch (error) {
      console.error('删除配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '删除失败',
      });
    }
  }

  async forceDelete(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const success = await SystemService.forceDeleteConfig(key as string);

      if (!success) {
        res.status(404).json({
          code: -1,
          message: '配置不存在',
        });
      }

      res.json({
        code: 0,
        message: '永久删除成功',
      });
    } catch (error) {
      console.error('永久删除失败:', error);
      res.status(500).json({
        code: -1,
        message: '永久删除失败',
      });
    }
  }

  async restore(req: Request, res: Response): Promise<void> {
    try {
      const { key } = req.params;
      const success = await SystemService.restoreConfig(key as string);

      if (!success) {
        res.status(404).json({
          code: -1,
          message: '配置不存在或未被删除',
        });
      }

      res.json({
        code: 0,
        message: '恢复成功',
      });
    } catch (error) {
      console.error('恢复配置失败:', error);
      res.status(500).json({
        code: -1,
        message: '恢复失败',
      });
    }
  }
}

export default SystemApi;
