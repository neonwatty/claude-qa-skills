import { getDb, get } from "./db";

export function seed(): void {
  const db = getDb();

  const row = get<{ count: number }>("SELECT COUNT(*) as count FROM users");
  if (row && row.count > 0) return;

  const insertUser = db.prepare(
    "INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)"
  );
  const insertProject = db.prepare(
    "INSERT INTO projects (name, description, visibility, owner_id) VALUES (?, ?, ?, ?)"
  );
  const insertTask = db.prepare(
    "INSERT INTO tasks (title, status, priority, assignee_id, project_id) VALUES (?, ?, ?, ?, ?)"
  );
  const insertComment = db.prepare(
    "INSERT INTO comments (body, author_id, task_id) VALUES (?, ?, ?)"
  );
  const insertNotification = db.prepare(
    "INSERT INTO notifications (user_id, message) VALUES (?, ?)"
  );

  const seedAll = db.transaction(() => {
    // Users
    const admin = insertUser.run("admin@test.com", "admin123", "Admin User", "admin");
    const adminId = admin.lastInsertRowid as number;

    const member = insertUser.run("member@test.com", "member123", "Test Member", "member");
    const memberId = member.lastInsertRowid as number;

    // Projects
    const projectAlpha = insertProject.run("Project Alpha", "", "public", adminId);
    const alphaId = projectAlpha.lastInsertRowid as number;

    insertProject.run("Project Beta", "", "private", adminId);

    // Tasks for Project Alpha
    const task1 = insertTask.run("Set up authentication", "done", "high", adminId, alphaId);
    const task1Id = task1.lastInsertRowid as number;

    insertTask.run("Design dashboard layout", "in-progress", "medium", memberId, alphaId);
    insertTask.run("Write API documentation", "todo", "low", null, alphaId);

    // Comments on the first task
    insertComment.run("JWT-based auth is working now", adminId, task1Id);
    insertComment.run("Looks good, tested on staging", memberId, task1Id);

    // Notification for member
    insertNotification.run(memberId, "Admin assigned you to 'Design dashboard layout'");
  });

  seedAll();
}
