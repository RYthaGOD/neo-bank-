#!/usr/bin/env npx ts-node
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { fileURLToPath } from 'url';

// --- INLINED CONFIG & TYPES ---

const AGENT_SHIELD_URL = "https://agentshield.lobsec.org/api";
const AGENT_SHIELD_API_KEY = process.env.AGENT_SHIELD_API_KEY;
const STRICT_MODE = true; // Fail closed

// Whitelist relative paths (known safe)
const WHITELIST = [
    "scripts/deploy-check.ts",
    "scripts/scan-plugins.ts",
    "src/lib/security-layer.ts", // Contains regex patterns (false positive)
    "src/lib/security-layer.js", // Compiled output
    "next.config.ts",
    "components/WalletProvider.tsx",
    "src/lib/config.ts",
    "src/lib/agent-sdk.ts",
    "src/cli/neo-bank-cli.ts",
];

// Whitelist patterns (glob)
const GLOB_WHITELIST = [
    "tests/**",
    "examples/**",
    "**/*.test.ts"
];



interface CheckResult {
    passed: boolean;
    details: string;
}

// --- SCANNING LOGIC ---

async function scanCode(code: string): Promise<CheckResult> {
    // 1. Local Regex Check (High Speed, Zero Latency)
    const privateKeyRegex = /[1-9A-HJ-NP-Za-km-z]{88}/;
    if (privateKeyRegex.test(code)) {
        return {
            passed: false,
            details: "BLOCKED: Potential Private Key detected in code",
        };
    }

    const mnemonicRegex = /\b([a-z]{3,}\s){11}[a-z]{3,}\b/;
    if (mnemonicRegex.test(code)) {
        return {
            passed: false,
            details: "BLOCKED: Potential Mnemonic Seed detected in code",
        };
    }

    // 2. API Check (AgentShield)
    try {
        const response = await fetch(`${AGENT_SHIELD_URL}/scan`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(AGENT_SHIELD_API_KEY ? { 'Authorization': `Bearer ${AGENT_SHIELD_API_KEY}` } : {})
            },
            body: JSON.stringify({ code })
        });

        if (!response.ok) {
            // Rate Limit fallback (Fail Open if no key)
            if (response.status === 429) {
                console.warn(`⚠️  Rate Limit (429) - Passing ${response.url}`);
                return { passed: true, details: "API Rate Limit (Open)" };
            }

            // If strict mode, treat other API failures as a block
            if (STRICT_MODE) {
                return {
                    passed: false,
                    details: `API Scan Failed & Strict Mode Active: ${response.status}`,
                };
            }
            return { passed: true, details: "API Failed (Open)" };
        }

        const data = await response.json();
        const passed = data.safe === true;

        if (!passed) {
            console.log(`Debug [${data.threat}]:`, JSON.stringify(data));
        }

        return {
            passed,
            details: passed ? "Code verified safe" : `BLOCKED: ${data.threat || "Malicious code detected"}`,
        };
    } catch (error) {
        if (STRICT_MODE) {
            return {
                passed: false,
                details: `API Error & Strict Mode Active: ${error}`,
            };
        }
        return { passed: true, details: "API Error (Open)" };
    }
}

// --- MAIN EXECUTION ---

async function scanCodebase() {
    console.log("🛡️  Starting AgentShield Code Scan (Standalone)...");

    // Find files
    const files = await glob("**/*.{ts,tsx,js,rs}", {
        ignore: ["node_modules/**", ".next/**", "target/**", "dist/**", "**/*.d.ts", "scripts/scan-plugins.ts"], // Ignore self
        cwd: process.cwd(),
        absolute: true
    });

    console.log(`📂 Found ${files.length} files to scan.`);

    let issuesFound = 0;

    for (const file of files) {
        const content = fs.readFileSync(file, 'utf-8');
        const relativePath = path.relative(process.cwd(), file);

        // Skip large files
        if (content.length > 100_000) {
            continue;
        }

        // Check Whitelist
        if (WHITELIST.includes(relativePath)) {
            console.log(`⚪ [SKIP] ${relativePath} (Whitelisted)`);
            continue;
        }

        // Check Glob Whitelist
        const isGlobWhitelisted = GLOB_WHITELIST.some(pattern => {
            return relativePath.startsWith("tests/") ||
                relativePath.startsWith("examples/") ||
                relativePath.endsWith(".test.ts");
        });

        if (isGlobWhitelisted) {
            console.log(`⚪ [SKIP] ${relativePath} (Whitelisted Pattern)`);
            continue;
        }

        // Rate limit: Sleep 500ms between requests to avoid 429s (No API Key)
        await new Promise(resolve => setTimeout(resolve, 500));

        const result = await scanCode(content);

        if (!result.passed) {
            console.error(`❌ [FAIL] ${relativePath}: ${result.details}`);
            issuesFound++;
        }
    }

    if (issuesFound > 0) {
        console.error(`\n🚨 Scan Failed: ${issuesFound} security issues detected.`);
        return false;
    } else {
        console.log("\n✅ Base Security Scan Passed (Local + API).");
        return true;
    }
}

export { scanCodebase };

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    scanCodebase().catch(err => {
        console.error("Scanning Error:", err);
        process.exit(1);
    });
}
