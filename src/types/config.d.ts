export interface SystemConfig {
  id: number;
  config_key: string;
  config_value: string;
  config_group: ConfigGroup;
  config_type: ConfigType;
  description: string | null;
}

export type ConfigGroup = 'basic' | 'security' | 'notification' | 'theme' | 'backup';
export type ConfigType = 'string' | 'number' | 'boolean' | 'json';

export interface ConfigGroupData {
  basic: Record<string, any>;
  security: Record<string, any>;
  notification: Record<string, any>;
  theme: Record<string, any>;
  backup: Record<string, any>;
}
