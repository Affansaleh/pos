"use client";

import { signOut } from "next-auth/react";

interface Props {
  user: { name: string; email: string; role: string };
  stats: {
    todaySales: number;
    thisMonthSales: number;
    totalProducts: number;
    lowStockCount: number;
    recentSales: any[];
  };
}

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  BRANCH_ADMIN: "Branch Admin",
  CASHIER: "Cashier",
};

const roleColor: Record<string, string> = {
  SUPER_ADMIN: "bg-violet-100 text-violet-700",
  BRANCH_ADMIN: "bg-blue-100 text-blue-700",
  CASHIER: "bg-green-100 text-green-700",
};

function formatPKR(amount: number) {
  return "Rs " + amount.toLocaleString("en-PK", { maximumFractionDigits: 0 });
}

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-PK", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardClient({ user, stats }: Props) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <span className="text-lg font-bold text-gray-900">VapePOS</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-400">{user.email}</p>
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${roleColor[user.role] ?? "bg-gray-100 text-gray-600"}`}>
            {roleLabel[user.role] ?? user.role}
          </span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-red-600 transition font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            خوش آمدید، {user.name} 👋
          </h2>
          <p className="text-gray-500 mt-1 text-sm">یہاں آپ کا آج کا overview ہے</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            label="آج کی سیل"
            value={formatPKR(stats.todaySales)}
            icon="💰"
            color="violet"
          />
          <StatCard
            label="اس مہینے کی سیل"
            value={formatPKR(stats.thisMonthSales)}
            icon="📅"
            color="blue"
          />
          <StatCard
            label="کل مصنوعات"
            value={stats.totalProducts.toString()}
            icon="📦"
            color="green"
          />
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="text-base font-semibold text-gray-700 mb-3">Quick Links</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <QuickLink href="/pos" label="POS Billing" icon="🛒" />
            <QuickLink href="/products" label="Products" icon="📦" />
            <QuickLink href="/sales" label="Sales" icon="📊" />
            {(user.role === "SUPER_ADMIN" || user.role === "BRANCH_ADMIN") && (
              <QuickLink href="/branches" label="Branches" icon="🏪" />
            )}
          </div>
        </div>

        {/* Recent Sales */}
        <div>
          <h3 className="text-base font-semibold text-gray-700 mb-3">آخری Sales</h3>
          {stats.recentSales.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-8 text-center text-gray-400">
              <p className="text-4xl mb-2">🧾</p>
              <p>ابھی کوئی sale نہیں ہوئی</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Invoice</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Cashier</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Items</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Total</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-500 uppercase">وقت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {stats.recentSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50 transition">
                      <td className="px-5 py-3 font-mono text-violet-600 font-medium">{sale.invoiceNo}</td>
                      <td className="px-5 py-3 text-gray-700">{sale.user?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-gray-500">{sale.items?.length ?? 0} items</td>
                      <td className="px-5 py-3 text-right font-semibold text-gray-900">{formatPKR(sale.total)}</td>
                      <td className="px-5 py-3 text-right text-gray-400">{formatDate(sale.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

function StatCard({
  label, value, icon, color,
}: { label: string; value: string; icon: string; color: string }) {
  const colors: Record<string, string> = {
    violet: "bg-violet-50 border-violet-100",
    blue: "bg-blue-50 border-blue-100",
    green: "bg-green-50 border-green-100",
  };
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-2xl mb-2">{icon}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-sm text-gray-500 mt-1">{label}</p>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: string }) {
  return (
    <a
      href={href}
      className="bg-white border border-gray-100 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-violet-200 hover:bg-violet-50 transition group"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-sm font-medium text-gray-700 group-hover:text-violet-700">{label}</span>
    </a>
  );
}
