/**
 * Security Analytics Component
 * 
 * Advanced analytics for security events including:
 * - Risk score trends over time
 * - Top blocked addresses
 * - Security check performance metrics
 * - Hourly activity heatmap
 */

'use client';

import { useEffect, useState } from 'react';
import { SecurityEvent } from '@/lib/security-layer';
import { BarChart3, TrendingUp, Skull, Zap } from 'lucide-react';

interface AnalyticsData {
    hourlyActivity: { hour: number; blocked: number; warned: number; passed: number }[];
    topBlockedAddresses: { address: string; count: number; avgRisk: number }[];
    riskTrend: { timestamp: number; avgRisk: number }[];
    checkPerformance: { check: string; avgTime: number; successRate: number }[];
}

export default function SecurityAnalytics({ events }: { events: SecurityEvent[] }) {
    const [analytics, setAnalytics] = useState<AnalyticsData>({
        hourlyActivity: [],
        topBlockedAddresses: [],
        riskTrend: [],
        checkPerformance: [],
    });

    useEffect(() => {
        if (events.length === 0) return;

        // Process hourly activity
        const hourlyMap = new Map<number, { blocked: number; warned: number; passed: number }>();
        events.forEach(event => {
            const hour = new Date(event.timestamp).getHours();
            const current = hourlyMap.get(hour) || { blocked: 0, warned: 0, passed: 0 };
            if (event.type === 'block') current.blocked++;
            else if (event.type === 'warn') current.warned++;
            else current.passed++;
            hourlyMap.set(hour, current);
        });

        const hourlyActivity = Array.from({ length: 24 }, (_, hour) => ({
            hour,
            ...(hourlyMap.get(hour) || { blocked: 0, warned: 0, passed: 0 }),
        }));

        // Process top blocked addresses
        const addressMap = new Map<string, { count: number; totalRisk: number }>();
        events.filter(e => e.type === 'block').forEach(event => {
            const current = addressMap.get(event.address) || { count: 0, totalRisk: 0 };
            current.count++;
            current.totalRisk += event.riskScore;
            addressMap.set(event.address, current);
        });

        const topBlockedAddresses = Array.from(addressMap.entries())
            .map(([address, data]) => ({
                address,
                count: data.count,
                avgRisk: data.totalRisk / data.count,
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);

        // Process risk trend (last 24 hours, grouped by hour)
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        const recentEvents = events.filter(e => e.timestamp >= oneDayAgo);

        const trendMap = new Map<number, { count: number; totalRisk: number }>();
        recentEvents.forEach(event => {
            const hourBucket = Math.floor(event.timestamp / (60 * 60 * 1000)) * (60 * 60 * 1000);
            const current = trendMap.get(hourBucket) || { count: 0, totalRisk: 0 };
            current.count++;
            current.totalRisk += event.riskScore;
            trendMap.set(hourBucket, current);
        });

        const riskTrend = Array.from(trendMap.entries())
            .map(([timestamp, data]) => ({
                timestamp,
                avgRisk: data.totalRisk / data.count,
            }))
            .sort((a, b) => a.timestamp - b.timestamp);

        setAnalytics({
            hourlyActivity,
            topBlockedAddresses,
            riskTrend,
            checkPerformance: [], // TODO: Implement when we have timing data
        });
    }, [events]);

    const maxHourlyActivity = Math.max(
        ...analytics.hourlyActivity.map(h => h.blocked + h.warned + h.passed),
        1
    );

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Hourly Activity Heatmap */}
                <div className="glass rounded-xl p-6 border-zinc-800">
                    <div className="flex items-center gap-2 mb-6">
                        <Zap className="text-emerald-500 w-4 h-4" />
                        <h3 className="text-xs uppercase tracking-widest font-black text-white">Transmission Pulse</h3>
                    </div>
                    <div className="grid grid-cols-12 gap-1.5">
                        {analytics.hourlyActivity.map((data, idx) => {
                            const total = data.blocked + data.warned + data.passed;
                            const intensity = total / maxHourlyActivity;
                            const bgColor =
                                data.blocked > data.passed ? `rgba(244, 63, 94, ${0.1 + intensity * 0.9})` :
                                    data.warned > data.passed ? `rgba(251, 191, 36, ${0.1 + intensity * 0.9})` :
                                        `rgba(16, 185, 129, ${0.1 + intensity * 0.9})`;

                            return (
                                <div
                                    key={idx}
                                    className="aspect-square rounded-md relative group cursor-pointer border border-white/5"
                                    style={{ backgroundColor: total > 0 ? bgColor : 'rgba(255,255,255,0.02)' }}
                                >
                                    <div className="absolute inset-0 flex items-center justify-center text-[8px] font-black opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                        {total}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-4 text-[9px] uppercase tracking-widest font-black text-zinc-600">
                        <span>00:00 CYCLE</span>
                        <span>12:00</span>
                        <span>23:59</span>
                    </div>
                </div>

                {/* Risk Score Trend */}
                <div className="glass rounded-xl p-6 border-zinc-800">
                    <div className="flex items-center gap-2 mb-6">
                        <TrendingUp className="text-emerald-500 w-4 h-4" />
                        <h3 className="text-xs uppercase tracking-widest font-black text-white">Volatility Vector</h3>
                    </div>
                    <div className="h-40 flex items-end gap-1.5">
                        {analytics.riskTrend.length === 0 ? (
                            <div className="w-full h-full flex items-center justify-center border border-zinc-800/50 border-dashed rounded-lg">
                                <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">Awaiting telemetry...</p>
                            </div>
                        ) : (
                            analytics.riskTrend.map((point, idx) => {
                                const height = (point.avgRisk / 100) * 100;
                                const color =
                                    point.avgRisk >= 80 ? 'bg-rose-500' :
                                        point.avgRisk >= 50 ? 'bg-amber-500' :
                                            point.avgRisk >= 20 ? 'bg-amber-400' :
                                                'bg-emerald-500';

                                return (
                                    <div
                                        key={idx}
                                        className="flex-1 relative group cursor-pointer"
                                    >
                                        <div
                                            className={`${color} rounded-t-sm transition-all hover:brightness-125 hover:shadow-[0_0_10px_currentColor] duration-500`}
                                            style={{ height: `${Math.max(4, height)}%` }}
                                        />
                                        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black border border-zinc-800 text-[9px] font-black text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                                            RISK: {point.avgRisk.toFixed(1)}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Top Blocked Addresses */}
            <div className="glass rounded-xl p-6 border-zinc-800">
                <div className="flex items-center gap-2 mb-6">
                    <Skull className="text-rose-500 w-4 h-4" />
                    <h3 className="text-xs uppercase tracking-widest font-black text-white">Blacklisted Signatures</h3>
                </div>
                {analytics.topBlockedAddresses.length === 0 ? (
                    <div className="py-12 text-center glass bg-black/20 border-zinc-900 rounded-lg">
                        <p className="text-[10px] text-zinc-600 font-black uppercase tracking-widest">No malicious signatures detected</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {analytics.topBlockedAddresses.map((item, idx) => (
                            <div key={idx} className="flex flex-col justify-between p-4 bg-black/40 border border-zinc-800 rounded-xl relative overflow-hidden group">
                                <div className="absolute -right-4 -top-4 text-rose-500/5 font-black text-6xl group-hover:text-rose-500/10 transition-colors">#{idx + 1}</div>
                                <div className="space-y-3">
                                    <div className="font-mono text-[9px] text-zinc-500 group-hover:text-rose-400 transition-colors">
                                        ID: {item.address.slice(0, 32)}...
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div>
                                            <div className="text-2xl font-mono font-black text-rose-500">
                                                {item.avgRisk.toFixed(0)}
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest font-black text-zinc-600">AVG_THREAT</div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-xl font-mono font-black text-white">
                                                {item.count}
                                            </div>
                                            <div className="text-[9px] uppercase tracking-widest font-black text-zinc-600">ATTEMPTS</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
