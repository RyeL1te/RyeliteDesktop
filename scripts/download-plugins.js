#!/usr/bin/env node

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const PLUGIN_HUB_API = 'https://api.github.com/repos/Highl1te/Plugin-Hub/contents/plugins';
const PLUGIN_HUB_RAW = 'https://raw.githubusercontent.com/Highl1te/Plugin-Hub/develop/plugins';
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'renderer', 'client', 'highlite', 'plugins');

async function ensureDirectoryExists(dirPath) {
    try {
        await fsPromises.access(dirPath);
    } catch (error) {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
}

async function fetchJSON(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        throw error;
    }
}

async function fetchText(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.text();
    } catch (error) {
        console.error(`Failed to fetch ${url}:`, error.message);
        throw error;
    }
}

function verifyChecksum(content, expectedSha) {
    const hash = crypto.createHash('sha256');
    hash.update(content);
    const actualSha = 'sha256:' + hash.digest('hex');
    return actualSha === expectedSha;
}

async function downloadPluginAsset(repoOwner, repoName, assetSha) {
    console.log(`Downloading plugin from ${repoOwner}/${repoName}...`);
    
    try {
        // Try different repository owner variations if needed
        const possibleOwners = [repoOwner, 'Highl1te', 'H1ghlite'];
        let releaseData = null;
        let workingOwner = null;
        
        for (const owner of possibleOwners) {
            const releasesUrl = `https://api.github.com/repos/${owner}/${repoName}/releases/latest`;
            console.log(`Trying URL: ${releasesUrl}`);
            
            try {
                releaseData = await fetchJSON(releasesUrl);
                workingOwner = owner;
                console.log(`Found repository under owner: ${owner}`);
                break;
            } catch (error) {
                console.log(`Failed to find repository under owner: ${owner}`);
                continue;
            }
        }
        
        if (!releaseData) {
            throw new Error(`Repository not found under any known owner variations`);
        }
        
        if (!releaseData.assets || releaseData.assets.length === 0) {
            throw new Error(`No assets found in latest release for ${workingOwner}/${repoName}`);
        }
        
        // Find the JavaScript asset (assuming it's a .js file)
        const jsAsset = releaseData.assets.find(asset => asset.name.endsWith('.js'));
        if (!jsAsset) {
            throw new Error(`No JavaScript asset found in latest release for ${workingOwner}/${repoName}`);
        }
        
        console.log(`Downloading asset: ${jsAsset.name}`);
        let assetContent = await fetchText(jsAsset.browser_download_url);
        
        // Verify checksum if provided (check original content)
        const originalContent = await fetchText(jsAsset.browser_download_url);
        if (assetSha && !verifyChecksum(originalContent, assetSha)) {
            console.warn(`Checksum mismatch for ${workingOwner}/${repoName}. Expected: ${assetSha}`);
            // Continue anyway but warn the user
        }
        
        // Create import-safe filename
        let safeName = `${workingOwner}_${repoName}`;
        // Replace hyphens, spaces, and other invalid characters with underscores
        safeName = safeName.replace(/[-\s\.]/g, '_');
        // Ensure it doesn't start with a number
        if (/^\d/.test(safeName)) {
            safeName = '_' + safeName;
        }
        
        return {
            name: `${safeName}.js`,
            content: assetContent
        };
    } catch (error) {
        console.error(`Failed to download plugin from ${repoOwner}/${repoName}:`, error.message);
        throw error;
    }
}

async function fetchPluginConfigurations() {
    try {
        // Get list of JSON files in the plugins directory
        const pluginFiles = await fetchJSON(PLUGIN_HUB_API);
        
        const configs = [];
        for (const file of pluginFiles) {
            if (file.name.endsWith('.json')) {
                const configUrl = `${PLUGIN_HUB_RAW}/${file.name}`;
                const config = await fetchJSON(configUrl);
                config.name = file.name;
                configs.push(config);
            }
        }
        
        return configs;
    } catch (error) {
        console.error('Failed to fetch plugin configurations:', error.message);
        throw error;
    }
}

async function generatePluginRegistry(downloadedPlugins) {
    const registry = downloadedPlugins.map(plugin => {
        // Convert to import-safe name by removing .js extension and replacing invalid characters
        let safeName = plugin.name.replace('.js', '');
        // Replace hyphens, spaces, and other invalid characters with underscores
        safeName = safeName.replace(/[-\s\.]/g, '_');
        // Ensure it doesn't start with a number
        if (/^\d/.test(safeName)) {
            safeName = '_' + safeName;
        }
        return {
            name: safeName
        };
    });
    
    // Generate TypeScript registry file
    const registryContent = `// Auto-generated plugin registry - DO NOT EDIT MANUALLY
// This file is generated by scripts/download-plugins.js

export interface PluginRegistryEntry {
    name: string;
}

export const PLUGIN_REGISTRY: PluginRegistryEntry[] = ${JSON.stringify(registry, null, 2)};

export default PLUGIN_REGISTRY;
`;

    const registryPath = path.join(__dirname, '..', 'src', 'renderer', 'client', 'highlite', 'generated', 'pluginRegistry.ts');
    
    // Ensure the generated directory exists
    const generatedDir = path.dirname(registryPath);
    await ensureDirectoryExists(generatedDir);
    
    await fsPromises.writeFile(registryPath, registryContent, 'utf8');
    console.log(`✓ Generated plugin registry: ${registryPath}`);
}

async function main() {
    console.log('Starting plugin download process...');
    
    try {
        // Create plugins directory if it doesn't exist
        await ensureDirectoryExists(PLUGINS_DIR);
        
        // Fetch plugin configurations from Plugin-Hub
        console.log('Fetching plugin list from Plugin-Hub...');
        const pluginConfigs = await fetchPluginConfigurations();
        
        console.log(`Found ${pluginConfigs.length} plugin configuration(s)`);
        
        const downloadedPlugins = [];
        
        // Download each plugin
        for (const config of pluginConfigs) {
            try {
                console.log(`Processing ${config.name}...`);
                const plugin = await downloadPluginAsset(
                    config.repository_owner,
                    config.repository_name,
                    config.asset_sha
                );
                
                // Save plugin to disk
                const pluginPath = path.join(PLUGINS_DIR, plugin.name);
                await fsPromises.writeFile(pluginPath, plugin.content, 'utf8');
                console.log(`✓ Downloaded plugin: ${plugin.name}`);
                
                downloadedPlugins.push(plugin);
                
            } catch (error) {
                console.error(`Failed to process ${config.name}:`, error.message);
            }
        }
        
        // Generate plugin registry
        if (downloadedPlugins.length > 0) {
            await generatePluginRegistry(downloadedPlugins);
        }
        
        console.log('Plugin download process completed.');
        
    } catch (error) {
        console.error('Plugin download process failed:', error.message);
        process.exit(1);
    }
}

// Run the script
if (require.main === module) {
    main();
}

module.exports = { main };
