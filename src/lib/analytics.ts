/**
 * Neo Bank - Analytics & Metrics
 * 
 * Track agent treasury performance, spending patterns,
 * and yield generation for insights and optimization.
 */

export interface AgentMetrics {
    agentId: string;
    period: "hour" | "day" | "week" | "month";
    startTime: number;
    endTime: number;
    
    // Spending
    totalWithdrawals: number;
    totalWithdrawn: number; // In lamports
    averageWithdrawal: number;
    blockedWithdrawals: number;
    
    // Deposits
    totalDeposits: number;
    totalDeposited: number;
    
    // Yield
    yieldEarned: number;
    yieldHookTriggers: number;
    
    // Security
    securityAlerts: number;
    highRiskBlocks: number;
    
    // Utilization
    limitUtilization: number; // 0-100%
    averageDailySpend: number;
}

export interface TreasuryMetrics {
    totalAgents: number;
    totalValueLocked: number;
    totalFeesCollected: number;
    activeProposals: number;
    executedProposals: number;
}

/**
 * Analytics tracker for agent activity
 */
export class AnalyticsTracker {
    private events: AnalyticsEvent[] = [];
    private readonly maxEvents = 10000;

    /**
     * Track an event
     */
    track(event: AnalyticsEvent): void {
        this.events.push({
            ...event,
            timestamp: event.timestamp || Date.now(),
        });
        
        // Trim old events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
    }

    /**
     * Get metrics for an agent over a period
     */
    getAgentMetrics(
        agentId: string,
        period: "hour" | "day" | "week" | "month"
    ): AgentMetrics {
        const now = Date.now();
        const periodMs = {
            hour: 3600_000,
            day: 86400_000,
            week: 604800_000,
            month: 2592000_000,
        }[period];
        
        const startTime = now - periodMs;
        const relevantEvents = this.events.filter(
            (e) => e.agentId === agentId && e.timestamp >= startTime
        );

        const withdrawals = relevantEvents.filter((e) => e.type === "withdrawal");
        const deposits = relevantEvents.filter((e) => e.type === "deposit");
        const yields = relevantEvents.filter((e) => e.type === "yield");
        const blocks = relevantEvents.filter((e) => e.type === "blocked");
        const alerts = relevantEvents.filter((e) => e.type === "security_alert");

        const totalWithdrawn = withdrawals.reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalDeposited = deposits.reduce((sum, e) => sum + (e.amount || 0), 0);
        const yieldEarned = yields.reduce((sum, e) => sum + (e.amount || 0), 0);

        return {
            agentId,
            period,
            startTime,
            endTime: now,
            totalWithdrawals: withdrawals.length,
            totalWithdrawn,
            averageWithdrawal: withdrawals.length > 0 ? totalWithdrawn / withdrawals.length : 0,
            blockedWithdrawals: blocks.length,
            totalDeposits: deposits.length,
            totalDeposited,
            yieldEarned,
            yieldHookTriggers: yields.length,
            securityAlerts: alerts.length,
            highRiskBlocks: blocks.filter((b) => b.riskScore && b.riskScore > 70).length,
            limitUtilization: 0, // Would need spending limit data
            averageDailySpend: totalWithdrawn / (periodMs / 86400_000),
        };
    }

    /**
     * Get top agents by volume
     */
    getTopAgentsByVolume(limit: number = 10): { agentId: string; volume: number }[] {
        const volumeByAgent = new Map<string, number>();
        
        for (const event of this.events) {
            if (event.type === "withdrawal" && event.amount) {
                const current = volumeByAgent.get(event.agentId) || 0;
                volumeByAgent.set(event.agentId, current + event.amount);
            }
        }

        return Array.from(volumeByAgent.entries())
            .map(([agentId, volume]) => ({ agentId, volume }))
            .sort((a, b) => b.volume - a.volume)
            .slice(0, limit);
    }

    /**
     * Get spending pattern (hourly distribution)
     */
    getSpendingPattern(agentId: string): number[] {
        const hourlySpend = new Array(24).fill(0);
        
        for (const event of this.events) {
            if (event.agentId === agentId && event.type === "withdrawal" && event.amount) {
                const hour = new Date(event.timestamp).getHours();
                hourlySpend[hour] += event.amount;
            }
        }

        return hourlySpend;
    }

    /**
     * Get security score based on history
     */
    getSecurityScore(agentId: string): number {
        const events = this.events.filter((e) => e.agentId === agentId);
        if (events.length === 0) return 100;

        const blocks = events.filter((e) => e.type === "blocked").length;
        const alerts = events.filter((e) => e.type === "security_alert").length;
        const total = events.length;

        // Score decreases with blocks and alerts
        const blockPenalty = (blocks / total) * 30;
        const alertPenalty = (alerts / total) * 20;

        return Math.max(0, Math.min(100, 100 - blockPenalty - alertPenalty));
    }

    /**
     * Export events for external analysis
     */
    exportEvents(agentId?: string): AnalyticsEvent[] {
        if (agentId) {
            return this.events.filter((e) => e.agentId === agentId);
        }
        return [...this.events];
    }

    /**
     * Clear old events
     */
    cleanup(olderThanMs: number = 2592000_000): number {
        const cutoff = Date.now() - olderThanMs;
        const before = this.events.length;
        this.events = this.events.filter((e) => e.timestamp >= cutoff);
        return before - this.events.length;
    }
}

export interface AnalyticsEvent {
    type: "withdrawal" | "deposit" | "yield" | "blocked" | "security_alert" | "governance";
    agentId: string;
    timestamp: number;
    amount?: number;
    destination?: string;
    reason?: string;
    riskScore?: number;
    metadata?: Record<string, any>;
}

// Global analytics instance
export const analytics = new AnalyticsTracker();

// ============ TRACKING HELPERS ============

export function trackWithdrawal(agentId: string, amount: number, destination: string): void {
    analytics.track({
        type: "withdrawal",
        agentId,
        timestamp: Date.now(),
        amount,
        destination,
    });
}

export function trackDeposit(agentId: string, amount: number): void {
    analytics.track({
        type: "deposit",
        agentId,
        timestamp: Date.now(),
        amount,
    });
}

export function trackYield(agentId: string, amount: number, protocol: string): void {
    analytics.track({
        type: "yield",
        agentId,
        timestamp: Date.now(),
        amount,
        metadata: { protocol },
    });
}

export function trackBlocked(agentId: string, amount: number, reason: string, riskScore: number): void {
    analytics.track({
        type: "blocked",
        agentId,
        timestamp: Date.now(),
        amount,
        reason,
        riskScore,
    });
}

export function trackSecurityAlert(agentId: string, alertType: string, riskScore: number): void {
    analytics.track({
        type: "security_alert",
        agentId,
        timestamp: Date.now(),
        riskScore,
        metadata: { alertType },
    });
}

/**
 * Generate a summary report for an agent
 */
export function generateReport(agentId: string): string {
    const daily = analytics.getAgentMetrics(agentId, "day");
    const weekly = analytics.getAgentMetrics(agentId, "week");
    const securityScore = analytics.getSecurityScore(agentId);
    const pattern = analytics.getSpendingPattern(agentId);
    
    const peakHour = pattern.indexOf(Math.max(...pattern));

    return `
📊 Agent Analytics Report: ${agentId}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📅 Last 24 Hours:
   Withdrawals: ${daily.totalWithdrawals} (${(daily.totalWithdrawn / 1e9).toFixed(4)} SOL)
   Deposits: ${daily.totalDeposits} (${(daily.totalDeposited / 1e9).toFixed(4)} SOL)
   Yield Earned: ${(daily.yieldEarned / 1e9).toFixed(6)} SOL
   Blocked: ${daily.blockedWithdrawals}

📆 Last 7 Days:
   Withdrawals: ${weekly.totalWithdrawals} (${(weekly.totalWithdrawn / 1e9).toFixed(4)} SOL)
   Avg Daily Spend: ${(weekly.averageDailySpend / 1e9).toFixed(4)} SOL
   Security Alerts: ${weekly.securityAlerts}

🔐 Security Score: ${securityScore.toFixed(0)}/100

⏰ Peak Activity Hour: ${peakHour}:00

${securityScore < 70 ? "⚠️ Security score below threshold - review recent activity" : "✅ Security posture healthy"}
`.trim();
}
