import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/products
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

    const search = searchParams.get("search") ?? undefined;

    const products = await prisma.product.findMany({
      where: {
        ...(branchId ? { branchId } : {}),
        ...(search
          ? {
              OR: [
                { name: { contains: search } },
                { barcode: { contains: search } },
                { brand: { contains: search } },
              ],
            }
          : {}),
      },
      include: {
        category: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("[PRODUCTS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/products
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
    const {
      name, barcode, categoryId, branchId: bodyBranchId,
      productType, quantity, totalStockBottles, mlPerBottle,
      activeBottleRemainingMl, nicotineStrength, flavorName, brand,
      purchasePrice, bottleSalePrice, pricePerMl, salePrice, lowStockThreshold,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    const sessionBranchId = (session.user as any).branchId;
    const resolvedBranchId = userRole === "BRANCH_ADMIN"
      ? (sessionBranchId ?? bodyBranchId)
      : bodyBranchId;

    if (!resolvedBranchId) {
      return NextResponse.json({ error: "branchId is required" }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        name,
        barcode: barcode ?? null,
        categoryId: categoryId ?? null,
        branchId: resolvedBranchId,
        productType: productType ?? "STANDARD",
        quantity: quantity ?? 0,
        totalStockBottles: totalStockBottles ?? 0,
        mlPerBottle: mlPerBottle ?? 0,
        activeBottleRemainingMl: activeBottleRemainingMl ?? 0,
        nicotineStrength: nicotineStrength ?? null,
        flavorName: flavorName ?? null,
        brand: brand ?? null,
        purchasePrice: purchasePrice ?? 0,
        bottleSalePrice: bottleSalePrice ?? 0,
        pricePerMl: pricePerMl ?? 0,
        salePrice: salePrice ?? 0,
        lowStockThreshold: lowStockThreshold ?? 5,
      },
      include: {
        category: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("[PRODUCTS_POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
