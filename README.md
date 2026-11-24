# VersionRelay

<img src="public/brand/logo.svg" alt="VersionRelay mark" width="72">

**Change with confidence.** Verify migration evidence through GenLayer consensus before activating a new API version.

When an API removes a response field, a release owner needs to know which pinned change satisfies the migration rule. VersionRelay checks the versioned provider documentation and a GitHub adapter at an immutable commit. Its evaluator records a consensus verdict. A separate registry records activation after a finalized approval.

The migration timeline lets readers compare the original response, independent evidence review, and target response. [Desktop preview](submission-assets/previews/desktop.jpg) · [Mobile preview](submission-assets/previews/mobile.jpg)

## Supported migration

GitHub REST API version `2026-03-10` removes the top-level `rate` field from `GET /rate_limit`. The adapter must send the required version header and read `resources.core`. The [official migration rule](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10) and a public repository fixed at deployment are the evaluator's two external sources.

The commit must contain `evidence/rate-limit.json` with the request and response path shown in [approved.json](evidence/approved.json). The [reference adapter](evidence/adapter.mjs) consumes the declared request and path. An explicit `["rate"]` path is BLOCKED. A retrievable adapter without a response path is UNRESOLVED. The evaluator interprets JSON data and does not execute repository code.

## Architecture

- React, TypeScript, Vite, and the official GenLayer JavaScript SDK provide wallet operations and transaction receipts. Public reads use finalized GenLayer state.
- The [evaluator](contracts/evaluator.py) authorizes the deployer, retrieves both sources independently during validator execution, and uses `strict_eq` over normalized rule and evidence digests, verdict, and reason. It stores submissions outside the nondeterministic block.
- The [activation registry](contracts/registry.py) uses an owner-authorized, one-time binding to the evaluator. It accepts activation only from that evaluator. APPROVED queues a finalized-only message. The registry records the applied submission and enforces increasing sequence numbers.
- The frontend verifies both successful receipts and the corresponding finalized registry record before reporting activation. Failed protocol execution and application UNRESOLVED are separate outcomes.

## Development

Use Node 22 or newer, pnpm, and Python 3.9 or newer.

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm test
pnpm build
pnpm dev
```

Python unit tests use a small local SDK stub to exercise logic. JavaScript tests exercise the adapter and portal limits. A current documentation download can also be tested by setting `VERSIONRELAY_DOC_HTML` to the downloaded HTML file.

## Deployment

Network configuration targets Bradbury Phase 2, chain 4221, at `https://rpc-bradbury.genlayer.com`. Before any write, the app checks the wallet and RPC genesis and the documented AddressManager. Run `node scripts/check-bradbury.mjs` to verify the Phase 2 genesis, SDK fee quote, and unsigned execution of both constructors. The contracts pin the GenVM v0.3 Python runner recovered from a finalized Phase 2 reference deployment. Deployment uses the dev-only `?setup` view and the owner wallet. Deploy and finalize registry and evaluator, bind once, and confirm the finalized configuration before evaluations. Fee limits require calibration against a successful Bradbury smoke test.

See [Reviewer Guide](REVIEWER_GUIDE.md) and [verification evidence](submission-assets/VERIFICATION_EVIDENCE.md) for the release status. Only add live addresses and hashes to `src/deployment.json` after verifying them. The checked-in Vercel configuration builds and serves the Vite production output.

## Scope and security

See [SECURITY.md](SECURITY.md) for the trust model. The verdict covers one migration rule and one defined adapter format. The registry controls VersionRelay release state. A matching adapter cannot establish CI execution, production deployment, or software safety.
