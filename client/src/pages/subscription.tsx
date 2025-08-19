import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  CreditCard, 
  Calendar, 
  CheckCircle, 
  AlertTriangle, 
  Zap,
  Star,
  Crown
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface Plan {
  id: string;
  name: string;
  storageLimit: string;
  maxFileSize: string;
  apiCallsLimit: string;
  price: string;
  features: string[];
}

interface SubscriptionInfo {
  currentPlan: string;
  status: 'active' | 'cancelled' | 'past_due';
  nextBillingDate?: string;
  cancelAtPeriodEnd?: boolean;
}

export default function Subscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPlan, setSelectedPlan] = useState<string>("");

  // Fetch available plans
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  // Fetch current subscription info
  const { data: subscriptionInfo } = useQuery<SubscriptionInfo>({
    queryKey: ["/api/subscription/info"],
  });

  // Change plan mutation
  const changePlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      return apiRequest("/api/subscription/change-plan", "POST", { planId });
    },
    onSuccess: () => {
      toast({
        title: "Plano alterado",
        description: "O seu plano foi alterado com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/info"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao alterar plano",
        description: error.message || "Ocorreu um erro ao alterar o plano.",
        variant: "destructive",
      });
    },
  });

  // Cancel subscription mutation
  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/subscription/cancel", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Subscrição cancelada",
        description: "A sua subscrição será cancelada no final do período atual.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar",
        description: error.message || "Ocorreu um erro ao cancelar a subscrição.",
        variant: "destructive",
      });
    },
  });

  // Reactivate subscription mutation
  const reactivateSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("/api/subscription/reactivate", "POST", {});
    },
    onSuccess: () => {
      toast({
        title: "Subscrição reativada",
        description: "A sua subscrição foi reativada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/info"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao reativar",
        description: error.message || "Ocorreu um erro ao reativar a subscrição.",
        variant: "destructive",
      });
    },
  });

  const getPlanIcon = (planId: string) => {
    switch (planId) {
      case 'basic':
        return <Zap className="h-5 w-5" />;
      case 'pro':
        return <Star className="h-5 w-5" />;
      case 'premium':
        return <Crown className="h-5 w-5" />;
      default:
        return <Zap className="h-5 w-5" />;
    }
  };

  const getPlanColor = (planId: string) => {
    switch (planId) {
      case 'basic':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'pro':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'premium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Ativo</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      case 'past_due':
        return <Badge className="bg-orange-100 text-orange-800">Em atraso</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Desconhecido</Badge>;
    }
  };

  const currentPlan = plans.find(plan => plan.id === user?.planId);
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mega-text">Subscrição</h1>
          <p className="text-gray-600 mt-2">Gerir a sua subscrição e plano atual</p>
        </div>

        {/* Current Subscription Status */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Estado da Subscrição
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${getPlanColor(user?.planId || 'basic')}`}>
                    {getPlanIcon(user?.planId || 'basic')}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{currentPlan?.name || 'Basic'}</h3>
                    <p className="text-gray-600">Plano atual</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {subscriptionInfo?.status && getStatusBadge(subscriptionInfo.status)}
                  {subscriptionInfo?.cancelAtPeriodEnd && (
                    <Badge variant="outline" className="text-orange-600">
                      Cancela no fim do período
                    </Badge>
                  )}
                </div>

                {subscriptionInfo?.nextBillingDate && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    Próxima faturação: {new Date(subscriptionInfo.nextBillingDate).toLocaleDateString('pt-PT')}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Funcionalidades do plano atual:</h4>
                <ul className="space-y-2">
                  {currentPlan?.features?.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {subscriptionInfo?.cancelAtPeriodEnd ? (
              <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  <h4 className="font-medium text-orange-800">Subscrição será cancelada</h4>
                </div>
                <p className="text-sm text-orange-700 mb-4">
                  A sua subscrição será cancelada no final do período atual.
                </p>
                <Button
                  onClick={() => reactivateSubscriptionMutation.mutate()}
                  disabled={reactivateSubscriptionMutation.isPending}
                  variant="outline"
                  className="border-orange-300 text-orange-700 hover:bg-orange-50"
                  data-testid="reactivate-subscription-button"
                >
                  Reativar Subscrição
                </Button>
              </div>
            ) : (
              <div className="mt-6 pt-6 border-t">
                <Button
                  onClick={() => cancelSubscriptionMutation.mutate()}
                  disabled={cancelSubscriptionMutation.isPending}
                  variant="outline"
                  className="text-red-600 border-red-300 hover:bg-red-50"
                  data-testid="cancel-subscription-button"
                >
                  Cancelar Subscrição
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-mega-text mb-6">Planos Disponíveis</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card 
                key={plan.id} 
                className={`relative transition-all hover:shadow-md ${
                  plan.id === user?.planId 
                    ? 'ring-2 ring-mega-red border-mega-red' 
                    : selectedPlan === plan.id 
                      ? 'ring-2 ring-blue-500 border-blue-500' 
                      : ''
                }`}
              >
                {plan.id === user?.planId && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <Badge className="bg-mega-red text-white">Plano Atual</Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <div className={`inline-flex p-3 rounded-full mx-auto mb-4 ${getPlanColor(plan.id)}`}>
                    {getPlanIcon(plan.id)}
                  </div>
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="text-2xl font-bold text-mega-text">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-600">/mês</span>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="space-y-3 mb-6">
                    <div className="text-sm">
                      <span className="font-medium">Armazenamento:</span> {plan.storageLimit}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Tamanho máximo:</span> {plan.maxFileSize}
                    </div>
                    <div className="text-sm">
                      <span className="font-medium">Chamadas API:</span> {plan.apiCallsLimit}
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <ul className="space-y-2 mb-6">
                    {plan.features?.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  {plan.id !== user?.planId && (
                    <Button
                      onClick={() => {
                        setSelectedPlan(plan.id);
                        changePlanMutation.mutate(plan.id);
                      }}
                      disabled={changePlanMutation.isPending}
                      className="w-full bg-mega-red hover:bg-red-600"
                      data-testid={`select-plan-${plan.id}`}
                    >
                      {changePlanMutation.isPending && selectedPlan === plan.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Alterando...
                        </>
                      ) : (
                        'Alterar para este plano'
                      )}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Billing Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Informações de Faturação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-600">
              <CreditCard className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>As informações de faturação serão exibidas aqui quando disponíveis.</p>
              <p className="text-sm mt-2">Contacte o suporte para alterar o método de pagamento.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}