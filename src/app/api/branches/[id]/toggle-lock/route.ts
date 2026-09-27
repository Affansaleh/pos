import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/branches/[id]/toggle-lock — Toggle the isLocked field (SUPER_ADMIN only)
export async function POST(_req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if ((session.user as any).role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const branch = await prisma.branch.findUnique({ where: { id } });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const updated = await prisma.branch.update({
      where: { id },
      data: { isLocked: !branch.isLocked },
      select: {
        id: true,
        name: true,
        isLocked: true,
      },
    });

    return NextResponse.json({
      message: updated.isLocked
        ? "Branch locked successfully"
        : "Branch unlocked successfully",
      isLocked: updated.isLocked,
      branch: updated,
    });
  } catch (error) {
    console.error("[BRANCH TOGGLE LOCK]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
