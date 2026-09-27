"use client";

import { useSession, signOut } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  BarChart3,
  Tag,
  Receipt,
  Building2,
  Users,
  LogOut,
  Menu,
  X,
  Zap,
  ChevronRight,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "POS Billing", href: "/pos", icon: ShoppingCart },
  { label: "Products", href: "/products", icon: Package },
  { label: "Sales", href: "/sales", icon: BarChart3 },
  { label: "Categories", href: "/categories", icon: Tag },
  { label: "Expenses", href: "/expenses", icon: Receipt },
  {
    label: "Branches",
    href: "/branches",
    icon: Building2,
    roles: ["SUPER_ADMIN", "BRANCH_ADMIN"],
  },
  {
    label: "Users",
    href: "/users",
    icon: Users,
    roles: ["SUPER_ADMIN", "BRANCH_ADMIN"],
  },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const role = (session?.user as any)?.role as string | undefined;
  const userName = session?.user?.name ?? "User";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
    }
  }, [status, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const filteredNav = navItems.filter((item) => {
    if (!item.roles) return true;
    return role && item.roles.includes(role);
  });

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-5 border-b border-violet-800/40">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-white/10">
          <Zap className="w-5 h-5 text-violet-200" />
        </div>
        <div>
          <span className="text-lg font-bold text-white tracking-tight">VapePOS</span>
          <p className="text-xs text-violet-300 -mt-0.5">Point of Sale</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 }
            >
              <Icon
                size={18}
                className={lex-shrink-0 }
              />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 text-violet-400" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-violet-800/40">
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/5 mb-2">
          <div className="w-8 h-8 rounded-full bg-violet-400 flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{userName}</p>
            <p className="text-xs text-violet-300 truncate">{role ?? "—"}</p>
          </div>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition-all duration-150 group"
        >
          <LogOut className="w-4 h-4 text-violet-300 group-hover:text-white" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
          <p className="text-sm text-gray-500">Loading VapePOS…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <aside className="hidden lg:flex lg:flex-col w-60 bg-gradient-to-b from-violet-700 to-violet-900 fixed inset-y-0 left-0 z-30 shadow-xl">
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={ixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-violet-700 to-violet-900 shadow-2xl transform transition-transform duration-300 ease-in-out lg:hidden }
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-violet-200 hover:text-white hover:bg-white/10 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-gray-900">VapePOS</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}