# Repair active-session management safely

## Confirmed issue
The current device-management function calls an unavailable session-listing operation. It also passes a device-session identifier to a sign-out operation that requires an authenticated token. Some failures are ignored, so the app can report successful sign-out without actually signing devices out. No existing fallback handles these failures.

## Proposed repair
- Restore the active-device list using authoritative account-session records, showing the current device and available device metadata.
- Restore **Sign out of all other devices** using the supported account sign-out operation, preserving the current session and reporting success only after the service confirms it.
- Remove individual-device sign-out buttons and the automatic three-device-limit promise for now: neither is supported by the verified authentication APIs. Do not pretend that deleting a device label signs that device out.
- Keep the existing account and family permissions unchanged. Translate any changed screen text into English and French.

## Technical details
- Add a narrowly scoped, service-role-only public read-only function to list `auth.sessions` for the authenticated user verified by the edge endpoint. Exclude expired sessions and return only necessary device fields; never expose refresh-token material or modify managed authentication tables.
- Derive the current session from the verified request token, not browser storage or a client-supplied identifier. Validate action inputs and check all database/authentication errors.
- Use the caller's authenticated JWT with the supported `signOut(jwt, "others")` operation. Refresh the authoritative list afterward. Already-issued access tokens may remain valid until expiry; explain this accurately where necessary.
- Remove the unsupported automatic-limit call from sign-in handling. Reject obsolete unsupported actions explicitly instead of returning misleading success.
- Record the revised session-management rule in the project architecture guidance.

## Verification
- Add tests for current-session identification, input validation, expired-session filtering, and error propagation.
- Check that only the requesting user's sessions are returned and that the current session is preserved when signing out others.
- Walk the signed-in Active sessions screen and confirm the list reads back correctly. Test actual other-device sign-out only with a designated disposable account, avoiding disruption of your real devices.

## Not included
Reliable individual-device revocation and a hard three-device cap remain unavailable until a supported authentication-service capability is verified. This plan does not change reserved authentication tables or store other devices' tokens to bypass that limitation.