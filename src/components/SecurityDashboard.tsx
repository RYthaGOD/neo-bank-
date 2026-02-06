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
import { Shield, AlertTriangle, CheckCircle, Activity, Lock, Unlock } from 'lucide-react';

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
                // Mock data for demo
                setCircuitBreaker({
                    suspiciousActivityCount: 2,
                    autoThreshold: 10,
                    isPaused: false,
                    pauseReason: 'NONE',
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
            case 'block': return <Shield className="text-rose-500 w-5 h-5" />;
            case 'warn': return <AlertTriangle className="text-amber-400 w-5 h-5" />;
            case 'pass': return <CheckCircle className="text-emerald-500 w-5 h-5" />;
        }
    };

    const getRiskColor = (score: number) => {
        if (score >= 80) return 'text-rose-500';
        if (score >= 50) return 'text-amber-500';
        if (score >= 20) return 'text-amber-400';
        return 'text-emerald-500';
    };

    return (
        <div className="space-y-6">
            {/* Circuit Breaker Status */}
            {circuitBreaker && (
                <div className={`p-6 rounded-xl glass border-2 transition-all duration-500 ${circuitBreaker.isPaused
                    ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.2)]'
                    : 'border-emerald-500/30'
                    }`}>
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${circuitBreaker.isPaused ? 'bg-rose-500/20' : 'bg-emerald-500/20'}`}>
                                {circuitBreaker.isPaused ? <Lock className="text-rose-500 w-6 h-6" /> : <Shield className="text-emerald-500 w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="text-lg font-bold tracking-tight text-white uppercase">Circuit Breaker</h3>
                                <p className="text-xs text-zinc-400 font-mono">ENCRYPTED NODE: {agentOwner.toBase58().slice(0, 12)}...</p>
                            </div>
                        </div>
                        <span className={`px-4 py-1.5 rounded-full text-xs font-bold tracking-widest ${circuitBreaker.isPaused
                            ? 'bg-rose-500/20 text-rose-500 border border-rose-500/50 animate-pulse'
                            : 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/50'
                            }`}>
                            {circuitBreaker.isPaused ? 'SYSTEM PAUSED' : 'OPTIMAL PROTECTION'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Threat Index</div>
                            <div className="text-2xl font-mono font-black text-white">
                                {circuitBreaker.suspiciousActivityCount} <span className="text-zinc-600">/</span> {circuitBreaker.autoThreshold}
                            </div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Auto-Kill Switch</div>
                            <div className="text-2xl font-mono font-black text-white">{circuitBreaker.autoThreshold} EVENTS</div>
                        </div>
                        <div className="space-y-1">
                            <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Protocol Reason</div>
                            <div className="text-lg font-mono font-bold text-emerald-400 capitalize">{circuitBreaker.pauseReason}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-6">
                        <div className="w-full bg-zinc-900 rounded-full h-1.5 overflow-hidden border border-zinc-800">
                            <div
                                className={`h-full transition-all duration-1000 ${circuitBreaker.suspiciousActivityCount >= circuitBreaker.autoThreshold
                                    ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]'
                                    : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Scans', value: stats.totalChecks, color: 'text-white', icon: <Activity className="w-4 h-4" /> },
                    { label: 'Blocked', value: stats.blocked, color: 'text-rose-500', icon: <Shield className="w-4 h-4" /> },
                    { label: 'Warning', value: stats.warned, color: 'text-amber-400', icon: <AlertTriangle className="w-4 h-4" /> },
                    { label: 'Verified', value: stats.passed, color: 'text-emerald-500', icon: <CheckCircle className="w-4 h-4" /> },
                ].map((stat, i) => (
                    <div key={i} className="glass p-4 rounded-xl border-zinc-800 flex flex-col justify-between h-24">
                        <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                            {stat.label}
                            <span className="opacity-50">{stat.icon}</span>
                        </div>
                        <div className={`text-3xl font-mono font-black ${stat.color}`}>{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Recent Events & Gauge Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Events */}
                <div className="lg:col-span-2 glass rounded-xl overflow-hidden border-zinc-800">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/30">
                        <h3 className="text-xs uppercase tracking-widest font-black text-white">Neural Security Log</h3>
                        <div className="flex gap-1">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500/30"></div>
                            <div className="w-2 h-2 rounded-full bg-emerald-500/30"></div>
                        </div>
                    </div>
                    <div className="divide-y divide-zinc-800/50 max-h-[400px] overflow-y-auto scrollbar-hide">
                        {events.length === 0 ? (
                            <div className="p-12 text-center text-zinc-600">
                                <Activity className="w-8 h-8 mx-auto mb-3 opacity-20" />
                                <p className="text-[10px] uppercase tracking-widest font-bold">Monitoring for incoming threats...</p>
                            </div>
                        ) : (
                            events.map((event, idx) => (
                                <div key={idx} className="p-4 hover:bg-emerald-500/5 transition-colors group">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-4">
                                            <div className="mt-1 transition-transform group-hover:scale-110 duration-300">
                                                {getEventIcon(event.type)}
                                            </div>
                                            <div className="space-y-1">
                                                <div className="font-mono text-[10px] text-zinc-400 group-hover:text-emerald-400 transition-colors">
                                                    ADDR: {event.address.slice(0, 24)}...
                                                </div>
                                                <div className="text-sm text-white font-medium">
                                                    {event.reason}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className={`text-xl font-mono font-black ${getRiskColor(event.riskScore)}`}>
                                                {event.riskScore.toFixed(0)}
                                            </div>
                                            <div className="text-[10px] text-zinc-600 font-mono">
                                                {new Date(event.timestamp).toLocaleTimeString([], { hour12: false })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Average Risk Score Gauge */}
                <div className="glass p-8 rounded-xl border-zinc-800 flex flex-col items-center justify-center text-center">
                    <h3 className="text-xs uppercase tracking-widest font-black text-zinc-500 mb-8 w-full text-left">Aggregate Risk</h3>
                    <div className="relative w-48 h-48">
                        <svg className="transform -rotate-90 w-48 h-48">
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke="#18181b"
                                strokeWidth="8"
                                fill="none"
                            />
                            <circle
                                cx="96"
                                cy="96"
                                r="80"
                                stroke="currentColor"
                                strokeWidth="12"
                                fill="none"
                                strokeDasharray={`${(stats.avgRiskScore / 100) * 502.4} 502.4`}
                                strokeLinecap="round"
                                className={`transition-all duration-1000 ${getRiskColor(stats.avgRiskScore)}`}
                            />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <div className={`text-5xl font-mono font-black ${getRiskColor(stats.avgRiskScore)}`}>
                                {stats.avgRiskScore.toFixed(0)}
                            </div>
                            <div className="text-[10px] uppercase tracking-widest font-black text-zinc-600">Health Index</div>
                        </div>
                    </div>
                    <p className="mt-8 text-[10px] text-zinc-500 leading-relaxed max-w-[200px] font-medium">
                        Real-time heuristic evaluation of all autonomous treasury interactions.
                    </p>
                </div>
            </div>
        </div>
    );
}
