import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRole = (session.user as any).role as string;

    if (userRole !== "SUPER_ADMIN" && userRole !== "BRANCH_ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);

    let branchId: string | undefined;
    if (userRole === "SUPER_ADMIN") {
      branchId = searchParams.get("branchId") ?? undefined;
    } else {
      branchId = (session.user as any).branchId ?? undefined;
    }

    const users = await prisma.user.findMany({
      where: branchId ? { branchId } : undefined,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(users);
  } catch (error) {
    console.error("[USERS_GET]", error);
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
    const { name, email, password, role, branchId: bodyBranchId } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    // Validate role assignment — BRANCH_ADMIN cannot create SUPER_ADMIN
    if (userRole === "BRANCH_ADMIN" && role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Branch admins cannot create super admins" },
        { status: 403 }
      );
    }

    const sessionBranchId = (session.user as any).branchId;
    const resolvedBranchId =
      userRole === "BRANCH_ADMIN"
        ? (sessionBranchId ?? bodyBranchId)
        : bodyBranchId;

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash: hashedPassword,
        role: role ?? "CASHIER",
        branchId: resolvedBranchId ?? null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        updatedAt: true,
        branch: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("[USERS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
