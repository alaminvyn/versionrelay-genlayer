# Security and scope

- Deploy and bind with the same intended owner. Review the evaluator code, evaluator address, registry address, and approved repository before binding. Binding is permanent.
- Evaluation accepts a full lowercase hexadecimal SHA and a bounded release label. Fetch URLs use fixed HTTPS hosts and paths. The runtime controls HTTP transport and redirect behavior. No arbitrary URL, LLM instruction, or executable repository content is accepted.
- Raw documentation is normalized to the required rule. Evidence is bounded and decoded as a strict JSON structure. Duplicate keys and extra top-level fields are rejected. Documentation drift fails closed. Fetch failure aborts evaluation and validator disagreement can prevent a protocol decision.
- Activation only accepts a call from the bound evaluator. It enforces sequence and replay checks. The evaluator schedules activation at finality for APPROVED only. Browser state has no role in activation authorization.
- GitHub commit identity locates the bytes evaluated. The deployment trusts GitHub availability and the network's validation and finalization process.
- The application uses injected wallet signing and public deployment settings. Never add wallet credentials, deployment tokens, or private keys to this repository.
