/**
 * Admin Control Panel for Circuit Breaker
 * 
 * Allows admins to reset suspicious activity counter and configure
 * auto-pause threshold for the circuit breaker system.
 */

'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AgentNeoBank } from '@/lib/agent-sdk';
import { Settings, RotateCcw, Save, ShieldAlert, Cpu, Info } from 'lucide-react';

export default function CircuitBreakerAdmin() {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [threshold, setThreshold] = useState(10);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 5000);
    };

    const handleResetCounter = async () => {
        if (!wallet.publicKey) {
            showMessage('error', 'Authentication Required');
            return;
        }

        setLoading(true);
        try {
            const bank = new AgentNeoBank(connection, wallet as any);
            const tx = await (bank as any).program.methods
                .resetSecurityCounter()
                .rpc();

            showMessage('success', `COUNTER RESET: ${tx.slice(0, 8)}...`);
        } catch (error: any) {
            console.error('Reset failed:', error);
            showMessage('error', error.message || 'PROTOCOL_FAILURE');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateThreshold = async () => {
        if (!wallet.publicKey) {
            showMessage('error', 'Authentication Required');
            return;
        }

        if (threshold < 0 || threshold > 1000) {
            showMessage('error', 'OOR: VALUE_UNSUPPORTED');
            return;
        }

        setLoading(true);
        try {
            const bank = new AgentNeoBank(connection, wallet as any);
            const tx = await (bank as any).program.methods
                .updateAutoThreshold(threshold)
                .rpc();

            showMessage('success', `THRESHOLD SET: ${threshold}`);
        } catch (error: any) {
            console.error('Update failed:', error);
            showMessage('error', error.message || 'PROTOCOL_FAILURE');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass rounded-xl border-zinc-800 p-8 space-y-8 relative overflow-hidden group">
            {/* Background Decoration */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-3xl rounded-full -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors duration-1000"></div>

            <div className="border-b border-zinc-800/50 pb-6">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-emerald-500/10 rounded-lg">
                        <Settings className="text-emerald-500 w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-black uppercase tracking-tighter text-white font-mono">
                        Admin <span className="text-emerald-500">Node</span> Control
                    </h2>
                </div>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                    Autonomous Circuit Breaker Protocol Management
                </p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg font-mono text-xs border animate-in fade-in slide-in-from-top-2 duration-300 ${message.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                    }`}>
                    <span className="font-black mr-2">[{message.type === 'success' ? 'OK' : 'FAIL'}]</span> {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Reset Counter */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <RotateCcw className="text-zinc-600 w-4 h-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Threat Reset</h3>
                    </div>
                    <p className="text-[11px] text-zinc-600 leading-relaxed uppercase font-medium">
                        Clear local suspicious activity logs and restore agent operational status after investigation.
                    </p>
                    <button
                        onClick={handleResetCounter}
                        disabled={loading || !wallet.publicKey}
                        className="w-full py-3 bg-zinc-900 text-zinc-400 border border-zinc-800 rounded-lg font-bold uppercase text-[10px] tracking-widest hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                        {loading ? 'EXECUTING...' : 'RESET_SECURITY_STATE'}
                    </button>
                </div>

                {/* Update Threshold */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <ShieldAlert className="text-emerald-500/50 w-4 h-4" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-zinc-400">Sensitivity Level</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="bg-black/40 border border-zinc-800 p-1 rounded-lg flex items-center gap-2">
                            <input
                                type="number"
                                min="0"
                                max="1000"
                                value={threshold}
                                onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                                className="flex-1 bg-transparent border-none text-white font-mono font-black py-2 px-3 focus:ring-0 text-lg"
                                placeholder="0"
                            />
                            <button
                                onClick={handleUpdateThreshold}
                                disabled={loading || !wallet.publicKey}
                                className="px-4 py-2.5 bg-emerald-600 text-black rounded-md font-black uppercase text-[10px] tracking-tighter hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed transition-all"
                            >
                                {loading ? '...' : <Save className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-[10px] text-zinc-600 font-mono italic">
                            {threshold === 0
                                ? '!! WARNING: CIRCUIT BREAKER DISABLED !!'
                                : `AUTO-PAUSE AT ${threshold} ANOMALIES`}
                        </p>
                    </div>
                </div>
            </div>

            {/* Recommendations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                    { title: 'CRITICAL', val: '1-10', desc: 'Max Defense' },
                    { title: 'STANDARD', val: '10-50', desc: 'Recommended' },
                    { title: 'DEV_MODE', val: '0', desc: 'No Protection' },
                ].map((item, i) => (
                    <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 p-3 rounded-lg flex flex-col items-center justify-center text-center">
                        <div className="text-[9px] font-black text-zinc-600 tracking-tighter mb-1">{item.title}</div>
                        <div className="text-sm font-mono font-black text-emerald-500/70">{item.val}</div>
                    </div>
                ))}
            </div>

            {/* Notification / Auth Check */}
            {!wallet.publicKey && (
                <div className="absolute inset-0 z-10 bg-zinc-950/80 backdrop-blur-sm flex items-center justify-center rounded-xl p-8 text-center">
                    <div className="space-y-4">
                        <div className="mx-auto w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center">
                            <Cpu className="text-rose-500 w-6 h-6 animate-pulse" />
                        </div>
                        <div>
                            <h4 className="text-white font-black uppercase tracking-tighter">System Locked</h4>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Admin Signature Required</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
