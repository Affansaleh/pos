import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const user = session.user as any;

  // Fetch analytics data
  let stats = {
    todaySales: 0,
    thisMonthSales: 0,
    totalProducts: 0,
    lowStockCount: 0,
    recentSales: [] as any[],
  };

  try {
    const branchFilter = user.role === "SUPER_ADMIN" ? {} : { branchId: user.branchId };

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [todayAgg, monthAgg, totalProducts, recentSales] = await Promise.all([
      prisma.sale.aggregate({
        where: { ...branchFilter, createdAt: { gte: todayStart } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.sale.aggregate({
        where: { ...branchFilter, createdAt: { gte: monthStart } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.product.count({ where: branchFilter }),
      prisma.sale.findMany({
        where: branchFilter,
        include: {
          user: { select: { name: true } },
          items: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
    ]);

    stats = {
      todaySales: todayAgg._sum.total ?? 0,
      thisMonthSales: monthAgg._sum.total ?? 0,
      totalProducts,
      lowStockCount: 0,
      recentSales,
    };
  } catch (e) {
    console.error("Dashboard data error:", e);
  }

  return (
    <DashboardClient
      user={{
        name: user.name ?? "User",
        email: user.email ?? "",
        role: user.role ?? "CASHIER",
      }}
      stats={stats}
    />
  );
}
