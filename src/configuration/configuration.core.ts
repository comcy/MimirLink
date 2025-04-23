// Copyright (c) Christian Silfang (comcy). All rights reserved.

import { BehaviorSubject, Observable } from "rxjs";
import { Injectable } from "../base/dependency-injection-container";
import { Config } from "./config";
import { ConfigurationProvider } from "./configuration.provider";
import { DependencyInjectionContainer } from "../base/dependency-injection-container";

/**
 * ConfigurationCore handles the configuration for the application.
 * It loads the configuration from the configuration provider and provides
 * an observable to get the current configuration.
 */
@Injectable()
export class ConfigurationCore {

    // DependencyInjectionContainer.resolve(ConfigurationProvider);
    private configSubject: BehaviorSubject<Config | null> = new BehaviorSubject<Config| null>(null);

    constructor(private provider: ConfigurationProvider) {
        DependencyInjectionContainer.resolve(ConfigurationProvider);
        this.configSubject.next(this.provider.readConfigurationFromFile());
    }

    getConfig$(): Observable<Config | null> {
        console.log("Current config: ", this.configSubject.value);
        return this.configSubject.asObservable();
    }
}