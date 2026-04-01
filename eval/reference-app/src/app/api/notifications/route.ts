import { NextRequest, NextResponse } from "next/server";
import { query, run } from "@/lib/db";

interface NotificationRow {
  id: number;
  user_id: number;
  message: string;
  read: number;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = query<NotificationRow>(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC",
    [Number(userId)]
  );

  return NextResponse.json(notifications);
}

export async function PUT(request: NextRequest) {
  const userId = request.headers.get("x-user-id");
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await request.json();

  run("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", [
    id,
    Number(userId),
  ]);

  return NextResponse.json({ success: true });
}
