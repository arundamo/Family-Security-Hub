# Security Design Specification (ABAC Matrix)

## Real-Time Family Safety Coordination App

This document outlines the security invariants, unauthorized test payloads, and firestore assertions designed to prevent data leaks, identity spoofing, and orphaned writes between family members.

---

## 1. Core Data Invariants

1. **Relation Constraint (The Master Gate)**:
   - Access to any circle's subcollections (chats, members, SOS status, safezones) is strictly derived from active membership in the parent `/circles/{circleId}` collection.
   - If a member's association `/circles/{circleId}/members/{userId}` is deleted or they are removed, they immediately lose real-time read and write access to map paths, group chats, and SOS coordinate updates.

2. **No PII Leaks**:
   - Standard user profiles in `/users/{userId}` can be queried, but PII data (such as emails or personal contact details) is accessible strictly only to the owner of the account or members of a mutual circle.

3. **No Identity Spoofing**:
   - A user can only write, write-on-behalf, or modify profiles where the document key (`userId`) matches `request.auth.uid`.
   - Users cannot set their own role to `"admin"` or invite peers to a circle where they themselves do not belong.

4. **Temporal Security**:
   - All entries created or updated have `createdAt` and `updatedAt` variables strictly match the trusted runtime clock `request.time`.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following payloads attempt to bypass authorization gates and must be blocked by the firewall:

1. **Payload 1: Spoofing User profile (`/users/attacker_id/`)**
   - Attempting to overwrite a victim's coordinate or profile details.
   - *Target path:* `/users/victim_user_123`
   - *Malicious payload:* `{ "displayName": "Victim Spoofed", "latitude": 37.12, "longitude": -122.11 }`
   - *Result expected:* `PERMISSION_DENIED`

2. **Payload 2: Elevating Circle Role to Admin (`/circles/{id}/members/`)**
   - Attacker attempts to register in a circle directly setting `"role": "admin"`.
   - *Target path:* `/circles/family_abc/members/attacker_uid`
   - *Malicious payload:* `{ "userId": "attacker_uid", "displayName": "Attacker", "role": "admin", "joinedAt": "request.time" }`
   - *Result expected:* `PERMISSION_DENIED`

3. **Payload 3: Modifying Timestamp Field**
   - Attacker attempts to craft a retrofitted message with a backdated timestamp.
   - *Target path:* `/circles/family_abc/chats/chat_999`
   - *Malicious payload:* `{ "senderId": "attacker_uid", "senderName": "Attacker", "text": "Old message", "createdAt": "2020-01-01T00:00:00Z" }`
   - *Result expected:* `PERMISSION_DENIED` (must equal `request.time`)

4. **Payload 4: Injecting Giant IDs (Wallet Exhaustion)**
   - Attacker inputs massive arbitrary characters for ID variables.
   - *Target path:* `/users/very_long_junk_id_with_more_than_128_bytes_of_data_intended_to_drain_bandwidth`
   - *Result expected:* `PERMISSION_DENIED` (fails index checks and sizing constraints)

5. **Payload 5: Self-Assigned Location Update for Sibling Members**
   - Attempting to move another user on the map.
   - *Target path:* `/users/victim_user_123`
   - *Malicious payload:* `{ "latitude": 90.00, "longitude": 0.00 }` (attempting partial coordinate spoofing)
   - *Result expected:* `PERMISSION_DENIED`

6. **Payload 6: Joining a Circle without Valid Code**
   - Bypassing membership locks to inject self into arbitrary family networks.
   - *Target path:* `/circles/rich_family_789/members/attacker_uid`
   - *Result expected:* `PERMISSION_DENIED` (fails circle existence or verification checks)

7. **Payload 7: Deleting Sibling's SOS Alerts**
   - Attacker attempts to resolve or delete a victim's SOS panic signal.
   - *Target path:* `/circles/family_abc/sos/victim_sos_101`
   - *Malicious payload:* `{ "active": false, "resolvedBy": "attacker_uid" }` (without admin right or own creation)
   - *Result expected:* `PERMISSION_DENIED`

8. **Payload 8: Spamming Text to SafeZones**
   - Injecting oversized names to break layouts or exhaust storage.
   - *Target path:* `/circles/family_abc/safezones/zone_large`
   - *Malicious payload:* `{ "name": "A".repeat(1001), "latitude": 12.3, "longitude": 45.6, "radius": 500, "createdAt": "request.time", "createdById": "attacker_uid" }`
   - *Result expected:* `PERMISSION_DENIED`

9. **Payload 9: Reading Sibling's SafeZone Settings Without Circle Access**
   - Attempting to inspect zones of a user circle that the attacker has not joined.
   - *Target path:* `/circles/private_circle_zzz/safezones/safe_hq`
   - *Result expected:* `PERMISSION_DENIED`

10. **Payload 10: Modifying Read-Only Circle parameters**
    - Regular user attempts to change circle creation configurations.
    - *Target path:* `/circles/family_abc`
    - *Malicious payload:* `{ "createdById": "attacker_uid" }`
    - *Result expected:* `PERMISSION_DENIED` (immutable fields after creation)

11. **Payload 11: Chat Hijacking**
    - Spoofing another family details during chat communication.
    - *Target path:* `/circles/family_abc/chats/msg_123`
    - *Malicious payload:* `{ "senderId": "victim_uid", "senderName": "Dad", "text": "I am safe, do not worry!", "createdAt": "request.time" }`
    - *Result expected:* `PERMISSION_DENIED` (senderId must match authenticating UID)

12. **Payload 12: Broad Query Scrape**
    - Client attempts blanket query: `db.collection('users').get()` to harvest coordinates of all app users.
    - *Result expected:* `PERMISSION_DENIED` (Rules enforce document-level auth filters)

---

## 3. Test Runner Design

The following test execution framework in `/firestore.rules.test.ts` outlines security criteria:

```typescript
// Test suites map directly to firestore mock environments
describe("Zero-Trust Security Matrix", () => {
  it("denies access to non-authenticated actors", async () => { ... });
  it("protects user documents against identity spoofing", async () => { ... });
  it("prevents reading circle info unless member", async () => { ... });
  it("rejects chat creation with mismatched sender IDs", async () => { ... });
  it("blocks non-members from reading active family SOS coordinates", async () => { ... });
});
```
