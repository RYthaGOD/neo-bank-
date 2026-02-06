"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import Image from "next/image";
import {
  Shield,
  Wallet,
  Terminal,
  Lock,
  Activity,
  ArrowUpRight,
  Server,
  Database,
  ChevronRight,
  Plus
} from "lucide-react";

import { AgentNeoBank } from "../lib/agent-sdk";
import SecurityDashboard from "../components/SecurityDashboard";
import SecurityAnalytics from "../components/SecurityAnalytics";
import CircuitBreakerAdmin from "../components/CircuitBreakerAdmin";

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [activeTab, setActiveTab] = useState("banking");
  const [agentName, setAgentName] = useState("");
  const [limit, setLimit] = useState("1");
  const [status, setStatus] = useState("");
  const [agentAddress, setAgentAddress] = useState<string | null>(null);
  const [vaultAddress, setVaultAddress] = useState<string | null>(null);
  const [agentData, setAgentData] = useState<any>(null);
  const [depositAmount, setDepositAmount] = useState("0.1");

  const getSdk = () => {
    if (!wallet.publicKey || !wallet.signTransaction || !wallet.signAllTransactions) return null;
    const adapter = {
      publicKey: wallet.publicKey,
      signTransaction: wallet.signTransaction.bind(wallet),
      signAllTransactions: wallet.signAllTransactions.bind(wallet),
    } as any;
    return new AgentNeoBank(connection, adapter);
  };

  const refreshData = async () => {
    const sdk = getSdk();
    if (!sdk || !wallet.publicKey) return;
    try {
      const data = await sdk.getAgentData(wallet.publicKey);
      setAgentData(data);
      const agentPda = sdk.getAgentPda(wallet.publicKey);
      const vaultPda = sdk.getVaultPda(agentPda);
      setAgentAddress(agentPda.toString());
      setVaultAddress(vaultPda.toString());
    } catch (e) {
      console.log("No agent found for this wallet yet.");
    }
  };

  useEffect(() => {
    if (wallet.connected) {
      refreshData();
    }
  }, [wallet.connected]);

  const registerAgent = async () => {
    const sdk = getSdk();
    if (!sdk) return;
    setStatus("PROTOCOL_INIT: REGISTERING_AGENT...");
    try {
      const tx = await sdk.registerAgent(agentName, parseFloat(limit));
      setStatus(`SUCCESS: AGENT_REGISTERED_TX: ${tx.slice(0, 16)}...`);
      await refreshData();
    } catch (e: any) {
      setStatus("FAILURE: " + e.message);
    }
  };

  const depositFunds = async () => {
    const sdk = getSdk();
    if (!sdk) return;
    setStatus("PROTOCOL_INIT: DEPOSITING_ASSETS...");
    try {
      const tx = await sdk.deposit(parseFloat(depositAmount));
      setStatus(`SUCCESS: ASSETS_LOCKED_TX: ${tx.slice(0, 16)}...`);
      await refreshData();
    } catch (e: any) {
      setStatus("FAILURE: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-emerald-500 font-sans selection:bg-emerald-900/30">
      {/* Background Hero Image */}
      <div className="fixed inset-0 z-0 opacity-10 grayscale hover:grayscale-0 transition-all duration-1000">
        <Image
          src="/home/craig/.gemini/antigravity/brain/d1a86732-59a7-430a-9b26-74d714fdf003/neo_bank_hero_1770394554884.png"
          alt="Neo Bank Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-zinc-950/80 to-zinc-950"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-16 gap-6 pt-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.5)]">
              <Lock className="text-black w-6 h-6" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-2">
                Agent<span className="text-emerald-500">Neo</span> Bank
                <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-0.5 rounded border border-emerald-500/20 font-mono tracking-widest mt-1">MAINNET_BETA</span>
              </h1>
              <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">The First Autonomous Treasury Protocol on Solana</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <WalletMultiButton className="!bg-emerald-600 hover:!bg-emerald-500 !font-mono !uppercase !rounded-xl !h-12 !px-8 !transition-all !text-[12px] !font-black !tracking-widest !border-none !shadow-[0_0_20px_rgba(16,185,129,0.2)]" />
          </div>
        </header>

        {/* Global Navigation */}
        <nav className="flex items-center gap-1 mb-8 p-1.5 glass rounded-2xl w-fit border-zinc-800">
          {[
            { id: "banking", label: "General Ledger", icon: Wallet },
            { id: "security", label: "Neural Shield", icon: Shield },
            { id: "admin", label: "Protocol Admin", icon: Terminal },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)]"
                  : "text-zinc-500 hover:text-zinc-300"
                }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
          {activeTab === "banking" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Sidebar: Registration/Actions */}
              <div className="space-y-6">
                <section className="glass rounded-2xl p-6 border-zinc-800 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-6">
                    <Plus className="text-emerald-500 w-4 h-4" />
                    <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Identity Protocol</h2>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Agent Identifier</label>
                      <input
                        type="text"
                        value={agentName}
                        onChange={(e) => setAgentName(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm font-mono placeholder:text-zinc-700 transition-all"
                        placeholder="NAME_HASH..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Daily Burn Limit (SOL)</label>
                      <input
                        type="number"
                        value={limit}
                        onChange={(e) => setLimit(e.target.value)}
                        className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm font-mono transition-all"
                      />
                    </div>
                    <button
                      onClick={registerAgent}
                      disabled={!wallet.connected}
                      className="w-full bg-emerald-600 text-black font-black uppercase py-4 rounded-xl hover:bg-emerald-500 transition-all text-xs tracking-widest disabled:opacity-20 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(16,185,129,0.2)] active:scale-[0.98]"
                    >
                      Initialize Vault
                    </button>
                  </div>
                </section>

                {agentAddress && (
                  <section className="glass rounded-2xl p-6 border-zinc-800">
                    <div className="flex items-center gap-2 mb-6">
                      <Server className="text-emerald-500 w-4 h-4" />
                      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-400">Capital Rails</h2>
                    </div>
                    <div className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase tracking-widest text-zinc-600 ml-1">Deposit Amount</label>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          className="w-full bg-black/40 border border-zinc-800 p-4 rounded-xl focus:outline-none focus:border-emerald-500/50 text-white text-sm font-mono transition-all"
                        />
                      </div>
                      <button
                        onClick={depositFunds}
                        className="w-full bg-white text-zinc-950 font-black uppercase py-4 rounded-xl hover:bg-zinc-200 transition-all text-xs tracking-widest shadow-[0_0_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                      >
                        Push to Vault
                      </button>
                    </div>
                  </section>
                )}
              </div>

              {/* Main Content: Account Data */}
              <div className="lg:col-span-2 space-y-8">
                {agentData ? (
                  <div className="space-y-8">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="glass p-8 rounded-2xl border-zinc-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Wallet className="w-16 h-16" />
                        </div>
                        <h3 className="text-[10px] uppercase text-zinc-600 font-black tracking-widest mb-4">Vault Identity</h3>
                        <p className="text-3xl text-white font-black mb-6 tracking-tighter">{agentData.name}</p>
                        <div className="space-y-3 font-mono text-xs">
                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">OPERATIONAL_STATUS</span>
                            <span className="text-emerald-400 font-black flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              HIGH_RELIABILITY
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">SPENDING_CAP</span>
                            <span className="text-white font-black">{(agentData.spendingLimit.toNumber() / 1e9).toFixed(2)} SOL/PERIOD</span>
                          </div>
                        </div>
                      </div>

                      <div className="glass p-8 rounded-2xl border-zinc-800 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <Activity className="w-16 h-16" />
                        </div>
                        <h3 className="text-[10px] uppercase text-zinc-600 font-black tracking-widest mb-4">Capital Efficiency</h3>
                        <p className="text-3xl text-emerald-500 font-black mb-6 tracking-tighter">0.00% APR</p>
                        <div className="space-y-3 font-mono text-xs">
                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">TOTAL_LOCKED</span>
                            <span className="text-white font-black">{(agentData.totalDeposited.toNumber() / 1e9).toFixed(5)} SOL</span>
                          </div>
                          <div className="flex justify-between border-b border-zinc-900 pb-2">
                            <span className="text-zinc-500">YIELD_PROTOCOL</span>
                            <span className="text-zinc-400">NATIVE_STAKING</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Technical Specs */}
                    <div className="glass p-8 rounded-2xl border-zinc-800">
                      <div className="flex items-center justify-between mb-8">
                        <h3 className="text-[10px] uppercase text-zinc-600 font-black tracking-widest">Neural Infrastructure Nodes</h3>
                        <Database className="w-4 h-4 text-zinc-700" />
                      </div>
                      <div className="space-y-6 font-mono text-[10px] break-all">
                        <div className="group cursor-pointer">
                          <div className="flex justify-between text-zinc-600 mb-1 group-hover:text-emerald-500 transition-colors">
                            <span>AGENT_PDA_ADDRESS</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg border border-zinc-900 text-zinc-400 font-black">{agentAddress}</div>
                        </div>
                        <div className="group cursor-pointer">
                          <div className="flex justify-between text-zinc-600 mb-1 group-hover:text-emerald-500 transition-colors">
                            <span>VAULT_PDA_ADDRESS</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </div>
                          <div className="bg-black/40 p-3 rounded-lg border border-zinc-900 text-zinc-400 font-black">{vaultAddress}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center glass border-2 border-dashed border-zinc-800 rounded-2xl p-24 text-center group transition-all hover:border-emerald-500/20">
                    <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mb-8 border border-zinc-800 group-hover:scale-110 transition-transform duration-500">
                      <Server className="text-zinc-700 w-10 h-10 group-hover:text-emerald-500 transition-colors" />
                    </div>
                    <h3 className="text-white font-black uppercase tracking-tighter text-xl mb-4">Neural Link Required</h3>
                    <p className="text-xs text-zinc-500 max-w-sm leading-relaxed uppercase tracking-widest font-bold">Initialize your autonomous agent identity protocol on the Solana mainnet beta to access systemic liquidity.</p>
                    <button
                      onClick={() => document.querySelector('input')?.focus()}
                      className="mt-8 flex items-center gap-2 text-emerald-500 font-black uppercase text-[10px] tracking-widest hover:text-emerald-400 transition-colors"
                    >
                      BEGIN_INITIALIZATION <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-12">
              <SecurityDashboard agentOwner={wallet.publicKey || PublicKey.default} />
              <div className="border-t border-zinc-900 pt-12">
                <div className="mb-8 items-center flex gap-3">
                  <Activity className="text-emerald-500 w-5 h-5" />
                  <h2 className="text-xl font-black uppercase tracking-tighter text-white font-mono">Heuristic <span className="text-emerald-500">Analytics</span></h2>
                </div>
                <SecurityAnalytics events={[]} />
              </div>
            </div>
          )}

          {activeTab === "admin" && (
            <div className="max-w-4xl mx-auto py-12">
              <CircuitBreakerAdmin />
              <div className="mt-12 glass p-8 rounded-2xl border-rose-500/20 bg-rose-500/5">
                <div className="flex items-center gap-3 mb-6">
                  <Shield className="text-rose-500 w-5 h-5" />
                  <h3 className="text-white font-black uppercase tracking-tighter">Emergency Shutdown Protocols</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed font-mono mb-8">
                  DANGER: These instructions bypass standard autonomous logic. Global freeze will halt ALL agent withdrawals across the treasury. Only use in case of catastrophic program vulnerability.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <button className="py-4 bg-rose-500/10 border border-rose-500/30 text-rose-500 font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-rose-500/20 transition-all opacity-50 cursor-not-allowed">Protocol_Freeze</button>
                  <button className="py-4 bg-zinc-900 border border-zinc-800 text-zinc-600 font-black uppercase tracking-widest text-[10px] rounded-xl cursor-not-allowed">Reset_Auth_Keys</button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer / Status Notification */}
        <footer className="mt-24 border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-8 text-[10px] font-black uppercase tracking-widest text-zinc-600 pb-12">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              PROTO_V_0.8.2
            </div>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-800"></span>
              NETWORK: DEVNET_STAGING
            </div>
          </div>
          <div className="font-mono">
            {status ? (
              <span className="text-emerald-500 animate-pulse">{status}</span>
            ) : (
              "SYSTEM_IDLE: AWAITING_COMMAND"
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
