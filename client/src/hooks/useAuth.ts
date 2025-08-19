import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
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
