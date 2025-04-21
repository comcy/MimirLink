![alt text](assets/img/logo-name.png)

# User Manual // Instructions

## Configuration

_MIMIRLINK_ uses a configuration folder `.mimirlink` stored under a separated  the users "Home"-Directory.
- Windows: `C:\Users\[username]\.mimirlink`
- UNIX: `/home/[username]/.mimirlink`

Within in the folder serveral configurations and customizations can be stored.

Folder structure:
```
.mimirlink/
├── INSTRUCTIONS.md
└── mimirlink.config.json
```

The next sections explain purpose and customization options.

**`mimirlink.config.json`**

```
{
    "workspace": "/home/cy/mimirlink",
    "editor": {
        "name": "Visual Studio Code",
        "value": "code"
    }
}

```





