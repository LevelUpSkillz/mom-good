# Mom Good non-regression rules

Mom Good must add capabilities without breaking or replacing settings that already work.

## Deployment rules

- Keep `main` stable. New work lands in `develop` and is reviewed before merge.
- Missing optional services must disable only the feature that needs them, not the storefront.
- Never overwrite existing environment values automatically.
- Never expose supplier, database, session, payment, or fulfillment secrets to the browser.
- Printful import and public publication remain separate actions.
- Do not submit a Printful fulfillment order until a real paid order exists and fulfillment is explicitly enabled.
- Do not activate a checkout provider until its credentials and webhook handling are verified.
- Public catalog reads only published products.
- Admin writes require an authenticated admin session.
- New provider integrations must use an adapter boundary so Printful changes do not force storefront rewrites.

## Pre-merge gate

Before merging to `main`, verify:

1. Production build succeeds.
2. Existing public routes still render.
3. Admin login works with configured secrets.
4. Site remains usable when Printful is not configured.
5. Site remains usable when database-backed admin features are unavailable.
6. No secret value is committed to GitHub.
7. Imported supplier content remains private until explicitly published.
8. Existing working site integrations are not replaced or reconfigured by application startup.
