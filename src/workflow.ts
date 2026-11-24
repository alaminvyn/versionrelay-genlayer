export const sha = (s: string) => /^[a-f0-9]{40}$/.test(s)
export const releaseName = (s: string) => /^[a-z0-9][a-z0-9._-]{0,31}$/i.test(s)
export const repositoryName = (s: string) => /^[a-z0-9][a-z0-9-]{0,38}\/versionrelay-genlayer$/i.test(s)

export function evaluationInput(decoded: unknown) {
  const calldata = decoded instanceof Map ? decoded : null
  if (calldata?.get('') !== 'evaluate') return null
  const args: unknown = calldata.get('args')
  if (!Array.isArray(args) || args.length !== 2 || typeof args[0] !== 'string' || typeof args[1] !== 'string') return null
  return sha(args[0]) && releaseName(args[1]) ? { commit: args[0], release: args[1] } : null
}

export function activationLabel(verdict: string, activation: boolean, childFinalized: boolean) {
  if (activation) return 'Finalized and verified'
  if (verdict !== 'APPROVED') return 'Not authorized'
  return childFinalized ? 'Finalized without verified activation' : 'Awaiting registry settlement'
}

export function friendly(error: unknown) {
  if ((error as { code?: number })?.code === 4001 || /user rejected|user denied/i.test(String(error))) return 'Wallet request rejected. You can retry when ready.'
  return error instanceof Error ? error.message : String(error)
}
