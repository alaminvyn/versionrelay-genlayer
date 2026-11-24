import { abi, createClient, deriveInternalMessageCallKey, encodeInternalMessageFeeParams, isSuccessful, MessageType } from 'genlayer-js'
import { testnetBradbury } from 'genlayer-js/chains'
import settings from './deployment.json'

export type TxHash = Parameters<ReturnType<typeof createClient>["getTransaction"]>[0]["hash"]
export type Hex = `0x${string}`
export type Provider = NonNullable<NonNullable<Parameters<typeof createClient>[0]>['provider']>
export const RPC = 'https://rpc-bradbury.genlayer.com'
export const explorer = 'https://scan.bradbury.genlayer.com'
export const source = 'https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10'
export const manager = '0x3F71AE080BD6270A91dBcc7960d88797828538E0'
const genesis = '0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4'
export const address = (s: string): s is Hex => /^0x[\da-f]{40}$/i.test(s) && !/^0x0{40}$/.test(s)
export const hash = (s: string): s is TxHash => /^0x[\da-f]{64}$/i.test(s)
export type Fixture = { commit: string; release: string; label: string }
export type Case = Fixture & { hash: TxHash; child?: TxHash }
export const deployment = settings as { repository: string; registry: string; evaluator: string; cases: Case[]; fixtures: Fixture[] }
export const setup = new URLSearchParams(location.search).has('setup') && import.meta.env.DEV
export const client = createClient({ chain: testnetBradbury, endpoint: RPC })

export type Verdict = { id: string; commit: string; release: string; verdict: string; reason: string; repository: string; sourceDigest: string; evidenceDigest: string }
export type Active = { id: string; release: string; sequence: number; evaluator: string }
export type Config = { owner: string; registry: string; repository: string }
export type Tx = Awaited<ReturnType<typeof client.getTransaction>>

export async function rpc<T>(method: string, params: unknown[]) {
  const response = await fetch(RPC, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }), signal: AbortSignal.timeout(12000),
  })
  if (!response.ok) throw new Error(`Bradbury RPC returned HTTP ${response.status}.`)
  const data = await response.json()
  if (data.error) {
    const revert = data.error.data
    if (typeof revert === 'string' && /^0xdb0c8dfe[0-9a-f]{192}$/i.test(revert)) {
      const [value, min, max] = revert.slice(10).match(/.{64}/g)!.map(word => BigInt('0x' + word))
      throw new Error(`Bradbury rejected phase allocation ${value}. The allowed range is ${min}–${max}.`)
    }
    throw new Error(data.error.message)
  }
  return data.result as T
}
async function verifyNetwork() {
  const [chain, block, code] = await Promise.all([
    rpc<string>('eth_chainId', []),
    rpc<{ hash: string }>('eth_getBlockByNumber', ['0x0', false]),
    rpc<string>('eth_getCode', [manager, 'latest']),
  ])
  if (chain !== '0x107d' || block.hash !== genesis || !/^0x[\da-f]{2,}$/i.test(code)) {
    throw new Error('RPC identity does not match Bradbury Phase 2.')
  }
}
export const wallet = () => (window as Window & { ethereum?: Provider }).ethereum
export async function connect() {
  const provider = wallet()
  if (!provider) throw new Error('Open this page in a browser with an EIP-1193 wallet.')
  const accounts = await provider.request({ method: 'eth_requestAccounts' }) as string[]
  if (!accounts[0] || !address(accounts[0])) throw new Error('The wallet did not return an account.')
  return accounts[0]
}
export async function switchNetwork() {
  const provider = wallet()
  if (!provider) throw new Error('Connect an EIP-1193 wallet first.')
  const params = [{ chainId: '0x107d' }]
  try {
    await provider.request({ method: 'wallet_switchEthereumChain', params })
  } catch (error) {
    if ((error as { code?: number }).code !== 4902) throw error
    await provider.request({ method: 'wallet_addEthereumChain', params: [{ ...params[0], chainName: 'GenLayer Bradbury', nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 }, rpcUrls: [RPC], blockExplorerUrls: ['https://scan.testnet-chain.genlayer.com'] }] })
    await provider.request({ method: 'wallet_switchEthereumChain', params })
  }
}
export async function signer(account: Hex) {
  const provider = wallet()
  if (!provider) throw new Error('Connect a wallet first.')
  if (await provider.request({ method: 'eth_chainId' }) !== '0x107d') throw new Error('Switch your wallet to Bradbury Phase 2.')
  const block = await provider.request({ method: 'eth_getBlockByNumber', params: ['0x0', false] }) as { hash: string } | null
  if (block?.hash !== genesis) throw new Error('Your wallet RPC points to a different Bradbury deployment.')
  await verifyNetwork()
  const checkedProvider: Provider = {
    request: async (request: Parameters<Provider['request']>[0]) => {
      if (request.method === 'eth_sendTransaction') {
        const envelope = Array.isArray(request.params) ? request.params[0] : undefined
        if (!envelope || typeof envelope !== 'object') throw new Error('Missing transaction envelope.')
        const { from, to, data, value, gas } = envelope as Record<string, string | undefined>
        const required = await rpc<string>('eth_estimateGas', [{ from, to, data, value }])
        if (gas && BigInt(gas) < BigInt(required)) throw new Error('The proposed gas limit is below the network estimate.')
      }
      return provider.request(request)
    },
  }
  return createClient({ chain: testnetBradbury, endpoint: RPC, provider: checkedProvider, account })
}
export async function fees(account: Hex, registry?: Hex) {
  const childQuote = registry ? await client.estimateTransactionFees({ leaderTimeunitsAllocation: 300n, validatorTimeunitsAllocation: 300n }) : undefined
  // The live Bradbury admission policy bounds phase allocations to 30–600.
  const child = registry && childQuote?.policy.enabled ? [{
    messageType: MessageType.Internal, onAcceptance: false, recipient: registry,
    callKey: deriveInternalMessageCallKey('activate'),
    budget: childQuote.feeValue,
    feeParams: encodeInternalMessageFeeParams(childQuote.distribution),
  }] : undefined
  const quote = await client.estimateTransactionFees({
    leaderTimeunitsAllocation: 300n,
    validatorTimeunitsAllocation: 300n,
    messageAllocations: child,
  })
  const balance = await rpc<string>('eth_getBalance', [account, 'latest'])
  if (BigInt(balance) <= quote.feeValue) throw new Error('Insufficient testnet GEN for the fee deposit and wallet gas.')
  return { distribution: quote.distribution, feeValue: quote.feeValue, messageAllocations: quote.messageAllocations }
}
export async function read<T>(contract: Hex, method: string, args: string[] = []) {
  const value = await readValue(contract, method, args)
  return typeof value === 'string' && value ? JSON.parse(value) as T : null
}
export async function readValue(contract: Hex, method: string, args: string[] = []) {
  const payload = abi.transactions.serialize([abi.calldata.encode(abi.calldata.makeCalldataObject(method, args, undefined)), false])
  const call = await rpc<{ data: string; status: { code: number; message: string } }>('gen_call', [{
    from: '0x0000000000000000000000000000000000000000', to: contract, type: 'read', data: payload, status: 'finalized',
  }])
  if (call.status && call.status.code !== 0) throw new Error(call.status.message)
  const encoded = call.data.replace(/^0x/, '')
  return abi.calldata.decode(Uint8Array.from(encoded.match(/../g) || [], x => parseInt(x, 16)))
}
export const finalizedSuccess = (receipt: Tx) => receipt.statusName === 'FINALIZED' && isSuccessful(receipt)
export async function submissionId(repository: string, commit: string, release: string) {
  const bytes = new TextEncoder().encode(`github-rate-limit/v1|${repository}|${commit}|${release}`)
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('')
}
