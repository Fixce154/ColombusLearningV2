import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface UserNotification {
  id: string;
  userId: string;
  route: string;
  title: string;
  message?: string | null;
  metadata?: Record<string, unknown> | null;
  read: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationsResponse {
  notifications: UserNotification[];
  unreadCounts: Record<string, number>;
  totalUnread: number;
}

export const notificationsQueryKey = ["/api/notifications"] as const;

export function useNotifications() {
  return useQuery<NotificationsResponse>({
    queryKey: notificationsQueryKey,
    queryFn: async () => {
      const response = await fetch("/api/notifications", { credentials: "include" });
      if (!response.ok) {
        throw new Error("Impossible de récupérer les notifications");
      }
      return response.json();
    },
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  });
}

export type MarkNotificationInput = {
  route?: string;
  notificationIds?: string[];
};

export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkNotificationInput) => {
      await apiRequest("/api/notifications/read", "POST", input);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationsQueryKey });
    },
  });
}

export function useRouteNotifications(route: string) {
  const query = useNotifications();

  const notifications = useMemo(
    () =>
      (query.data?.notifications ?? []).filter((notification) => notification.route === route),
    [query.data?.notifications, route]
  );

  const unreadCount = query.data?.unreadCounts?.[route] ?? 0;

  return {
    ...query,
    notifications,
    unreadCount,
  };
}
