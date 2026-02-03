"use client";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Program, AnchorProvider, web3, BN, Idl } from "@coral-xyz/anchor";
import { useEffect, useState } from "react";
import idl from "../idl/idl.json";
import { PublicKey } from "@solana/web3.js";

const PROGRAM_ID = new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || "FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd");

import { AgentNeoBank } from "../lib/agent-sdk";

export default function Home() {
  const { connection } = useConnection();
  const wallet = useWallet();
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
    setStatus("Registering...");
    try {
      const tx = await sdk.registerAgent(agentName, parseFloat(limit));
      setStatus(`Success! Tx: ${tx}`);
      await refreshData();
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  };

  const depositFunds = async () => {
    const sdk = getSdk();
    if (!sdk) return;
    setStatus("Depositing...");
    try {
      const tx = await sdk.deposit(parseFloat(depositAmount));
      setStatus(`Deposit Success! Tx: ${tx}`);
      await refreshData();
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  };

  const accrueYieldManual = async () => {
    const sdk = getSdk();
    if (!sdk || !wallet.publicKey) return;
    setStatus("Accruing Yield...");
    try {
      const tx = await sdk.accrueYield(wallet.publicKey);
      setStatus(`Yield Accrued! Tx: ${tx}`);
      await refreshData();
    } catch (e: any) {
      setStatus("Error: " + e.message);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-green-500 font-mono p-8 selection:bg-green-900">
      <header className="flex justify-between items-center mb-12 border-b-2 border-green-800 pb-4">
        <h1 className="text-4xl font-black uppercase tracking-tighter">
          Agent<span className="text-white">Neo</span> Bank
        </h1>
        <WalletMultiButton className="!bg-green-600 hover:!bg-green-700 !font-mono !uppercase !rounded-none" />
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Actions */}
        <div className="lg:col-span-1 space-y-8">
          <section className="border-2 border-green-600 p-6 bg-zinc-900/50">
            <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-widest">
              Identity Protocol
            </h2>
            <div className="space-y-4">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full bg-zinc-950 border border-green-800 p-3 focus:outline-none focus:border-green-500 text-white text-sm"
                placeholder="AGENT_NAME"
              />
              <input
                type="number"
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full bg-zinc-950 border border-green-800 p-3 focus:outline-none focus:border-green-500 text-white text-sm"
                placeholder="LIMIT (SOL)"
              />
              <button
                onClick={registerAgent}
                className="w-full bg-green-600 text-black font-bold uppercase py-3 hover:bg-green-500 transition-all text-sm"
              >
                Register Agent
              </button>
            </div>
          </section>

          {agentAddress && (
            <section className="border-2 border-green-800 p-6 bg-zinc-900/50">
              <h2 className="text-xl font-bold mb-6 text-white uppercase tracking-widest">
                Capital Rails
              </h2>
              <div className="space-y-4">
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  className="w-full bg-zinc-950 border border-green-800 p-3 focus:outline-none focus:border-green-500 text-white text-sm"
                />
                <button
                  onClick={depositFunds}
                  className="w-full bg-white text-black font-bold uppercase py-3 hover:bg-zinc-200 transition-all text-sm"
                >
                  Deposit to Vault
                </button>
                <button
                  onClick={accrueYieldManual}
                  className="w-full border border-green-600 text-green-500 font-bold uppercase py-3 hover:bg-green-900/20 transition-all text-sm"
                >
                  Accrue Yield
                </button>
              </div>
            </section>
          )}
        </div>

        {/* Right Column: Status & Data */}
        <div className="lg:col-span-2 space-y-8">
          {agentData ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="border border-green-800 p-6 bg-zinc-900/30">
                <h3 className="text-xs uppercase text-zinc-500 mb-2">Agent ID</h3>
                <p className="text-xl text-white font-bold mb-4">{agentData.name}</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>STATUS:</span>
                    <span className="text-green-400">ACTIVE</span>
                  </div>
                  <div className="flex justify-between">
                    <span>LIMIT:</span>
                    <span className="text-white">{(agentData.spendingLimit.toNumber() / 1e9).toFixed(2)} SOL/DAY</span>
                  </div>
                </div>
              </div>

              <div className="border border-green-800 p-6 bg-zinc-900/30">
                <h3 className="text-xs uppercase text-zinc-500 mb-2">Vault Strategy</h3>
                <p className="text-xl text-green-400 font-bold mb-4">5.0% APY</p>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span>STAKED:</span>
                    <span className="text-white">{(agentData.stakedAmount.toNumber() / 1e9).toFixed(5)} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span>TOTAL DEPOSITED:</span>
                    <span className="text-white">{(agentData.totalDeposited.toNumber() / 1e9).toFixed(2)} SOL</span>
                  </div>
                </div>
              </div>

              <div className="md:col-span-2 border border-green-800 p-6 bg-zinc-950">
                <h3 className="text-xs uppercase text-zinc-500 mb-4">Infrastructure Addresses</h3>
                <div className="space-y-4 font-mono text-[10px] break-all">
                  <div>
                    <span className="text-zinc-600">AGENT_PDA:</span> {agentAddress}
                  </div>
                  <div>
                    <span className="text-zinc-600">VAULT_PDA:</span> {vaultAddress}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center border-2 border-dashed border-green-900 p-12 text-center">
              <p className="text-zinc-600 uppercase tracking-widest mb-4">Offline / Decentralized Identity Required</p>
              <p className="text-xs text-zinc-500 max-w-xs">Initialize your agent identity protocol to access banking infrastructure.</p>
            </div>
          )}

          {status && (
            <div className="p-4 bg-black border border-green-800 text-[10px] break-all animate-pulse">
              {status}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
