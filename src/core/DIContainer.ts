import 'reflect-metadata';

type Constructor<T = any> = new (...args: any[]) => T;

class DIContainer {
  private static instance: DIContainer;

  private services: Map<string, any> = new Map<string, any>();

  private factories: Map<string, () => any> = new Map<string, () => any>();

  static getInstance(): DIContainer {
    if (!DIContainer.instance) {
      DIContainer.instance = new DIContainer();
    }
    return DIContainer.instance;
  }

  // 注册单例服务
  registerSingleton<T>(token: string, implementation: Constructor<T>): void {
    if (!this.services.has(token)) {
      const instance = this.createInstance(implementation);
      this.services.set(token, instance);
    }
  }

  // 注册工厂
  registerFactory<T>(token: string, factory: () => T): void {
    this.factories.set(token, factory);
  }

  // 获取服务实例
  get<T>(token: string): T {
    if (this.services.has(token)) {
      return this.services.get(token);
    }

    if (this.factories.has(token)) {
      const instance = this.factories.get(token)!();
      this.services.set(token, instance); // 缓存为单例
      return instance;
    }

    throw new Error(`Service not found: ${token}`);
  }

  // 创建实例并自动注入依赖
  private createInstance<T>(Implementation: Constructor<T>): T {
    const paramTypes = Reflect.getMetadata('design:paramtypes', Implementation) || [];
    const injections = paramTypes.map((paramType: any) => {
      // 根据参数类型查找对应的服务
      const serviceToken = this.getTokenFromType(paramType);
      return this.get(serviceToken);
    });

    return new Implementation(...injections);
  }

  private getTokenFromType(type: any): string {
    // 这里可以根据类型返回对应的 token
    return type.name;
  }
}

// 导出容器实例
export const container = DIContainer.getInstance();

// 自定义 @Autowired 装饰器
export function Autowired(token?: string) {
  return function (target: any, propertyKey: string) {
    let instance: any;

    const getter = function () {
      if (!instance) {
        const serviceToken = token || Reflect.getMetadata('design:type', target, propertyKey).name;
        instance = container.get(serviceToken);
      }
      return instance;
    };

    Object.defineProperty(target, propertyKey, {
      get: getter,
      enumerable: true,
      configurable: true,
    });
  };
}

// @Service 装饰器
export function Service(token?: string) {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
  return function (constructor: Function) {
    const serviceToken = token || constructor.name;
    container.registerSingleton(serviceToken, constructor as any);
  };
}
