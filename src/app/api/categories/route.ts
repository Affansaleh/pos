import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);

    const userRole = (session.user as any).role as string;
    let branchId: string | undefined;
    if (userRole === "SUPER_ADMIN") {
      branchId = searchParams.get("branchId") ?? undefined;
    } else {
      branchId = (session.user as any).branchId ?? undefined;
    }

    const categories = await prisma.category.findMany({
      where: branchId ? { branchId } : undefined,
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[CATEGORIES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role as string;

    if (userRole !== "SUPER_ADMIN" && userRole !== "BRANCH_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { name, branchId: bodyBranchId } = body;

    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const sessionBranchId = (session.user as any).branchId;
    const resolvedBranchId =
      userRole === "BRANCH_ADMIN"
        ? (sessionBranchId ?? bodyBranchId)
        : bodyBranchId;

    if (!resolvedBranchId) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    // Check for duplicate name within same branch (SQLite does not support mode: insensitive)
    const existing = await prisma.category.findFirst({
      where: { name, branchId: resolvedBranchId },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists for this branch" },
        { status: 409 }
      );
    }

    const category = await prisma.category.create({
      data: {
        name,
        branchId: resolvedBranchId,
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("[CATEGORIES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
