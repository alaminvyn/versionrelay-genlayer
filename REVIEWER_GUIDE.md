# Reviewer guide

Open the [production dashboard](https://versionrelay-genlayer.vercel.app/#registry). All three cases and the activation are finalized on Bradbury Phase 2. [Full verification evidence](submission-assets/VERIFICATION_EVIDENCE.md).

## Verify a published case

1. Open the production site from the evidence document and select **Explore migration cases**.
2. Open the pinned evidence commit and inspect `evidence/rate-limit.json`. Compare it with the [official rule](https://docs.github.com/en/rest/about-the-rest-api/breaking-changes?apiVersion=2026-03-10).
3. Open the evaluation transaction. Check successful execution and GenLayer **FINALIZED** status.
4. For APPROVED, open the separate registry transaction. Verify successful execution, finality, and the matching activation record and active release on the site.
5. For BLOCKED and UNRESOLVED, verify the displayed reason and absence of an activation for that submission.

Public inspection requires no wallet. An authorized owner can connect a funded Bradbury Phase 2 wallet, select a fixture, assign a fresh release label, submit for verification, and confirm finalization when offered. Submit only to the finalized and bound contract pair.
