/**
 * Neo Bank - Configuration Management
 * 
 * Centralized configuration for the SDK.
 * Supports environment variables and programmatic config.
 */

export interface NeoBankConfig {
    // Network
    rpcUrl: string;
    wsUrl?: string;
    commitment: "processed" | "confirmed" | "finalized";
    
    // Program
    programId: string;
    
    // Security
    security: {
        agentShieldEnabled: boolean;
        agentShieldUrl: string;
        blockScoreEnabled: boolean;
        blockScoreUrl: string;
        blockScoreMinScore: number;
        rateLimitRequestsPerMinute: number;
        rateLimitAmountPerHour: number;
    };
    
    // Webhooks
    webhooks: {
        enabled: boolean;
        retryAttempts: number;
        retryDelayMs: number;
    };
    
    // Analytics
    analytics: {
        enabled: boolean;
        maxEvents: number;
        retentionDays: number;
    };
    
    // Logging
    logging: {
        level: "debug" | "info" | "warn" | "error";
        includeTimestamp: boolean;
    };
}

/**
 * Default configuration
 */
export const DEFAULT_CONFIG: NeoBankConfig = {
    rpcUrl: "https://api.devnet.solana.com",
    commitment: "confirmed",
    programId: "BGTbi1d1n6BzZdyCvr4gEAY3DbC5sDGA4N5EnTRwcrh",
    
    security: {
        agentShieldEnabled: true,
        agentShieldUrl: "https://agentshield.lobsec.org/api",
        blockScoreEnabled: true,
        blockScoreUrl: "https://blockscore.vercel.app/api",
        blockScoreMinScore: 40,
        rateLimitRequestsPerMinute: 10,
        rateLimitAmountPerHour: 100,
    },
    
    webhooks: {
        enabled: false,
        retryAttempts: 3,
        retryDelayMs: 1000,
    },
    
    analytics: {
        enabled: true,
        maxEvents: 10000,
        retentionDays: 30,
    },
    
    logging: {
        level: "info",
        includeTimestamp: true,
    },
};

/**
 * Environment-based configuration
 */
export function loadConfigFromEnv(): Partial<NeoBankConfig> {
    return {
        rpcUrl: process.env.RPC_URL || process.env.SOLANA_RPC_URL,
        wsUrl: process.env.WS_URL || process.env.SOLANA_WS_URL,
        programId: process.env.PROGRAM_ID || process.env.NEO_BANK_PROGRAM_ID,
        
        security: {
            agentShieldEnabled: process.env.AGENTSHIELD_ENABLED !== "false",
            agentShieldUrl: process.env.AGENTSHIELD_URL || DEFAULT_CONFIG.security.agentShieldUrl,
            blockScoreEnabled: process.env.BLOCKSCORE_ENABLED !== "false",
            blockScoreUrl: process.env.BLOCKSCORE_URL || DEFAULT_CONFIG.security.blockScoreUrl,
            blockScoreMinScore: parseInt(process.env.BLOCKSCORE_MIN_SCORE || "40"),
            rateLimitRequestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM || "10"),
            rateLimitAmountPerHour: parseInt(process.env.RATE_LIMIT_SOL_HOUR || "100"),
        },
        
        logging: {
            level: (process.env.LOG_LEVEL as any) || "info",
            includeTimestamp: process.env.LOG_TIMESTAMP !== "false",
        },
    };
}

/**
 * Merge configs with defaults
 */
export function mergeConfig(partial: Partial<NeoBankConfig>): NeoBankConfig {
    return {
        ...DEFAULT_CONFIG,
        ...partial,
        security: {
            ...DEFAULT_CONFIG.security,
            ...partial.security,
        },
        webhooks: {
            ...DEFAULT_CONFIG.webhooks,
            ...partial.webhooks,
        },
        analytics: {
            ...DEFAULT_CONFIG.analytics,
            ...partial.analytics,
        },
        logging: {
            ...DEFAULT_CONFIG.logging,
            ...partial.logging,
        },
    };
}

/**
 * Network presets
 */
export const NETWORK_PRESETS = {
    devnet: {
        rpcUrl: "https://api.devnet.solana.com",
        wsUrl: "wss://api.devnet.solana.com",
    },
    mainnet: {
        rpcUrl: "https://api.mainnet-beta.solana.com",
        wsUrl: "wss://api.mainnet-beta.solana.com",
    },
    localnet: {
        rpcUrl: "http://localhost:8899",
        wsUrl: "ws://localhost:8900",
    },
    helius: (apiKey: string) => ({
        rpcUrl: `https://mainnet.helius-rpc.com/?api-key=${apiKey}`,
        wsUrl: `wss://mainnet.helius-rpc.com/?api-key=${apiKey}`,
    }),
    quicknode: (endpoint: string) => ({
        rpcUrl: endpoint,
        wsUrl: endpoint.replace("https://", "wss://"),
    }),
};

/**
 * Validate configuration
 */
export function validateConfig(config: NeoBankConfig): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.rpcUrl) {
        errors.push("rpcUrl is required");
    }

    if (!config.programId) {
        errors.push("programId is required");
    }

    try {
        new URL(config.rpcUrl);
    } catch {
        errors.push("rpcUrl must be a valid URL");
    }

    if (config.security.blockScoreMinScore < 0 || config.security.blockScoreMinScore > 100) {
        errors.push("blockScoreMinScore must be between 0 and 100");
    }

    if (config.security.rateLimitRequestsPerMinute < 1) {
        errors.push("rateLimitRequestsPerMinute must be at least 1");
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

/**
 * Configuration manager singleton
 */
class ConfigManager {
    private config: NeoBankConfig;

    constructor() {
        const envConfig = loadConfigFromEnv();
        this.config = mergeConfig(envConfig);
    }

    get(): NeoBankConfig {
        return this.config;
    }

    set(partial: Partial<NeoBankConfig>): void {
        this.config = mergeConfig({ ...this.config, ...partial });
    }

    reset(): void {
        this.config = { ...DEFAULT_CONFIG };
    }

    useNetwork(network: "devnet" | "mainnet" | "localnet"): void {
        const preset = NETWORK_PRESETS[network];
        this.set(preset);
    }
}

export const config = new ConfigManager();
