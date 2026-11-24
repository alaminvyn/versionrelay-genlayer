# VersionRelay | Builder Projects

## One-liner

VersionRelay verifies commit-pinned API migration evidence through GenLayer consensus before activating an integration release onchain.

## Project description

API providers change response formats, leaving release owners to decide whether migration evidence is sufficient. VersionRelay independently retrieves GitHub’s versioned migration requirements and a commit-pinned adapter through GenLayer. Validators agree on an auditable APPROVED, BLOCKED, or UNRESOLVED verdict. A finalized approval authorizes a separate onchain registry write. The first rule verifies the GitHub REST rate limit migration to resources.core. The verdict applies to the submitted adapter and supported rule.

## Reviewer instructions

Use the [Reviewer Guide](../REVIEWER_GUIDE.md) and the [verification evidence](VERIFICATION_EVIDENCE.md). The package requires live links before portal submission.

## Expected verification outcome

The approved adapter reads resources.core and produces a finalized registry activation. The adapter using the removed rate field is blocked. The incomplete adapter remains unresolved. Neither of those submissions changes the active release.

## Website, repository, and onchain links

Pending verified publication. See [verification evidence](VERIFICATION_EVIDENCE.md).

## Tags

Confirm the primary tag and any secondary tags in the authenticated Builder Projects form. Also confirm current field labels and upload rules.

## Technical stack

React, TypeScript, Vite, GenLayerJS, Python Intelligent Contracts, Bradbury Phase 2, GitHub, and Vercel deployment configuration.

## Logo

[project-logo.png](project-logo.png), 1024 × 1024 transparent PNG, 59,084 bytes.
