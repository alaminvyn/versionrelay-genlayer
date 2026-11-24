import { StrictMode, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { address, client, connect, deployment, explorer, fees, finalizedSuccess, hash, read, readValue, setup, signer, source, submissionId, switchNetwork, wallet, type Active, type Config, type Fixture, type Hex, type Tx, type TxHash, type Verdict } from './network'
import { activationLabel, evaluationInput, friendly, releaseName, repositoryName, sha } from './workflow'
import registryCode from '../contracts/registry.py?raw'
import evaluatorCode from '../contracts/evaluator.py?raw'
import './style.css'

const reasons: Record<string, string> = {
  USES_RESOURCES_CORE: 'The adapter reads resources.core using the required API version.',
  USES_REMOVED_RATE: 'The adapter still reads the removed top-level rate field.',
  RESPONSE_PATH_UNCONFIRMED: 'The adapter does not specify a supported response path.',
  SOURCE_RULE_UNCONFIRMED: 'The official migration rule could not be confirmed.',
  REQUEST_UNCONFIRMED: 'The required request configuration could not be confirmed.',
  INVALID_ADAPTER: 'The evidence does not match the supported adapter format.',
  EVIDENCE_TOO_LARGE: 'The evidence exceeds the supported size.',
  SOURCE_TOO_LARGE: 'The official page exceeds the supported size.',
}
const shorten = (value: string) => value.length > 20 ? value.slice(0, 10) + '…' + value.slice(-7) : value
const txUrl = (value: string) => explorer + '/tx/' + value
const commitUrl = (repo: string, commit: string) => 'https://github.com/' + repo + '/commit/' + commit
type Tracked = { hash: TxHash; child?: TxHash; commit?: string; release?: string }
type Result = { receipt: Tx; action?: string; verdict?: Verdict | null; child?: TxHash; childReceipt?: Tx; childAction?: string; activation?: Active | null }
const trackKey = 'versionrelay.transaction'
function saved(): Tracked | null {
  try {
    const data = JSON.parse(localStorage.getItem(trackKey) || 'null')
    return data && hash(data.hash) ? data : null
  } catch { return null }
}
function Link({ href, children }: { href: string; children: ReactNode }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}<span aria-hidden="true" className="external">↗</span></a>
}
function Badge({ value }: { value: string }) {
  return <span className={'badge ' + value.toLowerCase()}>{value.replaceAll('_', ' ')}</span>
}
const milestones = [
  { title: 'Legacy response', key: 'rate', description: 'GitHub REST 2022-11-28 exposes the legacy top-level field.' },
  { title: 'Consensus review', key: 'Document + commit', description: 'GenLayer validators independently check the official migration rule against a pinned adapter.' },
  { title: 'Target response', key: 'resources.core', description: 'The 2026-03-10 migration reads the new path. A finalized approval can publish a release to the registry.' },
]
function Gate() {
  const [stage, setStage] = useState(1)
  const selected = milestones[stage]
  return <div className="migration">
    <div className="blueprint" data-stage={stage}>
      <div className="diagram-label"><span>GITHUB REST API</span><span>GET /rate_limit</span></div>
      <svg viewBox="0 0 640 340" className="diagram" aria-hidden="true">
        <defs><pattern id="blueprint-grid" width="32" height="32" patternUnits="userSpaceOnUse"><path d="M32 0H0V32" fill="none" stroke="#ddd6fe" strokeOpacity=".14"/></pattern></defs>
        <path d="M25 24H615V316H25Z" fill="url(#blueprint-grid)" stroke="#ddd6fe" strokeOpacity=".25"/>
        <path className="guide" d="M25 170H615M320 24V316M68 247 566 93M68 93 566 247"/>
        <path className="connection" d="M151 204 320 152 489 100M151 230 320 178 489 126"/>
        <g className="layer layer-old">
          <path d="m71 181 104-32 79 28-104 33Z"/><path d="m71 181 79 29v50l-79-29Z"/><path d="m150 210 104-33v50l-104 33Z"/>
        </g>
        <g className="layer layer-review">
          <path d="m224 137 105-32 79 28-105 33Z"/><path d="m224 137 79 29v73l-79-29Z"/><path d="m303 166 105-33v73l-105 33Z"/>
        </g>
        <g className="layer layer-target">
          <path d="m378 94 105-32 79 28-105 33Z"/><path d="m378 94 79 29v50l-79-29Z"/><path d="m457 123 105-33v50l-105 33Z"/>
        </g>
        <path className="guide" d="M71 242v49h84m407-148v51h41M320 242v49"/>
        <circle cx="71" cy="291" r="3" fill="#F2AC78"/><circle cx="603" cy="194" r="3" fill="#DDD6FE"/>
      </svg>
    </div>
    <div className="timeline" role="group" aria-label="Explore the migration timeline">
      {['2022-11-28', 'Verification', '2026-03-10'].map((label, index) =>
        <button key={label} type="button" aria-pressed={stage === index} onClick={() => setStage(index)}><span/>{label}</button>
      )}
    </div>
    <div className="timeline-detail" aria-live="polite">
      <div><strong>{selected.title}</strong><code>{selected.key}</code></div>
      <p>{selected.description}</p>
    </div>
  </div>
}
async function getResult(tracked: Tracked, registry: Hex | '', evaluator: Hex | '', repository: string): Promise<Result> {
  const receipt = await client.getTransaction({ hash: tracked.hash })
  const protocol = await client.advanced.getTransactionLifecycle({ hash: tracked.hash }).catch(() => null)
  const result: Result = { receipt, action: protocol?.resolutionAction }
  if (!finalizedSuccess(receipt) || !evaluator || receipt.recipient?.toLowerCase() !== evaluator.toLowerCase()) return result
  const decoded = receipt.txDataDecoded
  const input = decoded && 'callData' in decoded ? evaluationInput(decoded.callData) : null
  if (!input || (tracked.commit && tracked.commit !== input.commit) || (tracked.release && tracked.release !== input.release)) return result
  const id = await submissionId(repository, input.commit, input.release)
  result.verdict = await read<Verdict>(evaluator, 'submission', [id])
  if (result.verdict?.verdict !== 'APPROVED' || !registry) return result
  const lookup = { hash: tracked.hash, fromBlock: BigInt(receipt.readStateBlockRange?.activationBlock || 0) }
  const child = tracked.child || (await client.getTriggeredTransactionIds(lookup))[0]
  if (!child) return result
  const childReceipt = await client.getTransaction({ hash: child })
  const childData = childReceipt.txDataDecoded
  const call = childData && 'callData' in childData ? childData.callData : null
  if (childReceipt.recipient?.toLowerCase() !== registry.toLowerCase() ||
      childReceipt.sender?.toLowerCase() !== evaluator.toLowerCase() ||
      !(call instanceof Map) || call.get('') !== 'activate' || call.get('args')?.[0] !== id) return result
  result.child = child
  result.childReceipt = childReceipt
  const childProtocol = await client.advanced.getTransactionLifecycle({ hash: child }).catch(() => null)
  result.childAction = childProtocol?.resolutionAction
  if (finalizedSuccess(childReceipt)) result.activation = await read<Active>(registry, 'activation', [id])
  return result
}
function ResultCard({ result, tracked, finalize }: { result: Result | null; tracked: Tracked; finalize?: (h: TxHash) => void }) {
  return <div className="result">
    <div className="row"><strong>Evaluation transaction</strong><Link href={txUrl(tracked.hash)}>{shorten(tracked.hash)}</Link></div>
    {result && <>
      <div className="row"><span>Consensus status</span><Badge value={result.receipt.statusName || "UNKNOWN"}/></div>
      <div className="row"><span>Execution</span><span>{result.receipt.txExecutionResultName?.replaceAll('_', ' ') || 'Awaiting receipt'}</span></div>
      {result.action === 'Finalize' && finalize && <button className="button secondary" onClick={() => finalize(tracked.hash)}>Finalize evaluation</button>}
      {result.verdict && <>
        <div className="row"><span>Migration verdict</span><Badge value={result.verdict.verdict}/></div>
        <p>{reasons[result.verdict.reason] || result.verdict.reason}</p>
        <details><summary>Evidence fingerprints</summary><dl>
          <dt>Evaluation ID</dt><dd>{result.verdict.id}</dd><dt>Normalized source SHA-256</dt><dd>{result.verdict.sourceDigest || 'Unavailable'}</dd>
          <dt>Evidence SHA-256</dt><dd>{result.verdict.evidenceDigest}</dd>
        </dl></details>
        <div className="row"><span>Activation</span><strong>{activationLabel(result.verdict.verdict, !!result.activation, result.childReceipt?.statusName === 'FINALIZED')}</strong></div>
      </>}
      {result.child && <div className="row"><span>Registry transaction</span><Link href={txUrl(result.child)}>{shorten(result.child)}</Link></div>}
      {result.childAction === 'Finalize' && result.child && finalize && <button className="button secondary" onClick={() => finalize(result.child!)}>Finalize activation</button>}
    </>}
  </div>
}
function App() {
  const [account, setAccount] = useState<Hex | ''>('')
  const [repo, setRepo] = useState(deployment.repository)
  const [registryInput, setRegistry] = useState(deployment.registry)
  const [evaluatorInput, setEvaluator] = useState(deployment.evaluator)
  const registry = address(registryInput) ? registryInput : ''
  const evaluator = address(evaluatorInput) ? evaluatorInput : ''
  const [configuration, setConfiguration] = useState<Config | null>(null)
  const [active, setActive] = useState<Active | null>(null)
  const [readError, setReadError] = useState('')
  const [commit, setCommit] = useState('')
  const [release, setRelease] = useState('')
  const [recover, setRecover] = useState('')
  const [tracked, setTracked] = useState<Tracked | null>(saved)
  const [result, setResult] = useState<Result | null>(null)
  const [recent, setRecent] = useState<Verdict[]>([])
  const [cases, setCases] = useState<Record<string, Result>>({})
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const [receiptError, setReceiptError] = useState('')
  const [pendingSince, setPendingSince] = useState(Date.now)
  const [retry, setRetry] = useState(0)
  const [setupHash, setSetupHash] = useState<TxHash | ''>(() => { const value = setup ? localStorage.getItem('versionrelay.setupHash') || '' : ''; return hash(value) ? value : '' })
  const [setupReceipt, setSetupReceipt] = useState<Tx | null>(null)
  const repository = configuration?.repository || repo
  const isOwner = Boolean(account && configuration?.owner.toLowerCase() === account.toLowerCase())
  const bound = Boolean(evaluator && active?.evaluator.toLowerCase() === evaluator.toLowerCase())

  useEffect(() => {
    const provider = wallet()
    const change = () => setAccount('')
    provider?.on?.('accountsChanged', change)
    return () => { provider?.removeListener?.('accountsChanged', change) }
  }, [])
  useEffect(() => {
    if (!registry || !evaluator) return
    let alive = true
    async function tick() {
      try {
        const [state, config, records] = await Promise.all([
          read<Active>(registry as Hex, 'active'), read<Config>(evaluator as Hex, 'configuration'), readValue(evaluator as Hex, 'recent'),
        ])
        if (!config || config.registry.toLowerCase() !== registry.toLowerCase() || !repositoryName(config.repository)) {
          throw new Error('Onchain evaluator configuration does not match this registry.')
        }
        if (!alive) return
        setActive(state)
        setConfiguration(config)
        setRecent(Array.isArray(records) ? records.flatMap(record => typeof record === 'string' ? [JSON.parse(record) as Verdict] : []) : [])
        setReadError('')
      } catch (error) { if (alive) setReadError(friendly(error)) }
    }
    void tick()
    const id = setInterval(tick, 12000)
    return () => { alive = false; clearInterval(id) }
  }, [registry, evaluator, retry])
  useEffect(() => {
    if (!tracked) return
    let alive = true
    let timer: ReturnType<typeof setTimeout>
    async function tick() {
      try {
        const next = await getResult(tracked!, registry, evaluator, repository)
        if (alive) { setResult(next); setReceiptError('') }
      } catch (error) {
        if (alive) setReceiptError(Date.now() - pendingSince > 60000 ? 'Receipt polling timed out. You can resume using the transaction hash.' : friendly(error))
      }
      if (alive) timer = setTimeout(tick, 8000)
    }
    void tick()
    return () => { alive = false; clearTimeout(timer) }
  }, [tracked, registry, evaluator, repository, pendingSince, retry])
  useEffect(() => {
    if (!registry || !evaluator || !repository) return
    let alive = true
    Promise.allSettled(deployment.cases.map(async item => {
      const value = await getResult(item, registry, evaluator, repository)
      if (alive) setCases(previous => ({ ...previous, [item.hash]: value }))
    }))
    return () => { alive = false }
  }, [registry, evaluator, repository, retry])
  useEffect(() => {
    if (!setupHash) return
    let alive = true
    const poll = () => client.getTransaction({ hash: setupHash }).then(tx => { if (alive) setSetupReceipt(tx) }).catch(() => {})
    void poll()
    const id = setInterval(poll, 7000)
    return () => { alive = false; clearInterval(id) }
  }, [setupHash])
  async function run(task: () => Promise<void>) {
    setBusy(true)
    setMessage('')
    try { await task() } catch (error) { setMessage(friendly(error)) } finally { setBusy(false) }
  }
  function track(value: Tracked) {
    localStorage.setItem(trackKey, JSON.stringify(value))
    setResult(null)
    setReceiptError('')
    setPendingSince(Date.now())
    setTracked(value)
  }
  function pick(item: Fixture) { setCommit(item.commit); setRelease(item.release) }
  function submit(event: FormEvent) {
    event.preventDefault()
    if (!sha(commit) || !releaseName(release) || !account || !evaluator || !registry || !bound || !isOwner) return
    void run(async () => {
      const signed = await signer(account)
      const quote = await fees(account, registry)
      setMessage('Awaiting wallet confirmation.')
      const tx = await signed.writeContract({ address: evaluator, functionName: 'evaluate', args: [commit, release], fees: quote })
      if (!hash(tx)) throw new Error('The SDK did not return a valid transaction hash.')
      track({ hash: tx, commit, release })
      setMessage('Evaluation submitted.')
    })
  }
  function finalize(tx: TxHash) {
    void run(async () => {
      if (!account) throw new Error('Connect a wallet to confirm finalization.')
      const signed = await signer(account)
      setMessage('Awaiting wallet confirmation.')
      const receiptHash = await signed.finalizeTransaction({ txId: tx })
      setMessage('Finalization submitted. ' + receiptHash)
    })
  }
  function deploy(step: 'registry' | 'evaluator' | 'bind') {
    void run(async () => {
      if (!account) throw new Error('Connect the owner wallet.')
      if (step !== 'registry' && !registry) throw new Error('Enter the finalized registry address.')
      if (step === 'evaluator' && !repositoryName(repo)) throw new Error('Enter the approved GitHub repository.')
      if (step === 'bind' && !evaluator) throw new Error('Enter the finalized evaluator address.')
      const signed = await signer(account)
      const quote = await fees(account)
      setMessage('Awaiting wallet confirmation.')
      const tx = step === 'bind' ? await signed.writeContract({ address: registry as Hex, functionName: 'bind_evaluator', args: [evaluator], fees: quote }) :
        await signed.deployContract({ code: step === 'registry' ? registryCode : evaluatorCode, args: step === 'registry' ? [] : [registry, repo], fees: quote })
      setSetupReceipt(null)
      if (!hash(tx)) throw new Error("The SDK did not return a valid setup hash.")
      setSetupHash(tx)
      localStorage.setItem('versionrelay.setupHash', tx)
      setMessage('Setup transaction submitted.')
    })
  }
  return <>
    <a className="skip" href="#workspace">Skip to workspace</a>
    <header className="site-header"><nav className="shell navigation" aria-label="Main navigation">
      <a className="brand" href="#"><img src="/brand/logo.svg" alt=""/><span>VersionRelay</span></a>
      <div className="navlinks"><a href="#workspace">Workspace</a><a href="#registry">Registry</a></div>
      <button className="button wallet" disabled={busy} onClick={() => account ? setAccount('') : run(async () => setAccount(await connect()))}>{account ? 'Disconnect ' + shorten(account) : 'Connect wallet'}</button>
    </nav></header>
    <main className="shell">
      <section className="hero">
        <div className="hero-intro"><p className="eyebrow">API MIGRATION VERIFICATION</p><h1>Change with <em>confidence.</em></h1>
          <p className="hero-copy">Verify migration evidence through GenLayer consensus before activating a new API version.</p>
          <div className="actions"><a className="button primary" href="#workspace">Verify a migration</a><a className="button secondary" href="#registry">Explore migration cases</a></div>
        </div><Gate/>
      </section>
      <div className="networkbar"><span><span className="line-dot"/> Bradbury Phase 2 <b>·</b> Chain 4221</span><span>Active release <strong>{active?.release || (registry ? 'Awaiting registry read' : 'Deployment pending')}</strong></span></div>
      {message && <p className="notice" aria-live="polite">{message}</p>}
      {setup && <section className="panel setup"><h2>Owner deployment</h2><p>Deploy the registry, finalize it, deploy the evaluator, finalize it, then bind the evaluator once.</p>
        <label>Approved GitHub repository<input value={repo} onChange={e => setRepo(e.target.value)}/></label>
        <label>Registry address<input value={registryInput} onChange={e => setRegistry(e.target.value)}/></label>
        <label>Evaluator address<input value={evaluatorInput} onChange={e => setEvaluator(e.target.value)}/></label>
        <div className="actions"><button disabled={busy} onClick={() => deploy('registry')}>Deploy registry</button><button disabled={busy} onClick={() => deploy('evaluator')}>Deploy evaluator</button><button disabled={busy} onClick={() => deploy('bind')}>Bind evaluator</button></div>
        {setupHash && <p><Link href={txUrl(setupHash)}>{setupHash}</Link> {setupReceipt?.statusName} {setupReceipt?.recipient || setupReceipt?.to_address}</p>}
        {setupHash && <button disabled={busy} onClick={() => finalize(setupHash)}>Request finalization</button>}
      </section>}
      <section id="workspace" className="section">
        <div className="section-heading"><div><p className="eyebrow">WORKSPACE</p><h2>Verify a migration</h2></div><span className="technical">GITHUB REST / 2026-03-10</span></div>
        <div className="workspace">
          <form className="panel" onSubmit={submit}>
            <h3>Implementation evidence</h3>
            <p>Choose an immutable commit from the approved repository and name the integration release.</p>
            <label>Evidence repository<input value={repository || 'Awaiting deployment'} readOnly/></label>
            <label>Git commit SHA<input autoComplete="off" spellCheck={false} value={commit} onChange={e => setCommit(e.target.value.trim())} placeholder="40 lowercase hexadecimal characters" aria-invalid={!!commit && !sha(commit)}/></label>
            {commit && !sha(commit) && <small className="error">Enter the full 40-character commit SHA.</small>}
            <label>Target integration release<input value={release} onChange={e => setRelease(e.target.value)} placeholder="e.g. adapter-2.0" aria-invalid={!!release && !releaseName(release)}/></label>
            {release && !releaseName(release) && <small className="error">Use 1–32 letters, digits, dots, underscores, or hyphens. Start with a letter or digit.</small>}
            {!!deployment.fixtures.length && <div className="chips">{deployment.fixtures.map(item => <button type="button" key={item.commit} onClick={() => pick(item)}>{item.label}</button>)}</div>}
            <div className="actions"><button className="button primary" disabled={busy || !sha(commit) || !releaseName(release) || !bound || !isOwner}>Verify evidence</button>
            {account && <button type="button" className="button secondary" disabled={busy} onClick={() => run(switchNetwork)}>Switch to Bradbury</button>}</div>
            <small>{!bound ? 'Verification is unavailable until the evaluator is connected to the registry.' : isOwner ? 'Verification opens a wallet confirmation for a Bradbury transaction.' : 'Only the authorized wallet can run evaluations. Results are public.'}</small>
          </form>
          <aside className="panel evidence">
            <p className="eyebrow">EVIDENCE INSPECTOR</p><h3>One field changes the release.</h3>
            <p>Version <code>2026-03-10</code> removes the top-level <code>rate</code> property from <code>GET /rate_limit</code>.</p>
            <div className="rule"><div><span>Removed</span><code>rate</code></div><div><span>Required</span><code>resources.core</code></div></div>
            <Link href={source}>Official migration requirement</Link>
            {repositoryName(repository) && sha(commit) && <Link href={commitUrl(repository, commit)}>Pinned GitHub commit</Link>}
            <p className="muted">Validators retrieve the official rule and the adapter at the pinned commit. The contract records their agreed verdict and evidence fingerprints.</p>
          </aside>
        </div>
        <div className="panel lifecycle"><div><h3>Transaction activity</h3><p>Inspect a GenLayer receipt after refresh or from another browser.</p></div>
          <form className="actions recovery" onSubmit={e => {
            e.preventDefault()
            if (hash(recover)) track(deployment.cases.find(item => item.hash === recover) || (tracked?.hash === recover ? tracked : { hash: recover }))
          }}><label><span className="sr-only">Transaction hash</span><input value={recover} onChange={e => setRecover(e.target.value.trim())} placeholder="0x transaction hash"/></label><button className="button secondary" disabled={!hash(recover)}>Inspect receipt</button></form>
          {receiptError && <p role="status">{receiptError} <button onClick={() => { setPendingSince(Date.now()); setRetry(retry + 1) }}>Retry</button></p>}
          {tracked && <ResultCard tracked={tracked} result={result} finalize={account ? finalize : undefined}/>}
        </div>
      </section>
      <section id="registry" className="section">
        <div className="section-heading"><div><p className="eyebrow">ONCHAIN REGISTRY</p><h2>Verified migration cases</h2></div><span className="technical">PUBLIC READ ACCESS</span></div>
        <div className="panel">
          <div className="row"><strong>Active integration release</strong><span>{active?.release || (bound ? 'No release activated' : 'Registry unavailable')}</span></div>
          {active?.id && <div className="row"><span>Active evaluation</span><code title={active.id}>{shorten(active.id)}</code></div>}
          {registry && <Link href={explorer + '/address/' + registry}>Activation registry</Link>}
          {evaluator && <Link href={explorer + '/address/' + evaluator}>Migration evaluator</Link>}
          {readError && <p role="status">{readError} <button onClick={() => setRetry(retry + 1)}>Retry</button></p>}
          {!deployment.cases.length && !recent.length && <p className="muted">No finalized migration cases yet.</p>}
          {recent.filter(item => !deployment.cases.some(entry => entry.commit === item.commit && entry.release === item.release)).map(item =>
            <article className="case" key={item.id}>
              <div className="row"><h3>{item.release}</h3><Badge value={item.verdict}/></div>
              <p>{reasons[item.reason] || item.reason}</p>
              <p><code title={item.id}>{shorten(item.id)}</code> · {active?.id === item.id ? 'Active release' : 'Recorded evaluation'}</p>
              {sha(item.commit) && <Link href={commitUrl(repository, item.commit)}>Pinned evidence commit</Link>}
            </article>)}
          {deployment.cases.map(item => <article key={item.hash} className="case"><h3>{item.label}</h3>
            {repositoryName(repository) && <Link href={commitUrl(repository, item.commit)}>Pinned evidence commit</Link>}<ResultCard tracked={item} result={cases[item.hash] || null}/></article>)}
        </div>
      </section>
    </main>
    <footer className="shell"><span className="brand"><img src="/brand/logo.svg" alt=""/>VersionRelay</span></footer>
  </>
}
createRoot(document.getElementById('root')!).render(<StrictMode><App/></StrictMode>)
