import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Cloud, Upload } from "lucide-react";
import type { Plan } from "@shared/schema";

export function StorageQuota() {
  const { user } = useAuth();

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  if (!user || !plans) {
    return (
      <Card data-testid="storage-quota-loading">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
            <div className="h-2 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const currentPlan = plans.find((p) => p.id === user.planId);
  const storageUsed = parseInt(user.storageUsed || '0');
  const storageLimit = parseInt(currentPlan?.storageLimit || '0');
  const usagePercentage = storageLimit > 0 ? (storageUsed * 100) / storageLimit : 0;

  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <Card data-testid="storage-quota-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Cloud className="h-5 w-5 text-mega-accent mr-2" />
            <h3 className="text-lg font-semibold text-mega-text" data-testid="storage-title">Storage Usage</h3>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-500">Plan: {currentPlan?.name}</div>
            <div className="text-lg font-semibold text-mega-text" data-testid="storage-usage">
              {formatBytes(storageUsed)} / {formatBytes(storageLimit)}
            </div>
          </div>
        </div>
        
        <Progress 
          value={usagePercentage} 
          className="h-3 mb-2" 
          data-testid="storage-progress-bar"
        />
        
        <div className="flex justify-between text-sm text-gray-500">
          <span data-testid="storage-percentage">{usagePercentage.toFixed(1)}% used</span>
          <span data-testid="storage-remaining">{formatBytes(storageLimit - storageUsed)} remaining</span>
        </div>
      </CardContent>
    </Card>
  );
}
