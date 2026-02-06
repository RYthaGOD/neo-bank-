import { PublicKey } from '@solana/web3.js';
import { integrations } from '../src/lib/integrations';

async function runVerification() {
    console.log('🔍 Verified Integration Mock Layer...');
    console.log('-----------------------------------');

    // 1. Test Individual Components
    console.log('\n[1] Testing Component Checks:');

    // Varuna
    const risk = await integrations.varuna.checkRisk([]);
    console.log(`Varuna Risk Score: ${risk.score} (Safe: ${risk.safe})`);

    // SlotScribe
    const log = await integrations.slotScribe.log('TEST_EVENT', { timestamp: Date.now() });
    console.log(`SlotScribe Log Tx: ${log}`);

    // WarGames
    const wargames = await integrations.warGames.getDefConLevel();
    console.log(`WarGames Level: ${wargames}`);

    // SolPrism
    await integrations.solPrism.publishReasoning('trade_123', 'Moving average crossover');

    // SAID
    const adminParams = new PublicKey('FiarvoTx8WkneMjqX4T7KEpzX2Ya1FeBL991qGi49kFd');
    const isVerified = await integrations.said.verifyAdmin(adminParams);
    console.log(`SAID Admin Verified: ${isVerified}`);

    // 2. Test Unified Security Sweep
    console.log('\n[2] Testing Unified Security Sweep:');
    const result = await integrations.runSecuritySweep(adminParams);

    console.log('Security Report:');
    result.report.forEach(line => console.log(`  ${line}`));

    if (result.passed) {
        console.log('\n✅ VERIFICATION PASSED: All integration mocks fully operational.');
        process.exit(0);
    } else {
        console.error('\n❌ VERIFICATION FAILED: Security checks failed.');
        process.exit(1);
    }
}

runVerification().catch(err => {
    console.error('Fatal Error:', err);
    process.exit(1);
});
