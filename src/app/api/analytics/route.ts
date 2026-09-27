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

    // Resolve branchId
    const userRole = (session.user as any).role as string;
    let branchId: string | undefined;
    if (userRole === "SUPER_ADMIN") {
      branchId = searchParams.get("branchId") ?? undefined;
    } else {
      branchId = (session.user as any).branchId ?? undefined;
    }

    const branchFilter = branchId ? { branchId } : {};

    // ── Date helpers ──────────────────────────────────────────────────────────
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // ── 7-day window ──────────────────────────────────────────────────────────
    const sevenDaysAgo = new Date(todayStart);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    // Run all queries in parallel
    const [
      todaySalesAgg,
      thisMonthSalesAgg,
      totalProducts,
      lowStockStandard,
      lowStockLiquid,
      recentSales,
      salesLast7Days,
      topProductsRaw,
    ] = await Promise.all([
      // Today's total revenue
      prisma.sale.aggregate({
        where: { ...branchFilter, createdAt: { gte: todayStart, lte: todayEnd } },
        _sum: { total: true },
      }),

      // This month's total revenue
      prisma.sale.aggregate({
        where: { ...branchFilter, createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { total: true },
      }),

      // Total active products
      prisma.product.count({ where: branchFilter }),

      // Low-stock STANDARD products (quantity <= lowStockThreshold)
      // Note: SQLite does not support column references in where clauses, using raw query workaround
      prisma.product.findMany({
        where: {
          ...branchFilter,
          productType: "STANDARD",
        },
        select: { id: true, name: true, quantity: true, lowStockThreshold: true, productType: true },
      }),

      // Low-stock LIQUID products (totalStockBottles <= 5)
      prisma.product.findMany({
        where: {
          ...branchFilter,
          productType: "LIQUID",
          totalStockBottles: { lte: 5 },
        },
        select: {
          id: true,
          name: true,
          totalStockBottles: true,
          activeBottleRemainingMl: true,
          productType: true,
        },
      }),

      // Last 5 sales
      prisma.sale.findMany({
        where: branchFilter,
        include: {
          user: { select: { id: true, name: true } },
          items: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),

      // Daily sales for the last 7 days (raw group-by via groupBy)
      prisma.sale.findMany({
        where: {
          ...branchFilter,
          createdAt: { gte: sevenDaysAgo, lte: todayEnd },
        },
        select: { createdAt: true, total: true },
      }),

      // Top 5 products by total revenue (sum of saleItem.totalPrice)
      prisma.saleItem.groupBy({
        by: ["productId"],
        where: {
          sale: {
            ...branchFilter,
          },
        },
        _sum: { totalPrice: true },
        orderBy: { _sum: { totalPrice: "desc" } },
        take: 5,
      }),
    ]);

    // ── Build daily sales chart ───────────────────────────────────────────────
    const dailyMap: Record<string, number> = {};
    // Pre-populate all 7 days with 0
    for (let i = 0; i < 7; i++) {
      const d = new Date(sevenDaysAgo);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = 0;
    }
    for (const sale of salesLast7Days) {
      const key = sale.createdAt.toISOString().split("T")[0];
      dailyMap[key] = (dailyMap[key] ?? 0) + sale.total;
    }
    const dailySalesLast7Days = Object.entries(dailyMap).map(([date, total]) => ({
      date,
      total,
    }));

    // ── Resolve top products with names ──────────────────────────────────────
    const topProductIds = topProductsRaw.map((r) => r.productId);
    const topProductDetails = await prisma.product.findMany({
      where: { id: { in: topProductIds } },
      select: { id: true, name: true, productType: true },
    });
    const productNameMap = Object.fromEntries(
      topProductDetails.map((p) => [p.id, p])
    );
    const topProducts = topProductsRaw.map((r) => ({
      productId: r.productId,
      name: productNameMap[r.productId]?.name ?? "Unknown",
      productType: productNameMap[r.productId]?.productType,
      totalRevenue: r._sum.totalPrice ?? 0,
    }));

    // ── Combine low-stock lists ───────────────────────────────────────────────
    // Filter STANDARD products where quantity <= lowStockThreshold (JS side since SQLite
    // does not support column-reference comparisons in Prisma where clauses)
    const filteredLowStockStandard = lowStockStandard.filter(
      (p) => p.quantity <= p.lowStockThreshold
    );
    const lowStockProducts = [...filteredLowStockStandard, ...lowStockLiquid];

    return NextResponse.json({
      todaySales: todaySalesAgg._sum.total ?? 0,
      thisMonthSales: thisMonthSalesAgg._sum.total ?? 0,
      totalProducts,
      lowStockProducts,
      recentSales,
      dailySalesLast7Days,
      topProducts,
    });
  } catch (error) {
    console.error("[ANALYTICS_GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
