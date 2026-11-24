# Resume VersionRelay

The React app, contracts, fixtures, logo, tests, and submission drafts are in the local repository. There is no public remote, production URL, deployed address, or transaction hash.

1. Bradbury constructor preflight now passes after switching to the v0.3 Python runner verified against a finalized Phase 2 reference contract. Run `node scripts/check-bradbury.mjs` to reproduce before signing. Verify public commit retrieval, registry child budget, and finalized-message settlement during live operation.
2. Obtain explicit approval for public GitHub publication, free Vercel deployment, and preparation of wallet transactions. GitHub's connected login is `alaminvyn`. The owner handles wallet connection, funding, confirmations, account authorization, and portal submission.
3. Publish local main and fixture tags. Verify all three raw GitHub commit URLs against the SHAs in `submission-assets/VERIFICATION_EVIDENCE.md`.
4. Open the dev-only `?setup` view in a browser with the funded owner wallet. Deploy and finalize the registry and evaluator, bind and finalize the binding, then check finalized registry configuration. Inspect each transaction's execution result.
5. Submit the three fixture commits. Finalize as required. For approval, verify the separate child receipt and matching finalized registry state. Populate `src/deployment.json` with the verified addresses and receipt hashes, then update the public evidence documents.
6. Build and deploy on the authorized Vercel Hobby project. Verify production is public and serving the intended commit, repeat reviewer steps, and confirm live links. The owner confirms portal taxonomy and submits.

Local tests use stubbed contract interfaces and cover 12 Python cases with the current GitHub HTML fixture and 8 JavaScript cases. The Vite build passed with the bundled standalone Node runtime. The app-bound Node executable could not load Rollup's native module on this Mac. The local browser preview was checked at 1440, 1024, 768, and 390 pixels.

The violet architectural redesign, timeline, logo and responsive screenshots are ready. The portal PNG is 1024 × 1024 and 59,084 bytes.
