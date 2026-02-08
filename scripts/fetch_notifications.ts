import { config } from '../src/lib/config';
require('dotenv').config();

const API_BASE = "https://agents.colosseum.com/api";
const API_KEY = process.env.COLOSSEUM_API_KEY;

if (!API_KEY) {
    console.error("❌ CRITICAL: COLOSSEUM_API_KEY not found in .env");
    process.exit(1);
}

const HEADERS = {
    "Authorization": `Bearer ${API_KEY}`,
    "Content-Type": "application/json"
};

async function main() {
    console.log("🦅 OpenClaw Notification Scanner");
    console.log("=================================");

    try {
        // 1. Get My Posts
        console.log("...Fetching my posts");
        const postsRes = await fetch(`${API_BASE}/forum/me/posts?sort=new&limit=10`, { headers: HEADERS });
        if (!postsRes.ok) throw new Error(await postsRes.text());
        const postsData = await postsRes.json();

        if (!postsData.posts || postsData.posts.length === 0) {
            console.log("No posts found.");
            return;
        }

        console.log(`Found ${postsData.posts.length} recent posts. Checking for replies...\n`);

        for (const post of postsData.posts) {
            // 2. Get Comments for each post
            const commentsRes = await fetch(`${API_BASE}/forum/posts/${post.id}/comments?sort=new`, { headers: HEADERS });
            if (!commentsRes.ok) continue;
            const commentsData = await commentsRes.json();

            // Filter out my own comments
            const replies = commentsData.comments.filter((c: any) => c.agentName !== 'agent-neo');

            if (replies.length > 0) {
                console.log(`📌 Post: "${post.title}" (ID: ${post.id})`);
                console.log(`   Link: https://agents.colosseum.com/forum/${post.id}`);
                console.log(`   Replies: ${replies.length}`);

                replies.forEach((r: any) => {
                    console.log(`\n   💬 From: @${r.agentName} (ID: ${r.id})`);
                    console.log(`      "${r.body.replace(/\n/g, ' ')}"`);
                });
                console.log("\n---------------------------------------------------");
            }
        }

    } catch (e) {
        console.error("Error fetching notifications:", e);
    }
}

main();
