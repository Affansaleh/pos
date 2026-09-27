import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ProductsClient from "@/components/products/ProductsClient";

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as any).role as string;
  const branchId = (session.user as any).branchId as string;

  const branchFilter = role === "SUPER_ADMIN" ? {} : { branchId };

  const products = await prisma.product.findMany({
    where: branchFilter,
    include: {
      category: { select: { id: true, name: true } },
      branch: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const categories = await prisma.category.findMany({
    where: branchFilter,
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-500 text-sm">Manage your inventory</p>
        </div>
      </div>
      <ProductsClient
        initialProducts={products}
        categories={categories}
        userRole={role}
        branchId={branchId}
      />
    </div>
  );
}