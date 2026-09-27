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
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10)));
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let branchId: string | undefined;
    const userRole = (session.user as any).role as string;
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

    const where = {
      ...(branchId ? { branchId } : {}),
      ...(Object.keys(dateFilter).length > 0 ? { createdAt: dateFilter } : {}),
    };

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, productType: true },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: sales,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("[SALES_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─── Shared sale creation logic ─────────────────────────────────────────────

export interface SaleItemInput {
  productId: string;
  quantity: number;
  mlSold?: number;
  isFullBottle?: boolean;
  unitPrice: number;
  discount?: number;
  totalPrice: number;
}

export interface SaleInput {
  invoiceNo: string;
  branchId: string;
  userId?: string;
  subtotal: number;
  discount?: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  items: SaleItemInput[];
}

export async function createSaleTransaction(data: SaleInput) {
  return prisma.$transaction(async (tx) => {
    // Process inventory for each item
    for (const item of data.items) {
      const product = await tx.product.findUnique({
        where: { id: item.productId },
      });

      if (!product) {
        throw new Error(`Product ${item.productId} not found`);
      }

      if (product.productType === "LIQUID") {
        if (item.isFullBottle) {
          // Deduct whole bottles
          const newBottleCount = (product.totalStockBottles ?? 0) - item.quantity;
          if (newBottleCount < 0) {
            throw new Error(`Insufficient bottle stock for product: ${product.name}`);
          }
          await tx.product.update({
            where: { id: item.productId },
            data: { totalStockBottles: newBottleCount },
          });
        } else {
          // Deduct ml from active bottle
          const mlToDeduct = item.mlSold ?? 0;
          let remainingMl = (product.activeBottleRemainingMl ?? product.mlPerBottle ?? 0) - mlToDeduct;
          let bottleCount = product.totalStockBottles ?? 0;

          // If active bottle exhausted, open next bottle
          if (remainingMl <= 0) {
            bottleCount = Math.max(0, bottleCount - 1);
            // Reset to a full bottle minus any overflow consumption
            const mlPerBottle = product.mlPerBottle ?? 0;
            remainingMl = mlPerBottle + remainingMl; // remainingMl is negative, so this subtracts
            if (remainingMl < 0) remainingMl = 0; // safety clamp
          }

          await tx.product.update({
            where: { id: item.productId },
            data: {
              totalStockBottles: bottleCount,
              activeBottleRemainingMl: remainingMl,
            },
          });
        }
      } else {
        // STANDARD product
        const newQty = product.quantity - item.quantity;
        if (newQty < 0) {
          throw new Error(`Insufficient stock for product: ${product.name}`);
        }
        await tx.product.update({
          where: { id: item.productId },
          data: { quantity: newQty },
        });
      }
    }

    // Create the sale record
    const sale = await tx.sale.create({
      data: {
        invoiceNo: data.invoiceNo,
        branchId: data.branchId,
        userId: data.userId!,
        subtotal: data.subtotal,
        discount: data.discount ?? 0,
        total: data.total,
        paymentMethod: data.paymentMethod,
        notes: data.notes ?? undefined,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            mlSold: item.mlSold ?? 0,
            isFullBottle: item.isFullBottle ?? false,
            unitPrice: item.unitPrice,
            discount: item.discount ?? 0,
            totalPrice: item.totalPrice,
          })),
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        items: {
          include: {
            product: { select: { id: true, name: true, productType: true } },
          },
        },
      },
    });

    return sale;
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: SaleInput = await req.json();

    const { invoiceNo, branchId, subtotal, total, paymentMethod, items } = body;

    if (!invoiceNo || !branchId || subtotal === undefined || total === undefined || !paymentMethod) {
      return NextResponse.json(
        { error: "invoiceNo, branchId, subtotal, total, and paymentMethod are required" },
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json({ error: "Sale must contain at least one item" }, { status: 400 });
    }

    // Use session userId if not provided
    const saleData: SaleInput = {
      ...body,
      userId: body.userId ?? session.user.id,
    };

    const sale = await createSaleTransaction(saleData);

    return NextResponse.json(sale, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[SALES_POST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
