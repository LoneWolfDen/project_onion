# Secret handling

Rules for credentials in Continuum. They apply to code, docs, backups, logs and screenshots.

1. **Never commit a secret.** No API keys, passwords, tokens, private keys, access URLs that embed credentials, or administrator credentials in any tracked file. Examples use placeholders such as `YOUR_API_KEY_HERE`. `scripts/check-repo.mjs` runs in CI and fails on key-shaped strings and private keys.
2. **Browser keys are session-only.** An AI provider key entered in the app is kept in `sessionStorage` for the current browser session. It is not written to `localStorage`, IndexedDB, backups, logs, diagnostics or URLs, and the UI never shows it again.
3. **No AI by default.** Content leaves the device only after the user chooses a provider, confirms that content will be sent to that destination, and supplies a key. Without all three, calls fail closed to local rules and results are labelled "No AI".
4. **If a secret is ever exposed, revoke it.** Deleting it from the latest commit is not enough: rotate or revoke it at the provider, then replace it. Repository history keeps old values.
5. **Runtime data stays out of Git.** Vector stores, databases and exports are ignored by `.gitignore` and checked by the repo check.

## Approved alternatives for production

A key typed into a browser is acceptable for a single-user local pilot only. For anything shared, keep the key off the device that runs the UI:

- a small server-side proxy on loopback or inside the trusted network that holds the key in an environment variable and forwards only approved requests;
- a managed secret store (for example a cloud secret manager or a vault) that injects the key into that proxy at start-up;
- short-lived credentials issued per user (for example through the organisation's identity provider) instead of long-lived keys.

Whichever is used, the browser should receive no long-lived provider key.
