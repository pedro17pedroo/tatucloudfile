import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Upload, Key, Cloud } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import type { Plan } from "@shared/schema";

function formatStorageSize(bytes: string): string {
  const size = parseInt(bytes);
  const gb = size / (1024 * 1024 * 1024);
  return `${gb}GB`;
}

function formatPrice(price: string): string {
  const priceNum = parseFloat(price);
  return priceNum === 0 ? "Grátis" : `€${priceNum}/mês`;
}

export default function PlanSelectionPage() {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const { data: plans = [], isLoading } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  const selectPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      await apiRequest("/api/portal/user/select-plan", "POST", { planId });
    },
    onSuccess: () => {
      toast({
        title: "Plano selecionado com sucesso!",
        description: "Pode agora começar a usar o sistema de gestão de ficheiros.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: (error) => {
      toast({
        title: "Erro ao seleccionar plano",
        description: "Tente novamente.",
        variant: "destructive",
      });
      console.error("Error selecting plan:", error);
    },
  });

  const handleSelectPlan = (planId: string) => {
    setSelectedPlan(planId);
    selectPlanMutation.mutate(planId);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#D9272E] mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-300">A carregar planos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-6">
            <Cloud className="h-12 w-12 text-[#D9272E] mr-3" />
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              MEGA File Manager
            </h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Escolha o seu plano
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Seleccione o plano que melhor se adapta às suas necessidades de armazenamento e API.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card 
              key={plan.id} 
              className={`relative border-2 transition-all duration-300 hover:shadow-lg ${
                plan.id === "pro" 
                  ? "border-[#D9272E] shadow-lg scale-105" 
                  : "border-gray-200 dark:border-gray-700 hover:border-[#D9272E]"
              }`}
              data-testid={`card-plan-${plan.id}`}
            >
              {plan.id === "pro" && (
                <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-[#D9272E] text-white px-4 py-1">
                  Mais Popular
                </Badge>
              )}
              
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </CardTitle>
                <div className="mt-2">
                  <span className="text-4xl font-bold text-[#D9272E]">
                    {formatPrice(plan.pricePerMonth)}
                  </span>
                </div>
                <CardDescription className="text-gray-600 dark:text-gray-300 mt-2">
                  {plan.id === "basic" && "Perfeito para uso pessoal"}
                  {plan.id === "pro" && "Ideal para pequenas empresas"}
                  {plan.id === "premium" && "Para utilizadores avançados"}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {formatStorageSize(plan.storageLimit)} de armazenamento
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Key className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      {plan.apiCallsPerHour} chamadas API/hora
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <Upload className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Upload/Download ilimitado
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      Interface web completa
                    </span>
                  </div>

                  <div className="flex items-center">
                    <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-gray-300">
                      API RESTful para developers
                    </span>
                  </div>

                  {plan.id !== "basic" && (
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                      <span className="text-gray-700 dark:text-gray-300">
                        Suporte prioritário
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={selectPlanMutation.isPending && selectedPlan === plan.id}
                  className={`w-full mt-6 ${
                    plan.id === "pro"
                      ? "bg-[#D9272E] hover:bg-[#B91C1C] text-white"
                      : "bg-gray-900 hover:bg-gray-800 dark:bg-gray-100 dark:hover:bg-gray-200 dark:text-gray-900 text-white"
                  }`}
                  data-testid={`button-select-plan-${plan.id}`}
                >
                  {selectPlanMutation.isPending && selectedPlan === plan.id ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      A seleccionar...
                    </div>
                  ) : (
                    <>
                      Seleccionar {plan.name}
                      {plan.id === "basic" && " (Grátis)"}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Pode alterar o seu plano a qualquer momento nas definições da conta.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Todos os planos incluem armazenamento seguro na cloud MEGA e acesso total à API.
          </p>
        </div>
      </div>
    </div>
  );
}