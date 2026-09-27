"use client";

import { useState } from "react";
import { Plus, Search, Trash2, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProductsClient({ initialProducts, categories, userRole, branchId }: any) {
  const [products, setProducts] = useState(initialProducts);
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const filtered = products.filter((p: any) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.barcode?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
          />
        </div>
        {(userRole === "SUPER_ADMIN" || userRole === "BRANCH_ADMIN") && (
          <button className="flex items-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg text-sm font-medium hover:bg-violet-700">
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Category</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Stock</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Price</th>
                <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{p.name}</div>
                    {p.barcode && <div className="text-xs text-gray-400">{p.barcode}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={px-2 py-1 rounded-full text-xs font-medium }>
                      {p.productType}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{p.category?.name ?? '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {p.productType === 'LIQUID' ? (
                      <div>
                        <div className="font-medium">{p.totalStockBottles} btls</div>
                        <div className="text-xs text-gray-500">{p.activeBottleRemainingMl} ml active</div>
                      </div>
                    ) : (
                      <span className="font-medium">{p.quantity}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="font-medium">Rs {p.salePrice || p.bottleSalePrice}</div>
                    {p.productType === 'LIQUID' && <div className="text-xs text-gray-500">Rs {p.pricePerMl}/ml</div>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(userRole === "SUPER_ADMIN" || userRole === "BRANCH_ADMIN") && (
                      <div className="flex items-center justify-end gap-2">
                        <button className="p-1 text-gray-400 hover:text-violet-600 rounded">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button className="p-1 text-gray-400 hover:text-red-600 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}