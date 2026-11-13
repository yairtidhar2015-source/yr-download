import { config } from './src/config.js';
import { createApp } from './src/app.js';
import { releaseStaleHolds } from './src/credits.js';
import { getProvider } from './src/ai/index.js';
import { paymentsInfo } from './src/payments/index.js';

const released = releaseStaleHolds(0); // nothing can be in flight at boot
if (released) console.log(`[credits] released ${released} unfinished credit hold(s) from a previous run`);
setInterval(() => releaseStaleHolds(15), 5 * 60_000).unref();

const app = createApp();
app.listen(config.port, () => {
  const ai = getProvider();
  const pay = paymentsInfo();
  console.log(`\n  SiteForge AI running at ${config.baseUrl}`);
  console.log(`  AI:       ${ai ? `${ai.label} (${ai.model})` : 'disabled – set ANTHROPIC_API_KEY'}`);
  console.log(`  Payments: ${pay.enabled ? (pay.testMode ? 'TEST MODE – no real money (configure PayPal for live payments)' : `${pay.provider}`) : 'disabled – configure PayPal (see README)'}\n`);
});
