# Verification evidence

This file tracks verified release evidence. Local test outcomes do not constitute onchain evidence.

| Deliverable | Status |
|---|---|
| Public GitHub repository and three public evidence SHAs | [Published main](https://github.com/alaminvyn/versionrelay-genlayer) and verified raw fixture bytes |
| Public Vercel production URL | Pending deployment |
| Evaluator and registry deployments and one-time binding | Pending wallet confirmation and finality |
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

Unsigned execution is preflight evidence. There are no signed VersionRelay deployment or evaluation receipts yet.
