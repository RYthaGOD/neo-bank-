/**
 * Admin Control Panel for Circuit Breaker
 * 
 * Allows admins to reset suspicious activity counter and configure
 * auto-pause threshold for the circuit breaker system.
 */

'use client';

import { useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { AgentNeoBank } from '@/lib/agent-sdk';
import * as anchor from '@coral-xyz/anchor';

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
            showMessage('error', 'Please connect your wallet');
            return;
        }

        setLoading(true);
        try {
            const bank = new AgentNeoBank(connection, wallet as any);

            // Call reset_security_counter instruction
            const tx = await (bank as any).program.methods
                .resetSecurityCounter()
                .rpc();

            showMessage('success', `Counter reset! TX: ${tx.slice(0, 8)}...`);
        } catch (error: any) {
            console.error('Reset failed:', error);
            showMessage('error', error.message || 'Failed to reset counter');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateThreshold = async () => {
        if (!wallet.publicKey) {
            showMessage('error', 'Please connect your wallet');
            return;
        }

        if (threshold < 0 || threshold > 1000) {
            showMessage('error', 'Threshold must be between 0 and 1000');
            return;
        }

        setLoading(true);
        try {
            const bank = new AgentNeoBank(connection, wallet as any);

            // Call update_auto_threshold instruction
            const tx = await (bank as any).program.methods
                .updateAutoThreshold(threshold)
                .rpc();

            showMessage('success', `Threshold updated to ${threshold}! TX: ${tx.slice(0, 8)}...`);
        } catch (error: any) {
            console.error('Update failed:', error);
            showMessage('error', error.message || 'Failed to update threshold');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-lg p-6 space-y-6">
            <div className="border-b pb-4">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                    ⚙️ Circuit Breaker Admin
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                    Manage auto-pause settings and reset suspicious activity counter
                </p>
            </div>

            {/* Status Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                    {message.text}
                </div>
            )}

            {/* Reset Counter */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Reset Suspicious Activity Counter</h3>
                <p className="text-sm text-gray-600">
                    Clears the suspicious activity count back to zero. Use this after investigating
                    and resolving security incidents.
                </p>
                <button
                    onClick={handleResetCounter}
                    disabled={loading || !wallet.publicKey}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                    {loading ? 'Resetting...' : '🔄 Reset Counter'}
                </button>
            </div>

            <div className="border-t pt-6" />

            {/* Update Threshold */}
            <div className="space-y-3">
                <h3 className="text-lg font-semibold">Configure Auto-Pause Threshold</h3>
                <p className="text-sm text-gray-600">
                    Set the number of suspicious activities that will trigger automatic pause.
                    Set to 0 to disable the circuit breaker.
                </p>

                <div className="flex items-center gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Threshold Value
                        </label>
                        <input
                            type="number"
                            min="0"
                            max="1000"
                            value={threshold}
                            onChange={(e) => setThreshold(parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Enter threshold (0-1000)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                            {threshold === 0
                                ? '⚠️ Circuit breaker will be disabled'
                                : `Auto-pause after ${threshold} suspicious activities`}
                        </p>
                    </div>

                    <div className="pt-6">
                        <button
                            onClick={handleUpdateThreshold}
                            disabled={loading || !wallet.publicKey}
                            className="px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                            {loading ? 'Updating...' : '💾 Update Threshold'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Recommendations */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">💡 Recommendations</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                    <li>• <strong>Low Security (50-100):</strong> For testing or low-risk environments</li>
                    <li>• <strong>Medium Security (10-50):</strong> Balanced protection for most use cases</li>
                    <li>• <strong>High Security (1-10):</strong> Maximum protection for high-value agents</li>
                    <li>• <strong>Disabled (0):</strong> Only for development/testing</li>
                </ul>
            </div>

            {/* Wallet Status */}
            {!wallet.publicKey && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <p className="text-yellow-800">
                        ⚠️ Please connect your admin wallet to manage circuit breaker settings
                    </p>
                </div>
            )}
        </div>
    );
}
