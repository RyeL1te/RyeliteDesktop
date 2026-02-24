// This file provides type definitions for Vite environment variables 
// specifically for the Electron main process, which is compiled 
// separately from the renderer process via tsconfig.node.json.

interface ImportMetaEnv {
    readonly VITE_DISCORD_CLIENT_ID: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
