# Verification evidence

This file tracks verified release evidence. Local test outcomes do not constitute onchain evidence.

| Deliverable | Status |
|---|---|
| Public GitHub repository and three public evidence SHAs | [Published main](https://github.com/alaminvyn/versionrelay-genlayer) and verified raw fixture bytes |
| Public Vercel production URL | [Production dashboard](https://versionrelay-genlayer.vercel.app/) verified in the browser and via unauthenticated HTTP |
| Evaluator and registry deployments and one-time binding | [Corrected registry transaction](https://scan.bradbury.genlayer.com/tx/0x7c0c48be8a6aebb4ae597577c8ad646841713aeb801f08ef661d10910b6c689e) submitted. Finality, evaluator and binding pending |
| APPROVED, BLOCKED, and UNRESOLVED receipts | Pending |
| Successful activation receipt and finalized registry state | Pending |

Bradbury identity was checked against the [official network configuration](https://docs.genlayer.com/developers/networks). The current [GitHub migration page](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10) was fetched and its HTML passed the local contract parser test.


## Public fixture commits

Each raw GitHub fixture was retrieved without authentication and matched its local Git blob byte for byte.

| Expected verdict | Immutable GitHub commit |
|---|---|
| APPROVED | [`3c895314cc78764c8b532d73450db66c596cc804`](https://github.com/alaminvyn/versionrelay-genlayer/blob/3c895314cc78764c8b532d73450db66c596cc804/evidence/rate-limit.json) |
| BLOCKED | [`2ece8efc57084a34d9ebd0632ecdf3fc78007b45`](https://github.com/alaminvyn/versionrelay-genlayer/blob/2ece8efc57084a34d9ebd0632ecdf3fc78007b45/evidence/rate-limit.json) |
| UNRESOLVED | [`680178045d0b7fbb4b2a577dd332ecea6c74e318`](https://github.com/alaminvyn/versionrelay-genlayer/blob/680178045d0b7fbb4b2a577dd332ecea6c74e318/evidence/rate-limit.json) |

## Bradbury preflight

The RPC matched the documented Phase 2 genesis, chain ID, and AddressManager. The legacy runner and a minimal control using that runner failed with `invalid_contract runner malformed`. The exact v0.3 pin obtained from [the finalized reference contract](https://scan.bradbury.genlayer.com/address/0x99C23e1794ed35b429161fBEB00967D0c81DC491) passed a control. With the same pin and v0.3 API corrections, both VersionRelay constructors passed unsigned GenVM execution. The pinned GenLayerJS SDK returned a constructor quote of 100000000000112941 wei. Quotes can change. Reproduce with `node scripts/check-bradbury.mjs`.

Separate unsigned GenVM probes retrieved the official GitHub page and classified the approved local fixture through strict equality. A separate unsigned probe encoded an internal activation message with `onAcceptance: false`. An unsigned end-to-end evaluator simulation fetched all three public commits from Bradbury GenVM. It returned APPROVED with one finalized-only child message, BLOCKED with no child message, and UNRESOLVED with no child message. Live validator consensus and child settlement remain pending.

Unsigned execution is preflight evidence. The signed registry [EVM envelope](https://scan.testnet-chain.genlayer.com/tx/0x1673ab1520a8e4e8f0f9176c5b1f54ca826ea2ea07c06b68ba85d259415d7cf8) has status `0x0` and zero logs. Both Phase 2 RPC gateways reproduce `PhaseTimeoutOutOfBounds(2000,30,600)` in unsigned gas estimation. The full ABI words decode to 2,000, 30, and 600. A fresh unsigned estimate passed at 300 for both leader and validator allocations, and the corrected registry transaction reached consensus admission. Deployment success and finality still require receipt verification.
