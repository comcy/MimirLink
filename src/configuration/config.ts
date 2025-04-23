// Copyright (c) Christian Silfang (comcy). All rights reserved.

interface Config {
    workspace: string;
    editor?: ConfigEntry
}


interface ConfigEntry {
    name: string;
    value: string;
}

export { Config, ConfigEntry}