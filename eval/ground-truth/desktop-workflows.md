# Desktop Workflows

> Hand-authored ground truth for QA eval system.
> Last updated: 2026-04-01
> Application: TaskFlow
> Base URL: http://localhost:3000

## Quick Reference

| # | Workflow | Priority | Auth | Steps |
|---|---------|----------|------|-------|
| 1 | User Login | core | no | 5 |
| 2 | Create Project | core | required | 9 |
| 3 | View and Manage Tasks | core | required | 7 |
| 4 | Edit Project (Admin) | feature | required | 7 |
| 5 | Delete Project (Admin) | feature | required | 7 |
| 6 | User Management | feature | required | 5 |
| 7 | Empty Project State | edge | required | 3 |
| 8 | Login with Invalid Credentials | edge | no | 5 |

---

## Core Workflows

## Workflow 1: User Login

<!-- auth: no -->
<!-- priority: core -->
<!-- estimated-steps: 5 -->

**Preconditions:**
- A registered user account exists with email "admin@taskflow.com" and password "password123"

1. Navigate to /login — the login page
2. Type "admin@taskflow.com" in the "Email" field — enter the user email
3. Type "password123" in the "Password" field — enter the user password
4. Click the "Sign In" button — submit the login form
5. Verify the dashboard heading displays "Welcome, Admin User" — confirms successful login and redirect to dashboard

**Postconditions:**
- User is authenticated and on the dashboard page

---

## Workflow 2: Create Project

<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 9 -->

**Preconditions:**
- User is logged in as admin

1. Navigate to /dashboard — the main dashboard page
2. Click the "New Project" button — opens the create project form
3. Verify the URL contains "/projects/new" — confirms navigation to the new project page
4. Type "Test Project" in the "Project Name" field — fill in the project name
5. Type "A test" in the "Description" field — fill in the project description
6. Select "Public" from the "Visibility" dropdown — set the project visibility
7. Click the "Create" button — submit the new project form
8. Verify the URL contains "/projects/" — confirms redirect to the new project page
9. Verify the heading displays "Test Project" — confirms the project was created with the correct name

**Postconditions:**
- A new project named "Test Project" exists
- The URL contains /projects/
- The project heading displays "Test Project"

---

## Workflow 3: View and Manage Tasks

<!-- auth: required -->
<!-- priority: core -->
<!-- estimated-steps: 7 -->

**Preconditions:**
- User is logged in as admin
- A project with tasks exists (including a task named "Set up authentication" with done status)

1. Navigate to /dashboard — the main dashboard page
2. Click the "Alpha Project" link — navigate to the project detail page
3. Verify the task list contains "Set up authentication" — confirms the task is listed
4. Verify the "done" status badge is visible — confirms the task status is displayed correctly
5. Click the "Set up authentication" link — navigate to the task detail page
6. Verify the heading displays "Set up authentication" — confirms navigation to the correct task
7. Verify the comments section contains "Looks good, merging now" — confirms task comments are displayed

**Postconditions:**
- User is on the task detail page for "Set up authentication"
- The task details and comments are visible

---

## Feature Workflows

## Workflow 4: Edit Project (Admin)

<!-- auth: required -->
<!-- priority: feature -->
<!-- estimated-steps: 7 -->

**Preconditions:**
- User is logged in as admin
- A project named "Alpha Project" exists

1. Navigate to /projects/1 — the project detail page
2. Click the "Edit" button — opens the edit project form
3. Verify the URL contains "/projects/1/edit" — confirms navigation to the edit page
4. Clear the "Project Name" field — remove existing project name
5. Type "Updated Project" in the "Project Name" field — enter the new project name
6. Click the "Save" button — submit the updated project form
7. Verify the heading displays "Updated Project" — confirms the project name was changed

**Postconditions:**
- The project name has been changed to "Updated Project"
- The project heading displays "Updated Project"

---

## Workflow 5: Delete Project (Admin)

<!-- auth: required -->
<!-- priority: feature -->
<!-- estimated-steps: 7 -->

**Preconditions:**
- User is logged in as admin
- A project exists that can be deleted

1. Navigate to /projects/1/settings — the project settings page
2. Verify the heading displays "Project Settings" — confirms navigation to settings
3. Click the "Delete Project" button — initiate project deletion
4. Verify the confirmation dialog displays "Are you sure you want to delete this project?" — confirms the dialog appeared with correct text
5. Click the "Confirm Delete" button — confirm the deletion
6. Verify the URL contains "/dashboard" — confirms redirect to dashboard after deletion
7. Verify the project list does not contain "Alpha Project" — confirms the project was removed

**Postconditions:**
- The project has been deleted
- The user is on the dashboard page
- The deleted project no longer appears in the project list

---

## Workflow 6: User Management

<!-- auth: required -->
<!-- priority: feature -->
<!-- estimated-steps: 5 -->

**Preconditions:**
- User is logged in as admin
- At least 2 users exist in the system

1. Navigate to /admin/users — the user management page
2. Verify the user table contains 2 rows — confirms both users are listed
3. Select "Admin" from the "Role" dropdown — change the member's role
4. Click the "Save Role" button — submit the role change
5. Verify the role column displays "Admin" — confirms the role was updated successfully

**Postconditions:**
- The member user's role has been changed to admin
- The user management table reflects the updated role

---

## Edge Case Workflows

## Workflow 7: Empty Project State

<!-- auth: required -->
<!-- priority: edge -->
<!-- estimated-steps: 3 -->

**Preconditions:**
- User is logged in as admin
- A project named "Project Beta" exists with no tasks

1. Navigate to /projects/2 — the Project Beta detail page
2. Verify the heading displays "Project Beta" — confirms correct project loaded
3. Verify the empty state message displays "No tasks yet" — confirms the empty state is shown

**Postconditions:**
- The empty state message is displayed for a project with no tasks

---

## Workflow 8: Login with Invalid Credentials

<!-- auth: no -->
<!-- priority: edge -->
<!-- estimated-steps: 5 -->

**Preconditions:**
- A registered user account exists with email "admin@taskflow.com"

1. Navigate to /login — the login page
2. Type "admin@taskflow.com" in the "Email" field — enter a valid email
3. Type "wrongpassword" in the "Password" field — enter an incorrect password
4. Click the "Sign In" button — attempt to submit the login form
5. Verify the error message displays "Invalid credentials" — confirms the login was rejected with proper feedback

**Postconditions:**
- The user remains on the login page
- An error message displays "Invalid credentials"

---

## Appendix: Application Map Summary

### Routes

| Path | Auth | Method | Description |
|------|------|--------|-------------|
| /login | No | GET | Login page |
| /register | No | GET | Registration page |
| /dashboard | Yes | GET | Main dashboard with project list |
| /projects/new | Yes | GET | Create new project form |
| /projects/[id] | Yes | GET | Project detail with task list |
| /projects/[id]/edit | Yes (admin) | GET | Edit project form |
| /projects/[id]/settings | Yes (admin) | GET | Project settings with delete action |
| /tasks/[id] | Yes | GET | Task detail with comments |
| /admin/users | Yes (admin) | GET | User management table |
| /profile | Yes | GET | User profile edit |
| /invite | Yes (admin) | GET | Invite new user |
| /notifications | Yes | GET | User notifications |

### Components

| Component | Location | Description |
|-----------|----------|-------------|
| LoginForm | /login | Email/password form with sign-in button |
| ProjectList | /dashboard | List of projects with new project button |
| TaskList | /projects/[id] | List of tasks with status badges |
| TaskDetail | /tasks/[id] | Task info with comments section |
| UserTable | /admin/users | User management with role dropdowns |

### Data Model

| Entity | CRUD | State Transitions |
|--------|------|-------------------|
| User | CR-U | role change (member <-> admin) |
| Project | CRUD | visibility change (public <-> private) |
| Task | CRUD | status change (todo -> in-progress -> done), reassignment |
| Comment | CR-- | none |
