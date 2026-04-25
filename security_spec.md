# Security Specification - IntelliClass

## Data Invariants
1. A Student cannot modify their own attendance or internal marks.
2. A Faculty member can only mark attendance for students.
3. An HOD can monitor everything within their department.
4. Admins have global access.
5. Profiles must be completed before accessing the dashboard features.

## The Dirty Dozen Payloads
1. **Self-Promotion**: Student trying to set their role to 'admin' during registration.
2. **Attendance Forgery**: Student trying to write to their own `/attendance/` subcollection.
3. **Marks Tampering**: Student trying to update their `internalMarks` in their profile document.
4. **ID Poisoning**: User trying to create a document with a 1MB string as ID.
5. **PII Leak**: Non-authorized user trying to 'list' all user emails.
6. **Cross-Dept Snoop**: HOD of 'CS' trying to read details of a 'Mechanical' student (Wait, rules currently allow any HOD to read any user if we don't strictly check dept in rules. I should harden this).
7. **Ghost Announcement**: Student trying to post an announcement.
8. **Document Hijack**: User A trying to upload a document to User B's folder.
9. **Role Spoofing**: User trying to update their role after creation.
10. **Shadow Field Injection**: Adding `isVerified: true` to a profile update to bypass system checks.
11. **Negative Marks**: Faculty setting marks to -100.
12. **Mass Delete**: User trying to delete the entire `announcements` collection.

## Test Strategy
- Verify `isOwner()` correctly blocks cross-user writes.
- Verify `hasRole()` checks correctly gate administrative actions.
- Verify `isValidId()` blocks malformed IDs.
