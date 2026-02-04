/**
 * Neo Bank SDK Tests
 * 
 * Unit tests for the TypeScript SDK components.
 * Run with: npx jest tests/sdk.test.ts
 */

import { PublicKey } from "@solana/web3.js";
import { RateLimiter, DEFAULT_RATE_LIMIT } from "../src/lib/security-layer";
import { AnalyticsTracker, trackWithdrawal, trackBlocked } from "../src/lib/analytics";
import { WebhookManager } from "../src/lib/webhooks";
import { 
    SYSTEM_PROMPT, 
    INTENT_VALIDATION_PROMPT,
    FUNCTION_SCHEMAS 
} from "../src/lib/agent-prompts";

describe("RateLimiter", () => {
    let limiter: RateLimiter;

    beforeEach(() => {
        limiter = new RateLimiter({
            maxRequestsPerMinute: 3,
            maxAmountPerHour: 10,
            cooldownAfterBlock: 5,
        });
    });

    test("allows requests within limits", () => {
        const result = limiter.check("agent-1", 1);
        expect(result.allowed).toBe(true);
    });

    test("blocks after max requests per minute", () => {
        limiter.record("agent-1", 1);
        limiter.record("agent-1", 1);
        limiter.record("agent-1", 1);
        
        const result = limiter.check("agent-1", 1);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("3 requests/min");
    });

    test("blocks when amount exceeds hourly limit", () => {
        const result = limiter.check("agent-1", 15);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("10 SOL/hour");
    });

    test("applies cooldown after block", () => {
        limiter.applyCooldown("agent-1");
        const result = limiter.check("agent-1", 1);
        expect(result.allowed).toBe(false);
        expect(result.reason).toContain("cooldown");
    });

    test("returns correct status", () => {
        limiter.record("agent-1", 5);
        limiter.record("agent-1", 3);
        
        const status = limiter.getStatus("agent-1");
        expect(status.requestsLastMinute).toBe(2);
        expect(status.amountLastHour).toBe(8);
    });
});

describe("AnalyticsTracker", () => {
    let tracker: AnalyticsTracker;

    beforeEach(() => {
        tracker = new AnalyticsTracker();
    });

    test("tracks events", () => {
        tracker.track({
            type: "withdrawal",
            agentId: "agent-1",
            timestamp: Date.now(),
            amount: 1_000_000_000, // 1 SOL
        });

        const events = tracker.exportEvents("agent-1");
        expect(events.length).toBe(1);
        expect(events[0].type).toBe("withdrawal");
    });

    test("calculates agent metrics", () => {
        tracker.track({
            type: "withdrawal",
            agentId: "agent-1",
            timestamp: Date.now(),
            amount: 1_000_000_000,
        });
        tracker.track({
            type: "withdrawal",
            agentId: "agent-1",
            timestamp: Date.now(),
            amount: 2_000_000_000,
        });

        const metrics = tracker.getAgentMetrics("agent-1", "hour");
        expect(metrics.totalWithdrawals).toBe(2);
        expect(metrics.totalWithdrawn).toBe(3_000_000_000);
    });

    test("calculates security score", () => {
        // Clean agent
        tracker.track({ type: "withdrawal", agentId: "good-agent", timestamp: Date.now() });
        tracker.track({ type: "withdrawal", agentId: "good-agent", timestamp: Date.now() });
        
        const goodScore = tracker.getSecurityScore("good-agent");
        expect(goodScore).toBe(100);

        // Agent with blocks
        tracker.track({ type: "withdrawal", agentId: "risky-agent", timestamp: Date.now() });
        tracker.track({ type: "blocked", agentId: "risky-agent", timestamp: Date.now() });
        
        const riskyScore = tracker.getSecurityScore("risky-agent");
        expect(riskyScore).toBeLessThan(100);
    });

    test("gets spending pattern", () => {
        const now = Date.now();
        tracker.track({
            type: "withdrawal",
            agentId: "agent-1",
            timestamp: now,
            amount: 1_000_000_000,
        });

        const pattern = tracker.getSpendingPattern("agent-1");
        expect(pattern.length).toBe(24);
        expect(pattern.reduce((a, b) => a + b, 0)).toBe(1_000_000_000);
    });
});

describe("WebhookManager", () => {
    let manager: WebhookManager;

    beforeEach(() => {
        manager = new WebhookManager();
    });

    test("creates subscription", () => {
        const sub = manager.subscribe(
            "https://example.com/webhook",
            ["withdrawal.success"],
            "secret123"
        );

        expect(sub.id).toMatch(/^wh_/);
        expect(sub.active).toBe(true);
        expect(sub.events).toContain("withdrawal.success");
    });

    test("unsubscribes", () => {
        const sub = manager.subscribe(
            "https://example.com/webhook",
            ["withdrawal.success"],
            "secret"
        );

        expect(manager.getSubscriptions().length).toBe(1);
        manager.unsubscribe(sub.id);
        expect(manager.getSubscriptions().length).toBe(0);
    });

    test("lists all subscriptions", () => {
        manager.subscribe("https://a.com", ["withdrawal.success"], "s1");
        manager.subscribe("https://b.com", ["security.alert"], "s2");

        const subs = manager.getSubscriptions();
        expect(subs.length).toBe(2);
    });
});

describe("Agent Prompts", () => {
    test("system prompt is defined", () => {
        expect(SYSTEM_PROMPT).toBeDefined();
        expect(SYSTEM_PROMPT).toContain("Neo Bank");
    });

    test("intent validation prompt generates correctly", () => {
        const prompt = INTENT_VALIDATION_PROMPT(5, "abc123", "Pay vendor");
        expect(prompt).toContain("5 SOL");
        expect(prompt).toContain("abc123");
        expect(prompt).toContain("Pay vendor");
    });

    test("function schemas are valid", () => {
        expect(FUNCTION_SCHEMAS.validateIntent.name).toBe("validate_intent");
        expect(FUNCTION_SCHEMAS.withdraw.parameters.required).toContain("amount");
        expect(FUNCTION_SCHEMAS.configureYield.parameters.properties.protocol.enum).toContain("marinade");
    });
});

describe("Integration", () => {
    test("rate limiter + analytics work together", () => {
        const limiter = new RateLimiter({ maxRequestsPerMinute: 2 });
        const tracker = new AnalyticsTracker();
        const agentId = "test-agent";

        // First withdrawal - allowed
        let check = limiter.check(agentId, 1);
        expect(check.allowed).toBe(true);
        limiter.record(agentId, 1);
        tracker.track({ type: "withdrawal", agentId, timestamp: Date.now(), amount: 1e9 });

        // Second withdrawal - allowed
        check = limiter.check(agentId, 1);
        expect(check.allowed).toBe(true);
        limiter.record(agentId, 1);
        tracker.track({ type: "withdrawal", agentId, timestamp: Date.now(), amount: 1e9 });

        // Third withdrawal - blocked
        check = limiter.check(agentId, 1);
        expect(check.allowed).toBe(false);
        tracker.track({ type: "blocked", agentId, timestamp: Date.now(), reason: check.reason });

        // Check metrics
        const metrics = tracker.getAgentMetrics(agentId, "hour");
        expect(metrics.totalWithdrawals).toBe(2);
        expect(metrics.blockedWithdrawals).toBe(1);
    });
});
