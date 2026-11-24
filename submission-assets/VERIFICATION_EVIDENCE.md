# Verification evidence

This file tracks verified release evidence. Local test outcomes do not constitute onchain evidence.

| Deliverable | Status |
|---|---|
| Public GitHub repository and three public evidence SHAs | Pending publication |
| Public Vercel production URL | Pending deployment |
| Evaluator and registry deployments and one-time binding | Pending wallet confirmation and finality |
| APPROVED, BLOCKED, and UNRESOLVED receipts | Pending |
| Successful activation receipt and finalized registry state | Pending |

Bradbury identity was checked against the [official network configuration](https://docs.genlayer.com/developers/networks). The current [GitHub migration page](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10) was fetched and its HTML passed the local contract parser test.


## Local fixture commits

These SHAs exist in the local Git repository. Their GitHub availability has not been established.

| Expected verdict | Local commit |
|---|---|
| APPROVED | `3c895314cc78764c8b532d73450db66c596cc804` |
| BLOCKED | `2ece8efc57084a34d9ebd0632ecdf3fc78007b45` |
| UNRESOLVED | `680178045d0b7fbb4b2a577dd332ecea6c74e318` |

## Bradbury preflight

The RPC returned the expected Phase 2 genesis and live fee policy, and its CORS preflight succeeded. Unsigned constructor simulations for both contracts and a minimal control failed in GenVM with `invalid_contract runner malformed`. The schema probe returned HTTP 522. There are no signed deployment or evaluation receipts.
