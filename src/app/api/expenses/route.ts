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
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const userRole = (session.user as any).role as string;
    let branchId: string | undefined;
    if (userRole === "SUPER_ADMIN") {
      branchId = searchParams.get("branchId") ?? undefined;
    } else {
      branchId = (session.user as any).branchId ?? undefined;
    }

    const dateFilter: Record<string, Date> = {};
    if (startDate) {
      dateFilter.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateFilter.lte = end;
    }

    const expenses = await prisma.expense.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
      },
      include: {
        branch: {
          select: { id: true, name: true },
        },
        user: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("[EXPENSES_GET]", error);
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
    const { title, amount, category, notes, branchId: bodyBranchId } = body;

    if (!title || amount === undefined || amount === null) {
      return NextResponse.json(
        { error: "Title and amount are required" },
        { status: 400 }
      );
    }

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json(
        { error: "Amount must be a non-negative number" },
        { status: 400 }
      );
    }

    const sessionBranchId = (session.user as any).branchId;
    const resolvedBranchId =
      userRole === "BRANCH_ADMIN"
        ? (sessionBranchId ?? bodyBranchId)
        : bodyBranchId;

    if (!resolvedBranchId) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    const expense = await prisma.expense.create({
      data: {
        title,
        amount,
        category: category ?? null,
        notes: notes ?? null,
        branchId: resolvedBranchId,
        userId: session.user.id ?? null,
      },
      include: {
        branch: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("[EXPENSES_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
