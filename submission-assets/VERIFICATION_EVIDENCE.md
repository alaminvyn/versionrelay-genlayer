# Verification evidence

This file tracks verified release evidence. Local test outcomes do not constitute onchain evidence.

| Deliverable | Status |
|---|---|
| Public GitHub repository and three public evidence SHAs | [Published main](https://github.com/alaminvyn/versionrelay-genlayer) and verified raw fixture bytes |
| Public Vercel production URL | [Production dashboard](https://versionrelay-genlayer.vercel.app/) verified in the browser and via unauthenticated HTTP |
| Activation registry | [`0x1fFC6D2C96853afC1B44CF8546E40ab793234E1e`](https://scan.bradbury.genlayer.com/address/0x1fFC6D2C96853afC1B44CF8546E40ab793234E1e) · deployment [0x7c0c48be…](https://scan.bradbury.genlayer.com/tx/0x7c0c48be8a6aebb4ae597577c8ad646841713aeb801f08ef661d10910b6c689e) |
| Migration evaluator | [`0x67f9c377A78452A27Fa45dd6625da8B296AaeC8d`](https://scan.bradbury.genlayer.com/address/0x67f9c377A78452A27Fa45dd6625da8B296AaeC8d) · deployment [0xf857ada8…](https://scan.bradbury.genlayer.com/tx/0xf857ada8f005a82f8342330c9e823fec30c3e8dc6e9691e578cace33d7a430e2) |
| One-time binding | [0x858b0848…](https://scan.bradbury.genlayer.com/tx/0x858b0848533579eff7e810b3c133131f0c89d38b74529a100df61fd807f31695) · finalized and verified against registry state |
| APPROVED | [0xcd8c4cc0…](https://scan.bradbury.genlayer.com/tx/0xcd8c4cc0fe699904ef2f7b55121f5a4a15f41341b416550f4bb922b9c025cec6) · FINALIZED / FINISHED_WITH_RETURN |
| BLOCKED | [0x02a3d501…](https://scan.bradbury.genlayer.com/tx/0x02a3d501ff57d287020e0681b481b5c6eec71deaa1e1fd5432208468ee7b2129) · FINALIZED / FINISHED_WITH_RETURN |
| UNRESOLVED | [0x6cd31f1e…](https://scan.bradbury.genlayer.com/tx/0x6cd31f1e3b0e0d804e08bc56b68be4b582be33d859179ec84ca39bb9914ba8d5) · FINALIZED / FINISHED_WITH_RETURN |
| Activation | [0x6266a666…](https://scan.bradbury.genlayer.com/tx/0x6266a6660d672e1d8f901a2a08000ec6e84cde587185702285df6f3b9069a592) · FINALIZED / FINISHED_WITH_RETURN |
| Finalized registry state | Active release `adapter-approved`, sequence 1, evaluation `51cee07a6ed62ed9d4c7cd26caefcd5c96508726f76f75d19f58d71d58a099cc` |

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

Separate unsigned GenVM probes retrieved the official GitHub page and classified the approved local fixture through strict equality. A separate unsigned probe encoded an internal activation message with `onAcceptance: false`. An unsigned end-to-end evaluator simulation fetched all three public commits from Bradbury GenVM. It returned APPROVED with one finalized-only child message, BLOCKED with no child message, and UNRESOLVED with no child message. Subsequent signed evaluations and registry activation are recorded in the table above. Independent finalized registry reads returned no activation record for BLOCKED or UNRESOLVED.

Unsigned execution is preflight evidence. The signed registry [EVM envelope](https://scan.testnet-chain.genlayer.com/tx/0x1673ab1520a8e4e8f0f9176c5b1f54ca826ea2ea07c06b68ba85d259415d7cf8) has status `0x0` and zero logs. Both Phase 2 RPC gateways reproduce `PhaseTimeoutOutOfBounds(2000,30,600)` in unsigned gas estimation. The full ABI words decode to 2,000, 30, and 600. A fresh unsigned estimate passed at 300 for both leader and validator allocations, and the corrected registry transaction reached consensus admission. The corrected registry, evaluator, and one-time binding receipts are finalized and executed successfully.
