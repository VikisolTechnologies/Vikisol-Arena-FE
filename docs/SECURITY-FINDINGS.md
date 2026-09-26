# Security findings

## Company-admin 2FA is optional, and was never a forced enrollment

Checked 26 September 2026 in `AuthService.signIn` and `DataSeeder`.

Sign-in sends a person to the authenticator step only when both of these are true:

- their role is `COMPANY_ADMIN` or `PLATFORM_ADMIN` (`MFA_ELIGIBLE_ROLES`)
- `totpEnabled` is already true on that account

`totpEnabled` defaults to false. Nothing in signup or in the demo seeder turns it on. The demo company admin (`demo.enterprise@vikisol.dev`) is created as `COMPANY_ADMIN` with that default, so password sign-in returns a session and never asks for a code. That matches the live check: `POST /api/v1/auth/signin` returned 200 and the browser landed on `/enterprise/admin` with no authenticator step.

The endpoints `/auth/2fa/setup`, `/enable`, `/disable`, and `/verify` are still in the API. Enrollment is available. It is not required.

This was not removed. The comment above `MFA_ELIGIBLE_ROLES` says 2FA is mandatory for those roles once it is enabled. The code does that, and only that. A company admin who never enrolls is never challenged. The earlier checklist line “2FA mandatory for internal platform admins and company admins” is not what the server enforces.

Recommendation: require enrollment before a `COMPANY_ADMIN` or `PLATFORM_ADMIN` can use the product. Until they finish setup, sign-in should stop at the setup step and must not issue a normal session. Do not turn this on in this cleanup. It changes how every existing admin logs in, including the demo accounts the test suite uses.

Auth behaviour was not changed.
