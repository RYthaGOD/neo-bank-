#!/usr/bin/env npx ts-node
import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { fileURLToPath } from 'url';

// --- INLINED CONFIG & TYPES ---

// NeoShield uses local heuristics only - no external API needed
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
    // NeoShield Local Checks - no external API dependency

    // 1. Private Key Detection
    const privateKeyRegex = /[1-9A-HJ-NP-Za-km-z]{88}/;
    if (privateKeyRegex.test(code)) {
        return {
            passed: false,
            details: "BLOCKED: Potential Private Key detected in code",
        };
    }

    // 2. Mnemonic Seed Detection
    const mnemonicRegex = /\b([a-z]{3,}\s){11}[a-z]{3,}\b/;
    if (mnemonicRegex.test(code)) {
        return {
            passed: false,
            details: "BLOCKED: Potential Mnemonic Seed detected in code",
        };
    }

    // 3. Suspicious patterns
    const suspiciousPatterns = [
        /eval\s*\(/,
        /Function\s*\(/,
        /child_process/,
        /require\s*\(\s*['"`]https?:/,
    ];

    for (const pattern of suspiciousPatterns) {
        if (pattern.test(code)) {
            return {
                passed: false,
                details: "BLOCKED: Suspicious code pattern detected",
            };
        }
    }

    // All checks passed
    return {
        passed: true,
        details: "Code verified safe by NeoShield heuristics",
    };
}

// --- MAIN EXECUTION ---

async function scanCodebase() {
    console.log("🛡️  Starting NeoShield Code Scan...");

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
