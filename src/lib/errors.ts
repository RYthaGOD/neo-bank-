/**
 * Neo Bank - Error Handling
 * 
 * Custom error classes and error parsing utilities.
 */

import { ERROR_CODES } from './constants';

/**
 * Base error class for Neo Bank errors
 */
export class NeoBankError extends Error {
    public readonly code: number;
    public readonly name: string = 'NeoBankError';

    constructor(message: string, code: number) {
        super(message);
        this.code = code;
        Object.setPrototypeOf(this, NeoBankError.prototype);
    }

    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
        };
    }
}

/**
 * Spending limit exceeded
 */
export class SpendingLimitError extends NeoBankError {
    public readonly name = 'SpendingLimitError';
    public readonly limit: number;
    public readonly attempted: number;
    public readonly remaining: number;

    constructor(limit: number, attempted: number, remaining: number) {
        super(
            `Spending limit exceeded: attempted ${attempted} but only ${remaining} remaining of ${limit} limit`,
            ERROR_CODES.SPENDING_LIMIT_EXCEEDED
        );
        this.limit = limit;
        this.attempted = attempted;
        this.remaining = remaining;
    }
}

/**
 * Insufficient funds in vault
 */
export class InsufficientFundsError extends NeoBankError {
    public readonly name = 'InsufficientFundsError';
    public readonly balance: number;
    public readonly requested: number;

    constructor(balance: number, requested: number) {
        super(
            `Insufficient funds: balance is ${balance}, requested ${requested}`,
            ERROR_CODES.INSUFFICIENT_FUNDS
        );
        this.balance = balance;
        this.requested = requested;
    }
}

/**
 * Bank is paused
 */
export class BankPausedError extends NeoBankError {
    public readonly name = 'BankPausedError';
    public readonly reason: string;

    constructor(reason: string) {
        super(`Bank is paused: ${reason}`, ERROR_CODES.BANK_PAUSED);
        this.reason = reason;
    }
}

/**
 * Security check failed
 */
export class SecurityError extends NeoBankError {
    public readonly name = 'SecurityError';
    public readonly checkName: string;
    public readonly riskScore: number;

    constructor(checkName: string, message: string, riskScore: number) {
        super(`Security check failed (${checkName}): ${message}`, 7000);
        this.checkName = checkName;
        this.riskScore = riskScore;
    }
}

/**
 * Rate limit exceeded
 */
export class RateLimitError extends NeoBankError {
    public readonly name = 'RateLimitError';
    public readonly retryAfterMs: number;

    constructor(message: string, retryAfterMs: number) {
        super(message, 7001);
        this.retryAfterMs = retryAfterMs;
    }
}

/**
 * Governance error
 */
export class GovernanceError extends NeoBankError {
    public readonly name = 'GovernanceError';
    public readonly proposalId?: number;

    constructor(message: string, code: number, proposalId?: number) {
        super(message, code);
        this.proposalId = proposalId;
    }
}

/**
 * Intent validation failed
 */
export class IntentValidationError extends NeoBankError {
    public readonly name = 'IntentValidationError';
    public readonly reason: string;

    constructor(reason: string) {
        super(`Intent validation failed: ${reason}`, ERROR_CODES.INTENT_WOULD_EXCEED_LIMIT);
        this.reason = reason;
    }
}

// ============ ERROR PARSING ============

/**
 * Parse Anchor/Solana error into NeoBankError
 */
export function parseError(error: any): NeoBankError {
    const message = error?.message || error?.toString() || 'Unknown error';
    
    // Check for Anchor error codes
    const codeMatch = message.match(/Error Code: (\w+)/);
    const numMatch = message.match(/Error Number: (\d+)/);
    
    if (codeMatch || numMatch) {
        const errorName = codeMatch?.[1];
        const errorNum = numMatch ? parseInt(numMatch[1]) : 0;

        switch (errorName || errorNum) {
            case 'SpendingLimitExceeded':
            case ERROR_CODES.SPENDING_LIMIT_EXCEEDED:
                return new SpendingLimitError(0, 0, 0);
            
            case 'InsufficientFunds':
            case ERROR_CODES.INSUFFICIENT_FUNDS:
                return new InsufficientFundsError(0, 0);
            
            case 'BankPaused':
            case ERROR_CODES.BANK_PAUSED:
                return new BankPausedError('unknown');
            
            case 'IntentWouldExceedLimit':
            case ERROR_CODES.INTENT_WOULD_EXCEED_LIMIT:
                return new IntentValidationError('would exceed spending limit');
            
            case 'IntentInsufficientFunds':
            case ERROR_CODES.INTENT_INSUFFICIENT_FUNDS:
                return new IntentValidationError('insufficient funds');
            
            default:
                return new NeoBankError(message, errorNum || 9999);
        }
    }

    // Generic error
    return new NeoBankError(message, 9999);
}

/**
 * Check if error is a specific type
 */
export function isSpendingLimitError(error: any): error is SpendingLimitError {
    return error instanceof SpendingLimitError || 
           error?.code === ERROR_CODES.SPENDING_LIMIT_EXCEEDED;
}

export function isInsufficientFundsError(error: any): error is InsufficientFundsError {
    return error instanceof InsufficientFundsError || 
           error?.code === ERROR_CODES.INSUFFICIENT_FUNDS;
}

export function isBankPausedError(error: any): error is BankPausedError {
    return error instanceof BankPausedError || 
           error?.code === ERROR_CODES.BANK_PAUSED;
}

export function isSecurityError(error: any): error is SecurityError {
    return error instanceof SecurityError;
}

export function isRateLimitError(error: any): error is RateLimitError {
    return error instanceof RateLimitError;
}

/**
 * Get user-friendly error message
 */
export function getUserMessage(error: any): string {
    if (error instanceof SpendingLimitError) {
        return `You've reached your spending limit. ${error.remaining} SOL remaining.`;
    }
    if (error instanceof InsufficientFundsError) {
        return `Not enough funds. Balance: ${error.balance} SOL`;
    }
    if (error instanceof BankPausedError) {
        return `Bank is temporarily paused for ${error.reason}. Try again later.`;
    }
    if (error instanceof SecurityError) {
        return `Security check failed: ${error.message}`;
    }
    if (error instanceof RateLimitError) {
        return `Too many requests. Try again in ${Math.ceil(error.retryAfterMs / 1000)} seconds.`;
    }
    return error?.message || 'An unexpected error occurred';
}
