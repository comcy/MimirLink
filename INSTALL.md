# Installation and Setup

This document guides you through setting up and configuring the Mimirlink API and frontend.

## Prerequisites

Before you begin, ensure you have the following installed:

*   **Node.js** (LTS version recommended)
*   **npm** (Node Package Manager, usually comes with Node.js) or **Yarn**

## 1. Project Setup

1.  **Clone the repository** (if you haven't already):
    ```bash
    git clone [your-repository-url]
    cd mimirlink
    ```

2.  **Install dependencies for the root project:**
    ```bash
    npm install
    ```

3.  **Install dependencies for the frontend project:**
    ```bash
    cd src/frontend
    npm install
    cd ../.. # Go back to the root directory
    ```

## 2. Starting the Application

Mimirlink consists of a backend API and a frontend web application. Both need to be running for full functionality.

### 2.1. Start the Backend API

The backend API handles file operations (reading, writing, listing notes) and serves the data to the frontend.

Open a terminal in the project's root directory and run:

```bash
npm run dev:backend
```

You should see output indicating the server is listening, for example:
```
Mimirlink server listening on http://localhost:3001
Resolved workspace: /path/to/your/project
Resolved notesDirectory: /path/to/your/notes
Resolved port: 3001
```

### 2.2. Start the Frontend Application

The frontend application provides the user interface for interacting with your notes.

Open a **separate terminal** and navigate to the frontend directory:

```bash
cd src/frontend
```

Then run:

```bash
npm run dev
```

This will start the frontend development server. It will usually open the application in your default web browser at an address like `http://localhost:5173`.

## 3. Configuration

Mimirlink uses a hierarchical configuration system, allowing you to define settings at different levels. Settings from later levels override earlier ones.

### Configuration Hierarchy:

1.  **Default Values:** Built-in settings.
2.  **User-specific Configuration:** `~/.mimirlink/mimirlink.config.json` (created automatically).
3.  **Project-specific Configuration:** `mimirlink.config.json` in your project's root directory or any parent directory.
4.  **Environment Variables:** Overrides all other settings.

### Setting the Notes Directory (`notesDirectory`)

The `notesDirectory` specifies where your Markdown notes (journals, pages) are stored. By default, it's set to a `notes` subdirectory within your `workspace`.

#### 3.1. User-specific Configuration (Recommended for most users)

This is the most common way to set your notes directory, applying globally for your user account.

1.  **Locate the configuration file:**
    *   **Linux/macOS:** `~/.mimirlink/mimirlink.config.json`
    *   **Windows:** `C:\Users\<YourUsername>\.mimirlink\mimirlink.config.json`

    If this file doesn't exist, it will be created automatically with default values when the backend API starts.

2.  **Edit the file:**
    Open `mimirlink.config.json` with a text editor. It will look similar to this:
    ```json
    {
      "workspace": "/home/cy/mimirlink",
      "notesDirectory": "/home/cy/mimirlink/notes",
      "port": 3001
    }
    ```

3.  **Change the `notesDirectory` value:**
    Update the `"notesDirectory"` entry to your desired path. For example, to store notes in `/home/cy/Documents/MyMimirLinkNotes`:
    ```json
    {
      "workspace": "/home/cy/mimirlink",
      "notesDirectory": "/home/cy/Documents/MyMimirLinkNotes",
      "port": 3001
    }
    ```
    **Important:** Ensure the specified path exists or can be created by the system. The backend will attempt to create it if it doesn't exist.

4.  **Save the changes.**

5.  **Restart the Backend API** for the changes to take effect.

#### 3.2. Project-specific Configuration

If you want a different `notesDirectory` for a particular project, you can place a `mimirlink.config.json` file in that project's root directory. This will override the user-specific setting for that project.

Example `mimirlink.config.json` in your project root:
```json
{
  "notesDirectory": "./project-notes",
  "port": 3002
}
```
(Here, `./project-notes` would be relative to your project's root.)

#### 3.3. Environment Variables

For advanced use cases (e.g., server deployments, CI/CD), you can override any setting using environment variables.

*   `MIMIRLINK_WORKSPACE`
*   `MIMIRLINK_NOTES_DIRECTORY`
*   `MIMIRLINK_PORT`

Example:
```bash
MIMIRLINK_NOTES_DIRECTORY="/var/lib/mimirlink/notes" npm run dev:backend
```

## 4. Verification

After starting both the backend and frontend, try the following:

*   **Create a new note** using the "New Note" button in the frontend.
*   **Check the configured `notesDirectory`** on your file system to ensure the new note file (`.md`) was created there.
*   **Verify the file list** in the frontend updates correctly.

If you encounter any issues, check the console output of both your backend and frontend terminals for error messages.
