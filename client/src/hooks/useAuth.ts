import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      const res = await fetch("/api/auth/user", { credentials: "include" });
      if (res.status === 401) {
        return null; // Return null for unauthorized instead of throwing
      }
      if (!res.ok) {
        throw new Error(`${res.status}: ${res.statusText}`);
      }
      const data = await res.json();
      return data.user || null;
    },
  });

  // Check if user needs plan selection
  const errorData = error as any;
  const needsPlanSelection = errorData?.message?.includes('Plan required') || 
    errorData?.response?.data?.error === 'NO_PLAN';

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    needsPlanSelection,
  };
}
