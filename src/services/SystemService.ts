import { Op } from 'sequelize';
import { SystemConfig, ConfigGroup, ConfigType } from '../models/System';
import { ConfigGroupData } from '../types/config';

class SystemService {
  /**
   * 解析配置值（根据类型转换）
   */
  private parseConfigValue(config: SystemConfig): any {
    const value = config.config_value;

    if (value === null) return null;

    switch (config.config_type) {
      case ConfigType.NUMBER:
        return Number(value);
      case ConfigType.BOOLEAN:
        return value === 'true' || value === '1';
      case ConfigType.JSON:
        try {
          return JSON.parse(value);
        } catch {
          return value;
        }
      default:
        return value;
    }
  }

  /**
   * 格式化配置值（用于存储）
   */
  private formatConfigValue(value: any): { strValue: string; type: ConfigType } {
    if (typeof value === 'number') {
      return { strValue: String(value), type: ConfigType.NUMBER };
    } else if (typeof value === 'boolean') {
      return { strValue: value ? 'true' : 'false', type: ConfigType.BOOLEAN };
    } else if (typeof value === 'object' && value !== null) {
      return { strValue: JSON.stringify(value), type: ConfigType.JSON };
    } else {
      return { strValue: String(value), type: ConfigType.STRING };
    }
  }

  /**
   * 获取所有配置（按分组返回）
   */
  async getAllConfigs(): Promise<ConfigGroupData> {
    const configs = await SystemConfig.findAll({
      where: {
        deleted_at: null,
      },
      order: [
        ['config_group', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    const result: ConfigGroupData = {
      basic: {},
      security: {},
      notification: {},
      theme: {},
      backup: {},
    };

    for (const config of configs) {
      const value = this.parseConfigValue(config);
      result[config.config_group][config.config_key] = value;
    }

    return result;
  }

  /**
   * 获取单个配置值
   */
  async getConfig(key: string): Promise<any> {
    const config = await SystemConfig.findOne({
      where: {
        config_key: key,
        deleted_at: null,
      },
    });

    if (!config) return null;
    return this.parseConfigValue(config);
  }

  /**
   * 获取多个配置值
   */
  async getConfigs(keys: string[]): Promise<Record<string, any>> {
    const configs = await SystemConfig.findAll({
      where: {
        config_key: { [Op.in]: keys },
        deleted_at: null,
      },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.config_key] = this.parseConfigValue(config);
    }
    return result;
  }

  /**
   * 按分组获取配置
   */
  async getConfigsByGroup(group: ConfigGroup): Promise<Record<string, any>> {
    const configs = await SystemConfig.findAll({
      where: {
        config_group: group,
        deleted_at: null,
      },
    });

    const result: Record<string, any> = {};
    for (const config of configs) {
      result[config.config_key] = this.parseConfigValue(config);
    }
    return result;
  }

  /**
   * 更新单个配置
   */
  async updateConfig(key: string, value: any): Promise<boolean> {
    const { strValue, type } = this.formatConfigValue(value);

    const [affectedCount] = await SystemConfig.update(
      {
        config_value: strValue,
        config_type: type,
      },
      {
        where: {
          config_key: key,
          deleted_at: null,
        },
      }
    );

    return affectedCount > 0;
  }

  /**
   * 批量更新配置
   */
  async updateConfigs(updates: Record<string, any>): Promise<void> {
    const transaction = await SystemConfig.sequelize!.transaction();

    try {
      for (const [key, value] of Object.entries(updates)) {
        const { strValue, type } = this.formatConfigValue(value);

        await SystemConfig.update(
          {
            config_value: strValue,
            config_type: type,
          },
          {
            where: {
              config_key: key,
              deleted_at: null,
            },
            transaction,
          }
        );
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  /**
   * 创建新配置
   */
  async createConfig(
    key: string,
    value: any,
    group: ConfigGroup,
    description?: string
  ): Promise<SystemConfig> {
    // 检查是否已存在
    const existing = await SystemConfig.findOne({
      where: {
        config_key: key,
      },
    });

    if (existing) {
      throw new Error(`配置键 ${key} 已存在`);
    }

    const { strValue, type } = this.formatConfigValue(value);

    return await SystemConfig.create({
      config_key: key,
      config_value: strValue,
      config_group: group,
      config_type: type,
      description: description || null,
    });
  }

  /**
   * 创建或更新配置（如果存在则更新）
   */
  async upsertConfig(
    key: string,
    value: any,
    group: ConfigGroup,
    description?: string
  ): Promise<SystemConfig> {
    const { strValue, type } = this.formatConfigValue(value);

    const [config] = await SystemConfig.upsert({
      config_key: key,
      config_value: strValue,
      config_group: group,
      config_type: type,
      description: description || null,
    });

    return config;
  }

  /**
   * 删除配置（软删除）
   */
  async deleteConfig(key: string): Promise<boolean> {
    const affectedCount = await SystemConfig.destroy({
      where: {
        config_key: key,
      },
    });
    return affectedCount > 0;
  }

  /**
   * 永久删除配置（硬删除）
   */
  async forceDeleteConfig(key: string): Promise<boolean> {
    const affectedCount = await SystemConfig.destroy({
      where: {
        config_key: key,
      },
      force: true,
    });
    return affectedCount > 0;
  }

  /**
   * 检查配置是否存在
   */
  async configExists(key: string): Promise<boolean> {
    const count = await SystemConfig.count({
      where: {
        config_key: key,
      },
    });
    return count > 0;
  }

  /**
   * 恢复软删除的配置
   */
  async restoreConfig(key: string): Promise<boolean> {
    try {
      await SystemConfig.restore({
        where: {
          config_key: key,
        },
      });
    } catch (error) {
      console.log(error);
      return false;
    }
    return true;
  }

  /**
   * 获取所有配置键列表
   */
  async getAllConfigKeys(): Promise<string[]> {
    const configs = await SystemConfig.findAll({
      where: {
        deleted_at: null,
      },
      attributes: ['config_key'],
      order: [['config_group', 'ASC']],
    });

    return configs.map(config => config.config_key);
  }
}

export default new SystemService();
