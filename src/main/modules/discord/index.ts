import DiscordRPC from 'discord-rpc';
import { settingsService } from '../settingsManagement/index';
import log from 'electron-log';
import { ipcMain } from 'electron';

const clientId = process.env.DISCORD_CLIENT_ID || '';
const rpc = new DiscordRPC.Client({ transport: 'ipc' });

class DiscordModule {
    private isConnected: boolean = false;
    private isEnabled: boolean = false;
    private isLoggedIn: boolean = false;
    private activityStartTimestamp: Date = new Date();

    constructor() {
        // Handle when RPC successfully connects
        rpc.on('ready', () => {
            this.isConnected = true;
            log.info('Discord RPC connected successfully.');
            this.setActivity();
        });

        // Listen for setting changes
        settingsService.on('setting-changed', (section, key, value) => {
            if (section === 'Integrations' && key === 'Enable Discord Rich Presence') {
                this.updateEnabledState(value as boolean);
            }
        });

        settingsService.on('settings-applied', () => {
            const enabled = settingsService.getByName('Enable Discord Rich Presence');
            this.updateEnabledState(enabled as boolean);
        });

        // Listen for login state changes from the renderer
        ipcMain.on('discord:update-state', (_event, isLoggedIn: boolean) => {
            if (this.isLoggedIn !== isLoggedIn) {
                this.isLoggedIn = isLoggedIn;
                log.info(`[Discord RPC] State updated. Logged in: ${isLoggedIn}`);
                this.setActivity();
            }
        });
    }

    private updateEnabledState(enabled: boolean) {
        if (this.isEnabled === enabled) return;
        this.isEnabled = enabled;
        if (this.isEnabled) {
            this.start();
        } else {
            this.stop();
        }
    }

    public async initialize() {
        // Wait for settings to load if they haven't already
        await settingsService.load();
        const enabled = settingsService.getByName('Enable Discord Rich Presence');
        this.isEnabled = enabled === true; // Default to false if not set

        if (this.isEnabled) {
            this.start();
        }
    }

    public start() {
        if (!this.isEnabled) return;

        rpc.login({ clientId }).catch((err) => {
            // It's normal for login to fail if Discord isn't running
            log.warn('Discord RPC failed to login (Discord might not be running).', err.message);
        });
    }

    public stop() {
        if (this.isConnected) {
            rpc.clearActivity().catch(console.error);
            rpc.destroy().catch(console.error);
            this.isConnected = false;
        }
        log.info('Discord RPC stopped.');
    }

    public setActivity() {
        if (!this.isConnected || !this.isEnabled) return;

        const detailText = this.isLoggedIn ? 'Exploring the world' : 'XP wasting';
        const stateText = this.isLoggedIn ? 'In Game' : 'At Login Screen';

        rpc.setActivity({
            details: detailText,
            state: stateText,
            startTimestamp: this.activityStartTimestamp,
            largeImageKey: 'logo',
            largeImageText: 'HighSpell',
            instance: false,
        }).catch(err => {
            log.error('Failed to set Discord activity', err);
        });
    }
}

export const discordModule = new DiscordModule();
export default discordModule;
