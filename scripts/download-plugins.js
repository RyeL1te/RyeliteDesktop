#!/usr/bin/env node

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Configuration constants
const PLUGIN_HUB_API = 'https://api.github.com/repos/Highl1te/Plugin-Hub/contents/plugins';
const PLUGINS_DIR = path.join(__dirname, '..', 'src', 'renderer', 'client', 'plugins');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || null;

// Utility functions
async function ensureDirectoryExists(dirPath) {
    try {
        await fsPromises.access(dirPath);
    } catch (error) {
        await fsPromises.mkdir(dirPath, { recursive: true });
    }
}

// Wrapper fetch to add GitHub token header if available
async function githubFetch(url, options = {}) {
    const headers = options.headers || {};
    if (GITHUB_TOKEN) {
        headers['Authorization'] = `token ${GITHUB_TOKEN}`;
    }
    options.headers = headers;
    const response = await fetch(url, options);
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for URL: ${url}`);
    }
    return response;
}

async function fetchJSON(url) {
    const response = await githubFetch(url);
    return await response.json();
}

async function fetchText(url, options = {}) {
    const response = await githubFetch(url, options);
    return await response.text();
}

function verifyChecksum(content, expectedSha) {
    if (!expectedSha) return true;

    const hash = crypto.createHash('sha256');
    hash.update(content);
    const actualSha = 'sha256:' + hash.digest('hex');
    return actualSha === expectedSha;
}

function createSafeName(owner, repoName) {
    let safeName = `${owner}_${repoName}`;
    safeName = safeName.replace(/[-\s\.]/g, '_');
    if (/^\d/.test(safeName)) {
        safeName = '_' + safeName;
    }
    return safeName;
}

// Plugin download functions
async function downloadPluginAsset(repoOwner, repoName, assetSha) {
    console.log(`Downloading plugin from ${repoOwner}/${repoName}...`);
    console.log(`Expected asset SHA: ${assetSha}`);

    const releasesUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases`;
    console.log(`Fetching releases data from: ${releasesUrl}`);

    const releases = await fetchJSON(releasesUrl);

    if (!releases || releases.length === 0) {
        throw new Error(`No releases found for ${repoOwner}/${repoName}`);
    }

    let jsAsset = null;
    let releaseWithAsset = null;

    for (const release of releases) {
        if (release.assets && release.assets.length > 0) {
            if (release.assets.some(asset => asset.digest === assetSha)) {
                jsAsset = release.assets.find(asset => asset.digest === assetSha && asset.name.endsWith('.js'));
                if (jsAsset) {
                    releaseWithAsset = release;
                    console.log(`Found matching asset in release: ${release.tag_name}`);
                    break;
                } else {
                    console.warn(`No JavaScript asset found with SHA ${assetSha} in release: ${release.tag_name}`);
                }
            }
        }
    }

    if (!jsAsset) {
        throw new Error(`No JavaScript asset found in any release for ${repoOwner}/${repoName}`);
    }

    console.log(`Downloading asset: ${jsAsset.name}`);

    const assetApiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/releases/assets/${jsAsset.id}`;

    // Use githubFetch with Accept header for raw content
    const response = await githubFetch(assetApiUrl, {
        headers: {
            'Accept': 'application/octet-stream',
        }
    });

    const assetContent = await response.text();

    if (!verifyChecksum(assetContent, assetSha)) {
        console.warn(`Checksum mismatch for ${repoOwner}/${repoName}. Expected: ${assetSha}`);
    }

    const assetShaShort = assetSha.split(':')[1].slice(0, 4);

    return {
        name: `${createSafeName(repoOwner, repoName)}_${assetShaShort}.js`,
        content: assetContent
    };
}

async function fetchPluginConfigurations() {
    console.log('Fetching plugin configurations from Plugin-Hub...');

    const pluginFiles = await fetchJSON(PLUGIN_HUB_API);
    const jsonFiles = pluginFiles.filter(file => file.name.endsWith('.json'));

    const configs = await Promise.all(
        jsonFiles.map(async (file) => {
            const configApiUrl = `https://api.github.com/repos/Highl1te/Plugin-Hub/contents/plugins/${file.name}`;
            console.log(`Fetching configuration for ${file.name} from API`);

            const response = await githubFetch(configApiUrl);
            const fileData = await response.json();

            const configContent = Buffer.from(fileData.content, 'base64').toString('utf8');
            const config = JSON.parse(configContent);
            config.name = file.name;
            return config;
        })
    );

    return configs;
}

async function processPlugin(config) {
    console.log(`Processing ${config.name}...`);
    console.log(config);
    try {
        const plugin = await downloadPluginAsset(
            config.repository_owner,
            config.repository_name,
            config.asset_sha
        );

        const pluginPath = path.join(PLUGINS_DIR, plugin.name);
        await fsPromises.writeFile(pluginPath, plugin.content, 'utf8');
        console.log(`✓ Downloaded plugin: ${plugin.name}`);

        return plugin;
    } catch (error) {
        console.error(`Failed to process ${config.name}:`, error.message);
        return null;
    }
}

async function main() {
    console.log('Starting plugin download process...');

    try {
        await ensureDirectoryExists(PLUGINS_DIR);

        const pluginConfigs = await fetchPluginConfigurations();
        console.log(`Found ${pluginConfigs.length} plugin configuration(s)`);

        const downloadResults = await Promise.allSettled(
            pluginConfigs.map(config => processPlugin(config))
        );

        const downloadedPlugins = downloadResults
            .filter(result => result.status === 'fulfilled' && result.value !== null)
            .map(result => result.value);

        console.log(`Successfully downloaded ${downloadedPlugins.length} out of ${pluginConfigs.length} plugins`);

        console.log('Plugin download process completed.');

    } catch (error) {
        console.error('Plugin download process failed:', error.message);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = { main };
