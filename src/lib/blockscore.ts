/**
 * BlockScore API Client
 * 
 * Provides wallet reputation scoring for enhanced security.
 * Integrates with the BlockScore API to check wallet addresses
 * before allowing withdrawals.
 */

export interface BlockScoreResponse {
    address: string;
    score: number; // 0-100, higher = better reputation
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    flags: string[];
    last_updated: string;
}

export interface BlockScoreCache {
    [address: string]: {
        response: BlockScoreResponse;
        timestamp: number;
    };
}

export class BlockScoreClient {
    private apiKey: string;
    private baseUrl: string;
    private cache: BlockScoreCache;
    private cacheTTL: number; // milliseconds

    constructor(apiKey?: string, cacheTTL: number = 3600000) { // 1 hour default
        this.apiKey = apiKey || process.env.BLOCKSCORE_API_KEY || '';
        this.baseUrl = 'https://api.blockscore.com/v1'; // Placeholder URL
        this.cache = {};
        this.cacheTTL = cacheTTL;
    }

    /**
     * Check wallet reputation score
     * @param address - Solana wallet address to check
     * @returns BlockScore response with reputation data
     */
    async checkWalletReputation(address: string): Promise<BlockScoreResponse> {
        // Check cache first
        const cached = this.cache[address];
        if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
            console.log(`[BlockScore] Cache hit for ${address}`);
            return cached.response;
        }

        // If no API key, return mock response
        if (!this.apiKey) {
            console.warn('[BlockScore] No API key configured, using mock data');
            return this.getMockResponse(address);
        }

        try {
            const response = await fetch(`${this.baseUrl}/wallet/${address}`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`BlockScore API error: ${response.status} ${response.statusText}`);
            }

            const data: BlockScoreResponse = await response.json();

            // Cache the response
            this.cache[address] = {
                response: data,
                timestamp: Date.now(),
            };

            return data;
        } catch (error) {
            console.error('[BlockScore] API call failed:', error);
            // Fallback to mock on error
            return this.getMockResponse(address);
        }
    }

    /**
     * Check if a wallet meets the minimum reputation threshold
     * @param address - Wallet address to check
     * @param minScore - Minimum acceptable score (default: 50)
     * @returns true if wallet passes, false otherwise
     */
    async isWalletTrusted(address: string, minScore: number = 50): Promise<boolean> {
        const result = await this.checkWalletReputation(address);
        return result.score >= minScore && result.risk_level !== 'critical';
    }

    /**
     * Batch check multiple wallets
     * @param addresses - Array of wallet addresses
     * @returns Map of address to BlockScore response
     */
    async batchCheckWallets(addresses: string[]): Promise<Map<string, BlockScoreResponse>> {
        const results = new Map<string, BlockScoreResponse>();

        // Process in parallel with rate limiting
        const batchSize = 10;
        for (let i = 0; i < addresses.length; i += batchSize) {
            const batch = addresses.slice(i, i + batchSize);
            const promises = batch.map(addr => this.checkWalletReputation(addr));
            const batchResults = await Promise.all(promises);

            batch.forEach((addr, idx) => {
                results.set(addr, batchResults[idx]);
            });

            // Rate limiting: wait 100ms between batches
            if (i + batchSize < addresses.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    /**
     * Clear cache for a specific address or all addresses
     * @param address - Optional address to clear, or clear all if not provided
     */
    clearCache(address?: string): void {
        if (address) {
            delete this.cache[address];
        } else {
            this.cache = {};
        }
    }

    /**
     * Get mock response for testing/fallback
     * @param address - Wallet address
     * @returns Mock BlockScore response
     */
    private getMockResponse(address: string): BlockScoreResponse {
        // Simple heuristic: check if address looks suspicious
        const isSuspicious = address.startsWith('1111') || address.endsWith('0000');

        return {
            address,
            score: isSuspicious ? 25 : 75,
            risk_level: isSuspicious ? 'high' : 'low',
            flags: isSuspicious ? ['suspicious_pattern'] : [],
            last_updated: new Date().toISOString(),
        };
    }
}

// Singleton instance
let blockScoreClient: BlockScoreClient | null = null;

/**
 * Get or create BlockScore client instance
 * @param apiKey - Optional API key (uses env var if not provided)
 * @returns BlockScore client instance
 */
export function getBlockScoreClient(apiKey?: string): BlockScoreClient {
    if (!blockScoreClient) {
        blockScoreClient = new BlockScoreClient(apiKey);
    }
    return blockScoreClient;
}
