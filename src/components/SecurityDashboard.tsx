/**
 * Security Dashboard Component
 * 
 * Real-time monitoring of security events, circuit breaker status,
 * and suspicious activity for Neo Bank agents.
 */

'use client';

import { useEffect, useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { SecurityMonitor, SecurityEvent } from '@/lib/security-layer';
import { AgentNeoBank } from '@/lib/agent-sdk';

interface CircuitBreakerStatus {
    suspiciousActivityCount: number;
    autoThreshold: number;
    isPaused: boolean;
    pauseReason: string;
    lastSecurityCheck: number;
}

interface SecurityStats {
    totalChecks: number;
    blocked: number;
    warned: number;
    passed: number;
    avgRiskScore: number;
}

export default function SecurityDashboard({
    agentOwner
}: {
    agentOwner: PublicKey
}) {
    const [events, setEvents] = useState<SecurityEvent[]>([]);
    const [circuitBreaker, setCircuitBreaker] = useState<CircuitBreakerStatus | null>(null);
    const [stats, setStats] = useState<SecurityStats>({
        totalChecks: 0,
        blocked: 0,
        warned: 0,
        passed: 0,
        avgRiskScore: 0,
    });

    useEffect(() => {
        // Initialize security monitor
        const monitor = new SecurityMonitor();

        // Subscribe to security events
        monitor.onEvent((event) => {
            setEvents(prev => [event, ...prev].slice(0, 50)); // Keep last 50

            // Update stats
            setStats(prev => ({
                totalChecks: prev.totalChecks + 1,
                blocked: prev.blocked + (event.type === 'block' ? 1 : 0),
                warned: prev.warned + (event.type === 'warn' ? 1 : 0),
                passed: prev.passed + (event.type === 'pass' ? 1 : 0),
                avgRiskScore: (prev.avgRiskScore * prev.totalChecks + event.riskScore) / (prev.totalChecks + 1),
            }));
        });

        // Fetch circuit breaker status
        const fetchCircuitBreakerStatus = async () => {
            try {
                // TODO: Implement actual fetch from on-chain config
                // For now, mock data
                setCircuitBreaker({
                    suspiciousActivityCount: 3,
                    autoThreshold: 10,
                    isPaused: false,
                    pauseReason: 'none',
                    lastSecurityCheck: Date.now() / 1000,
                });
            } catch (error) {
                console.error('Failed to fetch circuit breaker status:', error);
            }
        };

        fetchCircuitBreakerStatus();
        const interval = setInterval(fetchCircuitBreakerStatus, 10000); // Refresh every 10s

        return () => clearInterval(interval);
    }, [agentOwner]);

    const getEventIcon = (type: SecurityEvent['type']) => {
        switch (type) {
            case 'block': return '🚫';
            case 'warn': return '⚠️';
            case 'pass': return '✅';
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return 'text-red-600';
        if (score >= 50) return 'text-orange-600';
        if (score >= 20) return 'text-yellow-600';
        return 'text-green-600';
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Security Dashboard</h2>
                <div className="text-sm text-gray-500">
                    Agent: {agentOwner.toBase58().slice(0, 8)}...
                </div>
            </div>

            {/* Circuit Breaker Status */}
            {circuitBreaker && (
                <div className={`p-6 rounded-lg border-2 ${circuitBreaker.isPaused
                        ? 'bg-red-50 border-red-300'
                        : 'bg-green-50 border-green-300'
                    }`}>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                            {circuitBreaker.isPaused ? '🚨' : '🛡️'} Circuit Breaker
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${circuitBreaker.isPaused
                                ? 'bg-red-200 text-red-800'
                                : 'bg-green-200 text-green-800'
                            }`}>
                            {circuitBreaker.isPaused ? 'PAUSED' : 'ACTIVE'}
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-sm text-gray-600">Suspicious Activities</div>
                            <div className="text-2xl font-bold">
                                {circuitBreaker.suspiciousActivityCount} / {circuitBreaker.autoThreshold}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Auto-Pause Threshold</div>
                            <div className="text-2xl font-bold">{circuitBreaker.autoThreshold}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-600">Status</div>
                            <div className="text-lg font-medium capitalize">{circuitBreaker.pauseReason}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-4">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className={`h-2 rounded-full transition-all ${circuitBreaker.suspiciousActivityCount >= circuitBreaker.autoThreshold
                                        ? 'bg-red-600'
                                        : 'bg-yellow-500'
                                    }`}
                                style={{
                                    width: `${Math.min(100, (circuitBreaker.suspiciousActivityCount / circuitBreaker.autoThreshold) * 100)}%`
                                }}
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* Security Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Total Checks</div>
                    <div className="text-3xl font-bold">{stats.totalChecks}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Blocked</div>
                    <div className="text-3xl font-bold text-red-600">{stats.blocked}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Warned</div>
                    <div className="text-3xl font-bold text-yellow-600">{stats.warned}</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow">
                    <div className="text-sm text-gray-600">Passed</div>
                    <div className="text-3xl font-bold text-green-600">{stats.passed}</div>
                </div>
            </div>

            {/* Recent Events */}
            <div className="bg-white rounded-lg shadow">
                <div className="p-4 border-b">
                    <h3 className="text-lg font-semibold">Recent Security Events</h3>
                </div>
                <div className="divide-y max-h-96 overflow-y-auto">
                    {events.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No security events yet
                        </div>
                    ) : (
                        events.map((event, idx) => (
                            <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-start gap-3">
                                        <span className="text-2xl">{getEventIcon(event.type)}</span>
                                        <div>
                                            <div className="font-mono text-sm">
                                                {event.address.slice(0, 16)}...
                                            </div>
                                            <div className="text-sm text-gray-600 mt-1">
                                                {event.reason}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-lg font-bold ${getRiskColor(event.riskScore)}`}>
                                            {event.riskScore}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(event.timestamp).toLocaleTimeString()}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Average Risk Score Gauge */}
            <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold mb-4">Average Risk Score</h3>
                <div className="flex items-center justify-center">
                    <div className="relative w-48 h-48">
                        <svg className="transform -rotate-90 w-48 h-48">
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke="#e5e7eb"
                                strokeWidth="16"
                                fill="none"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke={
                                    stats.avgRiskScore >= 80 ? '#dc2626' :
                                        stats.avgRiskScore >= 50 ? '#ea580c' :
                                            stats.avgRiskScore >= 20 ? '#ca8a04' :
                                                '#16a34a'
                                }
                                strokeWidth="16"
                                fill="none"
                                strokeDasharray={`${(stats.avgRiskScore / 100) * 502.4} 502.4`}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="text-center">
                                <div className={`text-4xl font-bold ${getRiskColor(stats.avgRiskScore)}`}>
                                    {stats.avgRiskScore.toFixed(1)}
                                </div>
                                <div className="text-sm text-gray-500">Risk Score</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
