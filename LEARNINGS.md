# LEARNINGS (v4.6.0)

Last updated: 2025-09-16T18:14:33.000Z

Backend:
- MessMass cookie session pattern adapts cleanly to Pages Router with minimal dependencies
- Implementing cookie parse/serialize inline avoids extra deps (keeps ESM simple)
- ISO 8601 UTC timestamps with milliseconds across DB/doc flows improves traceability

Process:
- Version bump + docs sync should be automated to prevent drift
- Removing legacy endpoints sharply reduces ambiguity for integrators

Security:
- Strict CORS per domain is essential for public SSO services
- Avoid embedding secrets in source (deprecated duplicate routes were neutralized)
- Admin-bypass for resource passwords must be server-side only

Backend (Stability):
- Avoid import-time DB client instantiation in serverless environments; lazily create the Mongo client inside getDb() to prevent function cold-start crashes and “Empty reply from server”.
