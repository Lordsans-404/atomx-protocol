import fetch from 'node-fetch';
import dotenv from 'dotenv';
import path from 'path';

for (const envPath of [path.resolve('.env.local'), path.resolve('apps/web/.env.local')]) {
  dotenv.config({ path: envPath, override: false });
}

const CRON_SECRET = process.env.CRON_SECRET;
const LOCAL_URL = 'http://localhost:3000/api/cron/check-deadlines';

if (!CRON_SECRET) {
  console.error('❌ Error: CRON_SECRET not found in .env.local');
  process.exit(1);
}

console.log(`🚀 Triggering Cron Job Check Deadlines locally...`);
console.log(`URL: ${LOCAL_URL}`);

async function triggerCron() {
  try {
    const response = await fetch(LOCAL_URL, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ Request Failed with status ${response.status}:`, data);
      return;
    }

    console.log(`✅ Success! Cron execution result:`);
    console.log(JSON.stringify(data, null, 2));

  } catch (error) {
    console.error('❌ Network error. Is your Next.js dev server running on port 3000?');
    console.error(error.message);
  }
}

triggerCron();
