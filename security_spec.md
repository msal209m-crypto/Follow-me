# Security Specification: Qaryati Platform

## Data Invariants
1. A Merchant must be approved by an administrator before their store is visible to the public.
2. An Order must belong to a valid Customer and be associated with an existing Merchant and Village.
3. Items can only be managed by the Merchant who owns the store.
4. Drivers can only see and accept orders in their registered Village.
5. Personally Identifiable Information (PII) like National ID and Phone must only be readable by the owner or authorized admins.

## The Dirty Dozen (Vulnerability Test Payloads)
1. **Self-Approval Attack**: A new merchant attempts to set `isApproved: true` during registration.
2. **Ghost Field Injection**: Adding a `isAdmin: true` field to a customer profile.
3. **Orphaned Order**: Creating an order with a non-existent `merchantId`.
4. **Price Manipulation**: A customer attempts to update an item's `salePrice` in a store.
5. **Cross-Merchant Write**: Merchant A attempts to delete an item belonging to Merchant B.
6. **Anonymous Order**: Attempting to create an order without a valid Supabase Auth token.
7. **Identity Spoofing**: Setting `id` to someone else's UID during creation.
8. **Resource Poisoning**: Injecting a 1MB string into the `name` field of an item.
9. **Status Shortcutting**: A customer attempting to set order status to `DELIVERED`.
10. **PII Leak**: A guest user attempting to read the `merchants` collection.
11. **Village Bypass**: A driver in Village A attempting to read orders in Village B.
12. **Update Gap**: Updating `updatedAt` with a client-side timestamp instead of `request.time`.

## Firestore Rules Draft
Rules will enforce:
- `request.auth != null` for all sensitive operations.
- `isApproved == true` for public visibility.
- Role-based whitelisting of fields using `affectedKeys().hasOnly()`.
- Static validation of data types and sizes.
