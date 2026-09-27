import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import POSClient from "@/components/pos/POSClient";

export default async function POSPage() {
  const session = await auth();
  if (!session?.user) return null;

  const role = (session.user as any).role as string;
  const branchId = (session.user as any).branchId as string;
  const userId = session.user.id as string;

  const branchFilter = role === "SUPER_ADMIN" ? {} : { branchId };

  const products = await prisma.product.findMany({
    where: branchFilter,
    include: { category: true },
    orderBy: { name: "asc" },
  });

  return (
    <POSClient 
      initialProducts={products} 
      branchId={branchId}
      userId={userId}
    />
  );
}