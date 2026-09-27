import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSaleTransaction, SaleInput } from "@/app/api/sales/route";

/**
 * POST /api/sales/sync
 * Idempotent offline-sync endpoint.
 * Receives a sale from the Dexie offline queue and persists it only if it
 * hasn't been synced before (checked by invoiceNo uniqueness).
 */
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
      return NextResponse.json(
        { error: "Sale must contain at least one item" },
        { status: 400 }
      );
    }

    // Idempotency check — if invoiceNo already exists, return early
    const existing = await prisma.sale.findUnique({
      where: { invoiceNo },
      select: { id: true, invoiceNo: true },
    });

    if (existing) {
      return NextResponse.json(
        { exists: true, saleId: existing.id, message: "Sale already synced" },
        { status: 200 }
      );
    }

    // Attach session user if userId not provided in payload
    const saleData: SaleInput = {
      ...body,
      userId: body.userId ?? session.user.id,
    };

    const sale = await createSaleTransaction(saleData);

    return NextResponse.json({ success: true, sale }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("[SALES_SYNC_POST]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
