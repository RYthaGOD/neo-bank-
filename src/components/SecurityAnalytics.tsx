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
        <div className="space-y-6">
            {/* Hourly Activity Heatmap */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">24-Hour Activity Heatmap</h3>
                <div className="grid grid-cols-24 gap-1">
                    {analytics.hourlyActivity.map((data, idx) => {
                        const total = data.blocked + data.warned + data.passed;
                        const intensity = total / maxHourlyActivity;
                        const bgColor =
                            data.blocked > data.passed ? `rgba(220, 38, 38, ${intensity})` :
                                data.warned > data.passed ? `rgba(234, 88, 12, ${intensity})` :
                                    `rgba(22, 163, 74, ${intensity})`;

                        return (
                            <div
                                key={idx}
                                className="aspect-square rounded relative group cursor-pointer"
                                style={{ backgroundColor: bgColor || '#f3f4f6' }}
                                title={`${data.hour}:00 - ${total} events`}
                            >
                                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                    {total}
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>00:00</span>
                    <span>12:00</span>
                    <span>23:00</span>
                </div>
            </div>

            {/* Top Blocked Addresses */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Top Blocked Addresses</h3>
                {analytics.topBlockedAddresses.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">No blocked addresses yet</p>
                ) : (
                    <div className="space-y-3">
                        {analytics.topBlockedAddresses.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="text-2xl font-bold text-gray-400">#{idx + 1}</div>
                                    <div>
                                        <div className="font-mono text-sm">
                                            {item.address.slice(0, 16)}...
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            Blocked {item.count} time{item.count > 1 ? 's' : ''}
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-lg font-bold text-red-600">
                                        {item.avgRisk.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-gray-500">Avg Risk</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Risk Score Trend */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-4">Risk Score Trend (24h)</h3>
                {analytics.riskTrend.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">Not enough data yet</p>
                ) : (
                    <div className="h-64 flex items-end gap-2">
                        {analytics.riskTrend.map((point, idx) => {
                            const height = (point.avgRisk / 100) * 100;
                            const color =
                                point.avgRisk >= 80 ? 'bg-red-500' :
                                    point.avgRisk >= 50 ? 'bg-orange-500' :
                                        point.avgRisk >= 20 ? 'bg-yellow-500' :
                                            'bg-green-500';

                            return (
                                <div
                                    key={idx}
                                    className="flex-1 relative group cursor-pointer"
                                    title={`${new Date(point.timestamp).toLocaleTimeString()}: ${point.avgRisk.toFixed(1)}`}
                                >
                                    <div
                                        className={`${color} rounded-t transition-all hover:opacity-80`}
                                        style={{ height: `${height}%` }}
                                    />
                                    <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                        {point.avgRisk.toFixed(1)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
