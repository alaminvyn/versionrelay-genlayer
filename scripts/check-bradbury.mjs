import { abi, createClient } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'
import { readFile } from 'node:fs/promises'

const endpoint = 'https://rpc-bradbury.genlayer.com'
const client = createClient({ chain: testnetBradbury, endpoint })
const sender = '0x1111111111111111111111111111111111111111'
const zero = '0x0000000000000000000000000000000000000000'
const manager = '0x3F71AE080BD6270A91dBcc7960d88797828538E0'
const genesis = '0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4'

async function call(method, params) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
    signal: AbortSignal.timeout(18000),
  })
  if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`)
  const data = await response.json()
  if (data.error) {
    const returned = typeof data.error.data === 'string' ? Buffer.from(data.error.data, 'hex').toString() : ''
    const error = returned.match(/(?:invalid_contract|Traceback|TypeError|ValueError|AttributeError)[^\x00-\x1f]{0,120}/)?.[0]
    throw new Error(`${method}: ${error ?? data.error.message.slice(0, 180)}`)
  }
  return data.result
}

const [chain, block, managerCode, policy] = await Promise.all([
  call('eth_chainId', []),
  call('eth_getBlockByNumber', ['0x0', false]),
  call('eth_getCode', [manager, 'latest']),
  client.getCurrentFeePolicy(),
])
if (chain !== '0x107d' || block.hash !== genesis || managerCode.length < 4) throw new Error('Unexpected Bradbury network identity')

const probes = [
  ['registry', []],
  ['evaluator', [sender, 'alaminvyn/versionrelay-genlayer']],
]
for (const [name, args] of probes) {
  const code = await readFile(new URL(`../contracts/${name}.py`, import.meta.url), 'utf8')
  const calldata = abi.calldata.encode(abi.calldata.makeCalldataObject(undefined, args, undefined))
  const data = abi.transactions.serialize([code, calldata, false])
  const result = await call('gen_call', [{ type: 'deploy', from: sender, to: zero, data, status: 'finalized' }])
  if (result.status?.code !== 0) throw new Error(`${name}: ${result.status?.message ?? 'missing execution status'}`)
  console.log(`${name} constructor simulation passed`)
}
const quote = await client.estimateTransactionFees({ leaderTimeunitsAllocation: 2000n, validatorTimeunitsAllocation: 2000n })
if (policy.enabled && quote.feeValue <= 0n) throw new Error('Fee policy requires a nonzero deposit')
console.log(`Bradbury Phase 2 identity and constructor fee quote verified (${quote.feeValue} wei)`)
