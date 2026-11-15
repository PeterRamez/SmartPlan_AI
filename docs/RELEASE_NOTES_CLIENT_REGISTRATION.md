# Client registration and role-aware dashboard

- Added migration `0006_client_registration_profiles.sql`.
- The migration installs an `auth.users` trigger that provisions new signups as least-privilege `client` profiles attached to the existing configured admin lawyer workspace.
- Existing Auth users without a profile are backfilled when the migration runs.
- Signup now sends users to the dashboard when Supabase returns a session, or displays an email-confirmation message when confirmation is required.
- Client navigation is limited to Home, Ask Alex, and Settings.
- Client dashboard presents Alex and consultation access; staff dashboard retains document and knowledge-base metrics.
- Staff-only routes and APIs continue to use `requireStaff`.

MVP tenant behavior: public registrations are assigned to the first configured admin profile's `lawyer_id`. This is intentional for the single-lawyer MVP. A future multi-lawyer public signup flow should use an invitation, tenant-specific signup URL, or explicit lawyer selection rather than this default assignment.
