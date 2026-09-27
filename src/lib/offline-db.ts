import Dexie, { type Table } from "dexie";

export interface OfflineProduct {
  id: string;
  name: string;
  barcode?: string;
  branchId: string;
  categoryId?: string;
  productType: "STANDARD" | "LIQUID";
  quantity: number;
  totalStockBottles: number;
  mlPerBottle: number;
  activeBottleRemainingMl: number;
  nicotineStrength?: string;
  flavorName?: string;
  brand?: string;
  purchasePrice: number;
  bottleSalePrice: number;
  pricePerMl: number;
  salePrice: number;
  lowStockThreshold: number;
  updatedAt: string;
}

export interface OfflineSale {
  id: string;
  invoiceNo: string;
  branchId: string;
  userId: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  notes?: string;
  items: OfflineSaleItem[];
  createdAt: string;
  synced: boolean;
}

export interface OfflineSaleItem {
  id: string;
  productId: string;
  quantity: number;
  mlSold: number;
  isFullBottle: boolean;
  unitPrice: number;
  discount: number;
  totalPrice: number;
}

export interface OfflineCategory {
  id: string;
  name: string;
  branchId: string;
}

export interface SyncQueue {
  id?: number;
  type: "SALE" | "PRODUCT_UPDATE" | "CATEGORY";
  payload: string; // JSON stringified
  createdAt: string;
  retryCount: number;
}

class VapePOSDatabase extends Dexie {
  products!: Table<OfflineProduct>;
  sales!: Table<OfflineSale>;
  categories!: Table<OfflineCategory>;
  syncQueue!: Table<SyncQueue>;

  constructor() {
    super("VapePOSDB");

    this.version(1).stores({
      products: "id, barcode, branchId, productType, name",
      sales: "id, invoiceNo, branchId, userId, createdAt, synced",
      categories: "id, branchId",
      syncQueue: "++id, type, createdAt",
    });
  }
}

export const db = new VapePOSDatabase();

// ML Liquid Math Logic
export async function deductMlFromBottle(
  productId: string,
  mlToDeduct: number
): Promise<{ bottlesDeducted: number; remainingMl: number }> {
  const product = await db.products.get(productId);
  if (!product || product.productType !== "LIQUID") {
    throw new Error("Product not found or not a liquid product");
  }

  let remainingMl = product.activeBottleRemainingMl - mlToDeduct;
  let totalStockBottles = product.totalStockBottles;
  let bottlesDeducted = 0;

  // Auto-decrement when active bottle runs out
  while (remainingMl < 0 && totalStockBottles > 0) {
    totalStockBottles -= 1;
    bottlesDeducted += 1;
    remainingMl += product.mlPerBottle;
  }

  // Clamp to 0 if stock runs out completely
  if (remainingMl < 0) remainingMl = 0;

  await db.products.update(productId, {
    activeBottleRemainingMl: remainingMl,
    totalStockBottles,
    updatedAt: new Date().toISOString(),
  });

  return { bottlesDeducted, remainingMl };
}

// Deduct full bottle
export async function deductFullBottle(
  productId: string,
  qty: number
): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) throw new Error("Product not found");

  await db.products.update(productId, {
    totalStockBottles: Math.max(0, product.totalStockBottles - qty),
    updatedAt: new Date().toISOString(),
  });
}

// Deduct standard product quantity
export async function deductStandardQty(
  productId: string,
  qty: number
): Promise<void> {
  const product = await db.products.get(productId);
  if (!product) throw new Error("Product not found");

  await db.products.update(productId, {
    quantity: Math.max(0, product.quantity - qty),
    updatedAt: new Date().toISOString(),
  });
}

// Add to sync queue
export async function addToSyncQueue(
  type: SyncQueue["type"],
  payload: object
): Promise<void> {
  await db.syncQueue.add({
    type,
    payload: JSON.stringify(payload),
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

// Sync offline sales to server
export async function syncOfflineData(): Promise<{
  synced: number;
  failed: number;
}> {
  const unsynced = await db.sales.where("synced").equals(0).toArray();
  let synced = 0;
  let failed = 0;

  for (const sale of unsynced) {
    try {
      const response = await fetch("/api/sales/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sale),
      });

      if (response.ok) {
        await db.sales.update(sale.id, { synced: true });
        synced++;
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  // Process sync queue
  const queueItems = await db.syncQueue.toArray();
  for (const item of queueItems) {
    try {
      const response = await fetch(`/api/sync/${item.type.toLowerCase()}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: item.payload,
      });

      if (response.ok) {
        await db.syncQueue.delete(item.id!);
      } else {
        await db.syncQueue.update(item.id!, {
          retryCount: item.retryCount + 1,
        });
      }
    } catch {
      await db.syncQueue.update(item.id!, {
        retryCount: item.retryCount + 1,
      });
    }
  }

  return { synced, failed };
}
