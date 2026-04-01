import { NextRequest, NextResponse } from "next/server";
import { run, get } from "@/lib/db";

interface CommentRow {
  id: number;
  body: string;
  author_id: number;
  author_name: string;
  task_id: number;
  created_at: string;
}

export async function POST(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { body, taskId } = await request.json();

  const result = run(
    "INSERT INTO comments (body, author_id, task_id) VALUES (?, ?, ?)",
    [body, Number(userId), taskId]
  );

  const comment = get<CommentRow>(
    `SELECT c.*, u.name AS author_name
     FROM comments c
     JOIN users u ON c.author_id = u.id
     WHERE c.id = ?`,
    [result.lastInsertRowid]
  );

  return NextResponse.json(comment, { status: 201 });
}
