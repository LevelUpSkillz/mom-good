# Mom Good

Independent print-on-demand storefront and admin system for Mom Good.

This repository is intentionally separate from LevelUpSkillz's main storefront codebase.

## Current build goals

- Public Mom Good storefront
- Secure admin area
- Printful product import and synchronization
- Product review before publication
- Variant, pricing, and margin management
- Order and fulfillment foundations
- Provider-neutral POD architecture for future Printify/Gelato support

## Safety principles

- Never expose Printful credentials in the client
- Never auto-publish supplier imports
- Never fake checkout, orders, reviews, or analytics
- Public users only see published products
- Admin writes require authenticated authorization
