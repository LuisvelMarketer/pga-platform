/**
 * Plugin Manager for PGA
 * Created by Luis Alfredo Velasquez Duran (Germany, 2025)
 *
 * Extensible plugin system for community tools and integrations.
 */

export interface PluginMetadata {
    name: string;
    version: string;
    author?: string;
    description?: string;
    homepage?: string;
    tags?: string[];
    dependencies?: string[];
}

export interface PluginHooks {
    /**
     * Called when plugin is loaded
     */
    onLoad?: () => void | Promise<void>;

    /**
     * Called when plugin is unloaded
     */
    onUnload?: () => void | Promise<void>;

    /**
     * Called before genome creation
     */
    beforeGenomeCreate?: (config: unknown) => unknown | Promise<unknown>;

    /**
     * Called after genome creation
     */
    afterGenomeCreate?: (genome: unknown) => void | Promise<void>;

    /**
     * Called before chat
     */
    beforeChat?: (message: string, context: unknown) => string | Promise<string>;

    /**
     * Called after chat
     */
    afterChat?: (response: unknown) => unknown | Promise<unknown>;

    /**
     * Called before mutation
     */
    beforeMutation?: (proposal: unknown) => unknown | Promise<unknown>;

    /**
     * Called after mutation
     */
    afterMutation?: (result: unknown) => void | Promise<void>;

    /**
     * Called on metrics update
     */
    onMetricsUpdate?: (metrics: unknown) => void | Promise<void>;

    /**
     * Called on alert
     */
    onAlert?: (alert: unknown) => void | Promise<void>;
}

export interface Plugin {
    metadata: PluginMetadata;
    hooks: PluginHooks;
    api?: Record<string, (...args: unknown[]) => unknown>;
}

export interface PluginConfig {
    enabled?: boolean;
    config?: Record<string, unknown>;
}

interface LoadedPlugin {
    plugin: Plugin;
    config: PluginConfig;
    loadedAt: Date;
}

/**
 * Plugin Manager
 *
 * Manages plugins and their lifecycle.
 */
export class PluginManager {
    private plugins: Map<string, LoadedPlugin> = new Map();
    private hookOrder: Map<keyof PluginHooks, string[]> = new Map();

    /**
     * Register a plugin
     */
    async register(plugin: Plugin, config: PluginConfig = {}): Promise<void> {
        const name = plugin.metadata.name;

        // Check dependencies
        if (plugin.metadata.dependencies) {
            for (const dep of plugin.metadata.dependencies) {
                if (!this.plugins.has(dep)) {
                    throw new Error(
                        `Plugin ${name} requires dependency: ${dep}`
                    );
                }
            }
        }

        // Check if already registered
        if (this.plugins.has(name)) {
            throw new Error(`Plugin ${name} is already registered`);
        }

        // Register plugin
        this.plugins.set(name, {
            plugin,
            config: {
                enabled: config.enabled ?? true,
                config: config.config || {},
            },
            loadedAt: new Date(),
        });

        // Call onLoad hook
        if (config.enabled !== false && plugin.hooks.onLoad) {
            await plugin.hooks.onLoad();
        }
    }

    /**
     * Unregister a plugin
     */
    async unregister(name: string): Promise<void> {
        const loaded = this.plugins.get(name);

        if (!loaded) {
            throw new Error(`Plugin ${name} is not registered`);
        }

        // Call onUnload hook
        if (loaded.plugin.hooks.onUnload) {
            await loaded.plugin.hooks.onUnload();
        }

        this.plugins.delete(name);
    }

    /**
     * Enable a plugin
     */
    async enable(name: string): Promise<void> {
        const loaded = this.plugins.get(name);

        if (!loaded) {
            throw new Error(`Plugin ${name} is not registered`);
        }

        if (loaded.config.enabled) {
            return; // Already enabled
        }

        loaded.config.enabled = true;

        // Call onLoad hook
        if (loaded.plugin.hooks.onLoad) {
            await loaded.plugin.hooks.onLoad();
        }
    }

    /**
     * Disable a plugin
     */
    async disable(name: string): Promise<void> {
        const loaded = this.plugins.get(name);

        if (!loaded) {
            throw new Error(`Plugin ${name} is not registered`);
        }

        if (!loaded.config.enabled) {
            return; // Already disabled
        }

        loaded.config.enabled = false;

        // Call onUnload hook
        if (loaded.plugin.hooks.onUnload) {
            await loaded.plugin.hooks.onUnload();
        }
    }

    /**
     * Call a hook
     */
    async callHook<K extends keyof PluginHooks>(
        hookName: K,
        ...args: Parameters<NonNullable<PluginHooks[K]>>
    ): Promise<unknown> {
        let result: unknown = args[0];

        // Get plugin order for this hook
        const order = this.hookOrder.get(hookName) || Array.from(this.plugins.keys());

        for (const name of order) {
            const loaded = this.plugins.get(name);

            if (!loaded || !loaded.config.enabled) {
                continue;
            }

            const hook = loaded.plugin.hooks[hookName];

            if (!hook) {
                continue;
            }

            try {
                // Call hook with current result
                const hookResult = await (hook as (...args: unknown[]) => unknown)(
                    result,
                    ...args.slice(1)
                );

                // Update result if hook returns something
                if (hookResult !== undefined) {
                    result = hookResult;
                }
            } catch (error) {
                console.error(
                    `Error in plugin ${name} hook ${hookName}:`,
                    error
                );
            }
        }

        return result;
    }

    /**
     * Set hook execution order
     */
    setHookOrder(hookName: keyof PluginHooks, order: string[]): void {
        this.hookOrder.set(hookName, order);
    }

    /**
     * Get plugin API
     */
    getPluginAPI(name: string): Record<string, (...args: unknown[]) => unknown> | undefined {
        const loaded = this.plugins.get(name);

        if (!loaded || !loaded.config.enabled) {
            return undefined;
        }

        return loaded.plugin.api;
    }

    /**
     * Call plugin API method
     */
    async callPluginAPI(
        name: string,
        method: string,
        ...args: unknown[]
    ): Promise<unknown> {
        const api = this.getPluginAPI(name);

        if (!api) {
            throw new Error(`Plugin ${name} is not available`);
        }

        const fn = api[method];

        if (!fn) {
            throw new Error(`Plugin ${name} does not have method: ${method}`);
        }

        return await fn(...args);
    }

    /**
     * List all plugins
     */
    list(): Array<{
        name: string;
        version: string;
        author?: string;
        description?: string;
        enabled: boolean;
        loadedAt: Date;
    }> {
        return Array.from(this.plugins.entries()).map(([name, loaded]) => ({
            name,
            version: loaded.plugin.metadata.version,
            author: loaded.plugin.metadata.author,
            description: loaded.plugin.metadata.description,
            enabled: loaded.config.enabled ?? true,
            loadedAt: loaded.loadedAt,
        }));
    }

    /**
     * Search plugins by tag
     */
    search(tag: string): Plugin[] {
        return Array.from(this.plugins.values())
            .filter((loaded) => loaded.plugin.metadata.tags?.includes(tag))
            .map((loaded) => loaded.plugin);
    }

    /**
     * Get plugin metadata
     */
    getMetadata(name: string): PluginMetadata | undefined {
        return this.plugins.get(name)?.plugin.metadata;
    }

    /**
     * Get plugin config
     */
    getConfig(name: string): Record<string, unknown> | undefined {
        return this.plugins.get(name)?.config.config;
    }

    /**
     * Update plugin config
     */
    updateConfig(name: string, config: Record<string, unknown>): void {
        const loaded = this.plugins.get(name);

        if (!loaded) {
            throw new Error(`Plugin ${name} is not registered`);
        }

        loaded.config.config = { ...loaded.config.config, ...config };
    }

    /**
     * Get statistics
     */
    getStats(): {
        totalPlugins: number;
        enabledPlugins: number;
        disabledPlugins: number;
        pluginsByTag: Record<string, number>;
    } {
        const plugins = Array.from(this.plugins.values());
        const enabled = plugins.filter((p) => p.config.enabled).length;

        const pluginsByTag: Record<string, number> = {};

        for (const loaded of plugins) {
            for (const tag of loaded.plugin.metadata.tags || []) {
                pluginsByTag[tag] = (pluginsByTag[tag] || 0) + 1;
            }
        }

        return {
            totalPlugins: plugins.length,
            enabledPlugins: enabled,
            disabledPlugins: plugins.length - enabled,
            pluginsByTag,
        };
    }
}
