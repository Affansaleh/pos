"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { syncOfflineData } from "@/lib/offline-db";
import { useToast } from "@/hooks/use-toast";

export function OfflineSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const isOnlineRef = useRef(typeof window !== "undefined" ? navigator.onLine : true);
  const { toast } = useToast();

  useEffect(() => {
    if (!session?.user) return;

    const handleOnline = async () => {
      if (!isOnlineRef.current) {
        isOnlineRef.current = true;
        toast({
          title: "Back Online",
          description: "Syncing offline data to server...",
        });

        try {
          const { synced, failed } = await syncOfflineData();
          if (synced > 0) {
            toast({
              title: "Sync Complete",
              description: `${synced} transaction(s) synced successfully.`,
            });
          }
          if (failed > 0) {
            toast({
              title: "Sync Warning",
              description: `${failed} transaction(s) failed to sync. Will retry later.`,
              variant: "destructive",
            });
          }
        } catch (error) {
          console.error("Sync error:", error);
        }
      }
    };

    const handleOffline = () => {
      isOnlineRef.current = false;
      toast({
        title: "Offline Mode Active",
        description: "Sales will be saved locally and synced when reconnected.",
        variant: "destructive",
      });
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Attempt sync on mount if online
    if (navigator.onLine) {
      syncOfflineData().catch(console.error);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [session, toast]);

  return <>{children}</>;
}
