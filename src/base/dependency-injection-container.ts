// dependency-injection-container.ts
import 'reflect-metadata';

const instanceMap = new Map<any, any>();

export function Injectable() {
    return function <T extends { new (...args: any[]): any }>(target: T) {
        // Optional: Marker
    };
}

export class DependencyInjectionContainer {
    static resolve<T>(target: new (...args: any[]) => T): T {
        if (instanceMap.has(target)) {
            return instanceMap.get(target);
        }

        const paramTypes: any[] = Reflect.getMetadata("design:paramtypes", target) || [];

        const dependencies = paramTypes.map((paramType) => {
            return DependencyInjectionContainer.resolve(paramType);
        });

        const instance = new target(...dependencies);
        instanceMap.set(target, instance);
        return instance;
    }
}
