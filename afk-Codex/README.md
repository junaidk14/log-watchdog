# Log Watchdog AFK runner

Source: [junaidk14/tools](https://github.com/junaidk14/tools/tree/0e7016fd713b3306df0f44fb636b2d4c19ddc3f0/afk-Codex), pinned at `0e7016fd713b3306df0f44fb636b2d4c19ddc3f0`.

`loop.sh`, `prompt.md`, and `review-prompt.md` are copied unchanged. Project-specific behavior lives in [project-policy.md](project-policy.md), loaded by the root `AGENTS.md` for implementation, fix, and review assignments. The policy does not change runner mechanics or session output schemas.

## Preserved flow

Fresh implementation session → verified non-draft PR → fresh read-only whole-PR review → fresh focused fix session when needed → another fresh whole-PR review → runner-owned merge.

Every session is a new `codex exec --ephemeral`. Implementation/fix sessions retain upstream `danger-full-access` and approval policy `never`; reviews retain `read-only`. Model selection remains the normal Codex configuration. Only the runner merges, matching the reviewed head and enforcing its existing Git, review, CI, and mergeability checks.

Issue selection is an agent policy: only approved open issues #1–#7 with `ready-for-agent`, no existing PR, and no unresolved native or textual blockers are executable. The shell rechecks readiness and PR identity but does not independently enumerate blockers; project policy requires fresh dependency checks and evidence. This adaptation does not claim a new credential-level boundary or scheduler gate.

## Run when the checkout is ready

The current working directory selects the target repository. From a clean, committed checkout on `main` matching `origin/main`:

```bash
bash afk-Codex/loop.sh 5 /tmp/log-watchdog-afk-logs
```

The current authorized continuation covers #2–#6 only; optional Gemini #7 is excluded by project policy and requires a separate launch instruction. The issue count is a maximum, not permission to skip blockers. Logs stay outside the working tree. Bash, Git, `gh`, `jq`, and an authenticated Codex CLI are required. The repository account must be able to push branches, create PRs, and merge under existing protections.

Committing this setup does not launch the loop or modify existing issue/PR state. Before launch, the planning and runner files must be committed and available on `origin/main`, with a clean synchronized checkout. Preserve user files; the upstream runner intentionally refuses a dirty checkout rather than stashing or deleting work.

Runtime defaults remain upstream: 15 issue attempts when no count is supplied, up to 3 fix sessions per issue, merge method `merge`. Optional overrides are `MAX_REVIEW_RETRIES`, `MERGE_METHOD`, `MAX_ITERATIONS`, and `LOG_DIR` as described in the [upstream README](https://github.com/junaidk14/tools/blob/0e7016fd713b3306df0f44fb636b2d4c19ddc3f0/README.md).

## Verification

Safe syntax check, without agents or remote writes:

```bash
bash -n afk-Codex/loop.sh
```

Expected Git blob hashes for unchanged upstream files:

| File | Git blob SHA-1 |
| --- | --- |
| `loop.sh` | `496d49c57f66aa7e11fd38a2184983a25deab4eb` |
| `prompt.md` | `459175ea131003e9d1e55874da63545279b5c080` |
| `review-prompt.md` | `2daeff1e5d5eea1cc9e77d8274790bee71b5e102` |

Use `git hash-object` on each file to check provenance; it does not write an object unless asked. The installed CLI was checked for `--ephemeral`, `--json`, `--sandbox`, `--cd`, and `--output-last-message`. No live autonomous session or merge is implied by these checks.

Codex execution reference: [official non-interactive documentation](https://learn.chatgpt.com/docs/non-interactive-mode).
