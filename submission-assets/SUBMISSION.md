# VersionRelay | Builder Projects

## One-liner

VersionRelay verifies commit-pinned API migration evidence through GenLayer consensus before activating an integration release onchain.

## Project description

API providers change response formats, leaving release owners to decide whether migration evidence is sufficient. VersionRelay independently retrieves GitHub’s versioned migration requirements and a commit-pinned adapter through GenLayer. Validators agree on an auditable APPROVED, BLOCKED, or UNRESOLVED verdict. A finalized approval authorizes a separate onchain registry write. The first rule verifies the GitHub REST rate limit migration to resources.core. The verdict applies to the submitted adapter and supported rule.

## Reviewer instructions

Open [Verified migration cases](https://versionrelay-genlayer.vercel.app/#registry). For each case, open its pinned GitHub commit and evaluation receipt. For APPROVED, open the separate registry receipt and check that the active integration release is `adapter-approved`. See the [Reviewer Guide](../REVIEWER_GUIDE.md).

## Expected verification outcome

The approved adapter reads resources.core and produces a finalized registry activation. The adapter using the removed rate field is blocked. The incomplete adapter remains unresolved. Neither of those submissions changes the active release.

## Website, repository, and onchain links

[Public GitHub repository](https://github.com/alaminvyn/versionrelay-genlayer). [Public Vercel dashboard](https://versionrelay-genlayer.vercel.app/). Finalized receipts and contract addresses are listed below. See [verification evidence](VERIFICATION_EVIDENCE.md).

## Onchain evidence

- [APPROVED](https://scan.bradbury.genlayer.com/tx/0xcd8c4cc0fe699904ef2f7b55121f5a4a15f41341b416550f4bb922b9c025cec6)
- [BLOCKED](https://scan.bradbury.genlayer.com/tx/0x02a3d501ff57d287020e0681b481b5c6eec71deaa1e1fd5432208468ee7b2129)
- [UNRESOLVED](https://scan.bradbury.genlayer.com/tx/0x6cd31f1e3b0e0d804e08bc56b68be4b582be33d859179ec84ca39bb9914ba8d5)
- [Finalized activation](https://scan.bradbury.genlayer.com/tx/0x6266a6660d672e1d8f901a2a08000ec6e84cde587185702285df6f3b9069a592)
- [Activation registry](https://scan.bradbury.genlayer.com/address/0x1fFC6D2C96853afC1B44CF8546E40ab793234E1e)
- [Migration evaluator](https://scan.bradbury.genlayer.com/address/0x67f9c377A78452A27Fa45dd6625da8B296AaeC8d)

## Tags

Confirm the primary tag and any secondary tags in the authenticated Builder Projects form. Also confirm current field labels and upload rules.

## Technical stack

React, TypeScript, Vite, GenLayerJS, Python Intelligent Contracts, Bradbury Phase 2, GitHub, and Vercel deployment configuration.

## Logo

[project-logo.png](project-logo.png), 1024 × 1024 transparent PNG, 59,084 bytes.
