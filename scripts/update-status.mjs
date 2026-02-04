import fs from 'node:fs/promises';

const WALLET = process.env.SOLANA_WALLET || 'A6gXuYpNZmpcfDkT8mv4PR8JYaNtXJqQtArcL2XpVeXK';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://rpc.ankr.com/solana';

async function rpc(method, params) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.error) {
    const msg = data?.error?.message || `${res.status} ${res.statusText}`;
    throw new Error(`RPC ${method} failed: ${msg}`);
  }
  return data.result;
}

function isoNow() {
  return new Date().toISOString();
}

async function main() {
  const statusPath = new URL('../status.json', import.meta.url);
  let status = {};
  try {
    status = JSON.parse(await fs.readFile(statusPath, 'utf8'));
  } catch {
    status = {};
  }

  let walletSol = null;
  try {
    const result = await rpc('getBalance', [WALLET]);
    const lamports = result?.value;
    if (typeof lamports === 'number') walletSol = lamports / 1e9;
  } catch (e) {
    // don't fail the whole job; keep walletSol null
    status.wallet_error = String(e.message || e);
  }

  status.wallet_address = WALLET;
  if (walletSol !== null) {
    status.wallet_sol = Number(walletSol.toFixed(6));
    delete status.wallet_error;
  }
  status.updated_at = isoNow();

  await fs.writeFile(statusPath, JSON.stringify(status, null, 2) + '\n', 'utf8');

  // also ensure agents.json exists (optional)
  const agentsPath = new URL('../agents.json', import.meta.url);
  try {
    await fs.access(agentsPath);
  } catch {
    await fs.writeFile(agentsPath, JSON.stringify({ agents: ['TidakMungkinAI'] }, null, 2) + '\n', 'utf8');
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
