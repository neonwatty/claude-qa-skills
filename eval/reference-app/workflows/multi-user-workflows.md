# Multi-User Workflows

> Hand-authored ground truth for QA eval system.
> Last updated: 2026-04-01
> Application: TaskFlow
> Base URL: http://localhost:3000

## Quick Reference

| # | Workflow | Priority | Auth | Steps |
|---|---------|----------|------|-------|
| 1 | Task Assignment Flow | core | required | 8 |
| 2 | Project Collaboration | core | required | 9 |
| 3 | Role Change Impact | feature | required | 7 |

---

## Core Workflows

## Workflow 1: Task Assignment Flow

<!-- personas: Admin, Member -->
<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 8 -->

**Preconditions:**
- Admin is logged in as admin user
- Member is logged in as member user
- A project named "Alpha Project" exists with a task "Set up authentication"

1. [Admin] Navigate to /projects/1 — the Alpha Project detail page
2. [Admin] Click the "Set up authentication" link — navigate to the task detail
3. [Member] Verify the heading displays "Alpha Project" — confirms the project page loaded for cross-check
4. [Admin] Select "Member" from the "Assignee" dropdown — assign the task to Member
5. [Admin] Click the "Save Assignment" button — submit the assignment
6. [Member] Verify the notification list contains "You were assigned to Set up authentication" — confirms the assignment notification arrived
7. [Member] Navigate to /tasks/1 — view the assigned task
8. [Admin] Verify the task detail shows assignee "Member" — confirms the assignment persisted

**Postconditions:**
- The task "Set up authentication" is assigned to Member
- Member received a notification about the assignment
- The task detail shows Member as the assignee

---

## Workflow 2: Project Collaboration

<!-- personas: Admin, Member -->
<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 9 -->

**Preconditions:**
- Admin is logged in as admin user
- Member is logged in as member user

1. [Admin] Navigate to /dashboard — the main dashboard page
2. [Admin] Click the "New Project" button — start creating a new project
3. [Member] Verify the dashboard heading displays "Welcome, Member" — confirms Member session is active
4. [Admin] Type "Shared Project" in the "Project Name" field — enter the project name
5. [Admin] Click the "Create" button — submit the new project
6. [Member] Verify the project list contains "Shared Project" — confirms the new project is visible to Member
7. [Member] Click the "Shared Project" link — navigate to the new project
8. [Member] Click the "Add Task" button — open the new task form
9. [Admin] Verify the task list contains "Untitled Task" — confirms the task created by Member is visible to Admin

**Postconditions:**
- A project named "Shared Project" exists
- Member has added a task to the project
- Both Admin and Member can see the task

---

## Feature Workflows

## Workflow 3: Role Change Impact

<!-- personas: Admin, Member -->
<!-- auth: required -->
<!-- priority: feature -->
<!-- estimated-steps: 7 -->

**Preconditions:**
- Admin is logged in as admin user
- Member is logged in as member user with role "member"

1. [Admin] Navigate to /admin/users — the user management page
2. [Admin] Select "Admin" from the "Role" dropdown — change Member's role to admin
3. [Member] Verify the role column displays "Admin" — confirms the role change is reflected
4. [Admin] Click the "Save Role" button — submit the role change
5. [Member] Verify the notification list contains "Your role has been changed to Admin" — confirms the role change notification
6. [Member] Navigate to /admin/users — attempt to access admin-only page
7. [Admin] Verify the user table contains 2 rows — confirms Member can now access the admin page and the table is consistent

**Postconditions:**
- Member's role has been changed to admin
- Member can now access the /admin/users page
- The user management table shows the updated role
