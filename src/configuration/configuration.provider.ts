// Copyright (c) Christian Silfang (comcy). All rights reserved.


import fs from "fs";
import os from "os";
import path from "path";
import { Injectable } from "../base/dependency-injection-container";
import { Config } from "./config";


const CONFIG_PATH = path.join(os.homedir(), ".mimirlink", "mimirlink.config.json");
const DEFAULT_CONFIG: Config = { workspace: path.join(os.homedir(), "mimirlink") };

/**
 * ConfigurationProvider handles the configuration for the application.
 * It loads the configuration from the config file and provides methods to
 * read and write the configuration.
 */
@Injectable()
export class ConfigurationProvider {
    public readConfigurationFromFile(): Config {
        if (fs.existsSync(CONFIG_PATH)) {
            return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
        } else {
            fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
            fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 4), "utf8");
            return DEFAULT_CONFIG;
        }
    }
}