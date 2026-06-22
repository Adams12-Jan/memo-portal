# Security Specification: Enterprise Internal Memo Portal

## 1. Data Invariants

1. **User Identity Invariant**: A user's profile documents stored at `/users/{userId}` must only be referenceable if `userId` matches the authenticated user's ID (`request.auth.uid`), unless the requesting user is a verified system administrator.
2. **Field Immutability Invariant**: A user's `email` and `created_at` timestamp are strictly immutable once a profile document has been successfully created.
3. **Privilege Isolation Invariant**: Regular users cannot elevate their own permissions. Specifically, a standard user cannot modify their own `role`, `portal_identity`, or `is_active` status. Only a verified `'System Administrator'` can write or alter administrative attributes.
4. **Valid Resource Identifiers**: Document IDs for collections must conform to alphanumeric characters to block injection or directory traversal attempts.

---

## 2. The "Dirty Dozen" Payloads

These 12 scenarios are designed to validate identity isolation, write safety, and role boundary protections.

1. **Self-Elevated Role (Create)**: A user attempts to register their own profile at `/users/attackerId` with the `role` field set to `'System Administrator'` or other administrative roles.
2. **Profile Hijacking (Create)**: An authenticated user with UID `attackerId` attempts to create a user document on another user's path at `/users/victimId`.
3. **Shadow Field Injection**: A user tries to create a profile document containing undocumented attributes (`ghostState: true`).
4. **Immutability Bypass (Email Update)**: A registered user attempts to change their own email address from `user@company.com` to `malicious@company.com`.
5. **Unauthorized Privilege Escalation (Update)**: A standard initiator attempts to update their own `role` to `'System Administrator'` or `'Executive Director'`.
6. **Self-Approve Status Activation**: A deactivated (inactive) user attempts to modify their own status using `is_active: true`.
7. **Cross-Tenant List Scraping**: An unauthenticated user attempts to list the `/users` collection to scrape employee emails.
8. **Malicious ID injection (Resource Poisoning)**: An attacker attempts to create a profile at `/users/../maliciousPath` or with a 1.5KB string containing junk characters.
9. **Tampered Local Timestamp (Create)**: A user attempts to forge the `created_at` timestamp with a future date instead of the server timestamp (`request.time`).
10. **Victim's Avatar Deletion/Alteration**: A user `attackerId` attempts to update `/users/victimId`'s `profile_picture_url` field.
11. **Spoofed Email Identity Validation**: A user attempts to sign up with an unverified email address and write `is_verified: true` to bypass verification rules.
12. **Blanket Read Request**: A user signs in and sends an unrestricted get/list request on `/users` bypassing administrative filtering.

---

## 3. The Test Spec Runner (Verification Mapping)

Below is the conceptual structure of the automated test specs used to ensure all Dirty Dozen payloads fail with `PERMISSION_DENIED`:

```ts
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';

describe('Firestore Security Rules Enforcement', () => {
  let testEnv;

  before(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'oval-quanta-t8gvj',
      firestore: {
        host: 'localhost',
        port: 8080,
      }
    });
  });

  after(() => testEnv.cleanup());

  it('Denies self-elevated role creations (Pillar 2, 4)', async () => {
    const context = testEnv.authenticatedContext('attackerId');
    await assertFails(context.firestore().doc('users/attackerId').set({
      email: 'attacker@co.com',
      first_name: 'Attacker',
      last_name: 'Super',
      role: 'System Administrator',
      is_active: true,
      is_verified: true,
      created_at: new Date().toISOString()
    }));
  });

  it('Denies writing user documents on other user paths (Pillar 1)', async () => {
    const context = testEnv.authenticatedContext('attackerId');
    await assertFails(context.firestore().doc('users/victimId').set({
      email: 'victim@co.com',
      first_name: 'Victim',
      last_name: 'User',
      role: 'Initiator',
      is_active: true,
      created_at: new Date().toISOString()
    }));
  });
});
```
