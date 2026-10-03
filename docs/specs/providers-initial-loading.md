# Review — Providers initial loading

- Workflow status: Review. Historical snapshot status and verification notes below are retained.


- Goal: Make Settings → Providers honest about its automatic discovery work and prevent duplicate checks while that work is pending.
- User story: As a MonoCode user, I want to see that providers are being checked when I open the page, so I know why model counts are changing and cannot accidentally start overlapping checks.
- Acceptance criteria:
  - Opening Providers shows a compact status beside the page title from the first render.
  - The status remains visible until both availability probing and eligible catalog discovery settle.
  - Every row's Recheck button is disabled while initial discovery is pending and enabled afterward.
  - If a top-level discovery request rejects, the status explains the failure and Recheck becomes available.
  - No provider discovery starts merely because MonoCode launches with Settings closed.
- States: checking, ready, failed; rows retain their existing per-provider availability and catalog messages.
- Out of scope: scoping a manual Recheck's availability probe to one provider, changing catalog caching, or changing startup behavior.
- Open questions: None for this UI change; manual visual verification remains.
