# Security Specification (`security_spec.md`)

## 1. Data Invariants & Master Source of Truth

1. **Global Default-Deny Catch-All**: Every path not explicitly matched under `/databases/{database}/documents` is denied (`allow read, write: if false;`).
2. **Path Variable Hardening (`isValidId`)**: Every single-document target operation (`get`, `create`, `update`, `delete`) validates its path ID against `^[a-zA-Z0-9_\-]+$` and `.size() <= 128`.
3. **Strict Key & Volumetric Validation (`isValidSalon`, `isValidPlatformState`, `isValidUserPrivateProfile`)**:
   - All string fields are strictly bounded by `.size()` checks matching `firebase-blueprint.json`.
   - All arrays (`services`, `queue`, `salons`, `adBanners`, `notifications`) are strictly bounded by `.size() <= MAX` and first-element type checks when non-empty.
   - `createdAt` is immutable on update (`incoming().createdAt == existing().createdAt`) and must equal `request.time` on create.
   - `updatedAt` must equal `request.time` on both create and update.
4. **PII Isolation (Split Collection Strategy)**:
   - User PII (`phone`, `name`, `locality`) is isolated inside `/users/{userId}/private/{docId}` where `get`, `create`, `update`, `delete` are strictly restricted to `isOwner(userId) || isAdmin()`.
5. **Bootstrapped Admin & Verified Email**:
   - `isAdmin()` checks `isSignedIn() && ((request.auth.token.email == "singhshriyansh51@gmail.com" && request.auth.token.email_verified == true) || exists(/databases/$(database)/documents/admins/$(request.auth.uid)))`.

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 (Shadow Field Injection on `/salons/{salonId}`)**: Includes unauthorized key `"isHacked": true`. Rejected by `keys().hasOnly(...)`.
2. **Payload 2 (Identity Spoofing on `/salons/{salonId}`)**: Authenticated user sets `ownerId` to `"another-user-uid"`. Rejected by `data.ownerId == request.auth.uid`.
3. **Payload 3 (Email Spoofing for Admin Access)**: Token with `email: "singhshriyansh51@gmail.com"` but `email_verified: false`. Rejected by `request.auth.token.email_verified == true`.
4. **Payload 4 (Path ID Poisoning)**: 500-character or special-character document ID. Rejected by `isValidId(salonId)`.
5. **Payload 5 (Value Poisoning on Update)**: Updating `nowServingToken` to a string `"five"` instead of an integer. Rejected by `isValidSalon(incoming())` wrapping the `allow update` block.
6. **Payload 6 (Immortal Field Mutation)**: Attempting to modify `createdAt` or `ownerId` during `update` on `/salons/{salonId}`. Rejected by `incoming().createdAt == existing().createdAt && incoming().ownerId == existing().ownerId`.
7. **Payload 7 (Client Timestamp Forgery)**: Passing a forged past or future timestamp instead of `request.time` for `updatedAt`. Rejected by `incoming().updatedAt == request.time`.
8. **Payload 8 (Unbounded Array Exhaustion)**: Passing 500 items in `queue` array on `/salons/{salonId}`. Rejected by `data.queue.size() <= 100`.
9. **Payload 9 (PII Horizontal Privilege Escalation)**: Authenticated `userA` attempting `get` on `/users/userB/private/info`. Rejected by `isOwner(userId) || isAdmin()`.
10. **Payload 10 (Unauthenticated Write to `/salons/{salonId}`)**: Anonymous/null auth attempting `create` on `/salons/{salonId}` without valid schema or auth. Rejected by auth & schema checks.
11. **Payload 11 (Terminal State Mutation on Rejected Salon by Non-Admin)**: Non-admin attempting to mutate a salon whose `approvalStatus == 'Rejected'`. Rejected by terminal state lock `existing().approvalStatus != 'Rejected' || isAdmin()`.
12. **Payload 12 (Shadow Key in Action-Based Update)**: Updating an unapproved key not in `affectedKeys().hasOnly(...)`. Rejected by action-based update gate.
