/**
 * Neo Bank - Webhook System
 * 
 * Real-time event notifications for agent treasury events.
 * Agents can subscribe to receive alerts for:
 * - Withdrawals (successful and blocked)
 * - Spending limit warnings
 * - Yield hook triggers
 * - Governance proposals
 * - Security alerts
 */

export interface WebhookEvent {
    type: WebhookEventType;
    timestamp: number;
    agentId: string;
    data: Record<string, any>;
}

export type WebhookEventType =
    | "withdrawal.success"
    | "withdrawal.blocked"
    | "spending.warning"
    | "spending.limit_reached"
    | "yield.triggered"
    | "yield.completed"
    | "governance.proposal_created"
    | "governance.vote_cast"
    | "governance.proposal_executed"
    | "security.alert"
    | "security.blocked"
    | "pause.activated"
    | "pause.deactivated";

export interface WebhookSubscription {
    id: string;
    url: string;
    events: WebhookEventType[];
    secret: string;
    active: boolean;
    createdAt: number;
    lastDelivery?: number;
    failureCount: number;
}

/**
 * Webhook Manager - handles subscriptions and delivery
 */
export class WebhookManager {
    private subscriptions: Map<string, WebhookSubscription> = new Map();
    private eventQueue: WebhookEvent[] = [];
    private processing: boolean = false;

    /**
     * Subscribe to webhook events
     */
    subscribe(
        url: string,
        events: WebhookEventType[],
        secret: string
    ): WebhookSubscription {
        const id = `wh_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const subscription: WebhookSubscription = {
            id,
            url,
            events,
            secret,
            active: true,
            createdAt: Date.now(),
            failureCount: 0,
        };
        this.subscriptions.set(id, subscription);
        return subscription;
    }

    /**
     * Unsubscribe from webhooks
     */
    unsubscribe(id: string): boolean {
        return this.subscriptions.delete(id);
    }

    /**
     * Emit an event to all subscribers
     */
    async emit(event: WebhookEvent): Promise<void> {
        this.eventQueue.push(event);
        if (!this.processing) {
            this.processQueue();
        }
    }

    /**
     * Process queued events
     */
    private async processQueue(): Promise<void> {
        this.processing = true;

        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift()!;
            await this.deliverEvent(event);
        }

        this.processing = false;
    }

    /**
     * Deliver event to matching subscribers
     */
    private async deliverEvent(event: WebhookEvent): Promise<void> {
        const matchingSubs = Array.from(this.subscriptions.values()).filter(
            (sub) => sub.active && sub.events.includes(event.type)
        );

        await Promise.all(
            matchingSubs.map((sub) => this.sendWebhook(sub, event))
        );
    }

    /**
     * Send webhook to subscriber
     */
    private async sendWebhook(
        subscription: WebhookSubscription,
        event: WebhookEvent
    ): Promise<void> {
        const payload = JSON.stringify(event);
        const signature = await this.sign(payload, subscription.secret);

        try {
            const response = await fetch(subscription.url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-NeoBank-Signature": signature,
                    "X-NeoBank-Event": event.type,
                    "X-NeoBank-Timestamp": event.timestamp.toString(),
                },
                body: payload,
            });

            if (response.ok) {
                subscription.lastDelivery = Date.now();
                subscription.failureCount = 0;
            } else {
                subscription.failureCount++;
                if (subscription.failureCount >= 5) {
                    subscription.active = false;
                }
            }
        } catch (error) {
            subscription.failureCount++;
            if (subscription.failureCount >= 5) {
                subscription.active = false;
            }
        }
    }

    /**
     * Sign payload with HMAC
     */
    private async sign(payload: string, secret: string): Promise<string> {
        // Simple hash for demo - use proper HMAC in production
        const encoder = new TextEncoder();
        const data = encoder.encode(payload + secret);
        const hashBuffer = await crypto.subtle.digest("SHA-256", data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    }

    /**
     * Get all subscriptions
     */
    getSubscriptions(): WebhookSubscription[] {
        return Array.from(this.subscriptions.values());
    }

    /**
     * Get subscription by ID
     */
    getSubscription(id: string): WebhookSubscription | undefined {
        return this.subscriptions.get(id);
    }
}

// Global webhook manager instance
export const webhooks = new WebhookManager();

// ============ EVENT EMITTERS ============

/**
 * Emit withdrawal success event
 */
export function emitWithdrawalSuccess(
    agentId: string,
    amount: number,
    destination: string,
    signature: string
): void {
    webhooks.emit({
        type: "withdrawal.success",
        timestamp: Date.now(),
        agentId,
        data: { amount, destination, signature },
    });
}

/**
 * Emit withdrawal blocked event
 */
export function emitWithdrawalBlocked(
    agentId: string,
    amount: number,
    destination: string,
    reason: string
): void {
    webhooks.emit({
        type: "withdrawal.blocked",
        timestamp: Date.now(),
        agentId,
        data: { amount, destination, reason },
    });
}

/**
 * Emit spending warning (80% of limit)
 */
export function emitSpendingWarning(
    agentId: string,
    spent: number,
    limit: number
): void {
    webhooks.emit({
        type: "spending.warning",
        timestamp: Date.now(),
        agentId,
        data: { spent, limit, percentage: (spent / limit) * 100 },
    });
}

/**
 * Emit spending limit reached
 */
export function emitSpendingLimitReached(agentId: string, limit: number): void {
    webhooks.emit({
        type: "spending.limit_reached",
        timestamp: Date.now(),
        agentId,
        data: { limit },
    });
}

/**
 * Emit yield hook triggered
 */
export function emitYieldTriggered(
    agentId: string,
    protocol: string,
    amount: number
): void {
    webhooks.emit({
        type: "yield.triggered",
        timestamp: Date.now(),
        agentId,
        data: { protocol, amount },
    });
}

/**
 * Emit security alert
 */
export function emitSecurityAlert(
    agentId: string,
    alertType: string,
    riskScore: number,
    details: string
): void {
    webhooks.emit({
        type: "security.alert",
        timestamp: Date.now(),
        agentId,
        data: { alertType, riskScore, details },
    });
}

/**
 * Emit governance proposal created
 */
export function emitProposalCreated(
    agentId: string,
    proposalId: number,
    amount: number,
    memo: string
): void {
    webhooks.emit({
        type: "governance.proposal_created",
        timestamp: Date.now(),
        agentId,
        data: { proposalId, amount, memo },
    });
}

/**
 * Emit pause state change
 */
export function emitPauseChange(paused: boolean, reason: string): void {
    webhooks.emit({
        type: paused ? "pause.activated" : "pause.deactivated",
        timestamp: Date.now(),
        agentId: "system",
        data: { paused, reason },
    });
}
