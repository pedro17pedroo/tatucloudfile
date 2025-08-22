import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";

interface Plan {
  id: string;
  name: string;
  storageLimit: string;
  pricePerMonth: string;
  apiCallsPerHour: number;
}

interface RegisterStep1Props {
  selectedPlan: string;
  onPlanSelect: (planId: string) => void;
  onNext: () => void;
}

export default function RegisterStep1({ selectedPlan, onPlanSelect, onNext }: RegisterStep1Props) {
  const [, navigate] = useLocation();
  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/auth/plans"],
  });

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? "Grátis" : `${numPrice.toLocaleString('pt-AO')} Kz/mês`;
  };

  const formatStorage = (bytes: string) => {
    const size = parseInt(bytes);
    const gb = size / (1024 * 1024 * 1024);
    return `${gb}GB`;
  };

  const getPlanFeatures = (planId: string) => {
    switch (planId) {
      case 'basic':
        return ['Upload básico', 'API limitada', 'Suporte por email'];
      case 'pro':
        return ['Upload rápido', 'API expandida', 'Suporte prioritário', 'Integrações avançadas'];
      case 'premium':
        return ['Upload ilimitado', 'API completa', 'Suporte 24/7', 'Recursos empresariais', 'Backup automático'];
      default:
        return [];
    }
  };

  return (
    <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/")}
            className="absolute left-4 top-4"
            data-testid="back-to-home-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-3xl font-bold text-mega-text">
            Escolha o seu plano
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Selecione o plano que melhor se adapta às suas necessidades
          </p>
        </CardHeader>

        <CardContent className="p-8">
          <div className="grid gap-6 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative p-6 border-2 rounded-xl cursor-pointer transition-all hover:shadow-lg ${
                  selectedPlan === plan.id
                    ? 'border-tatu-green bg-tatu-green/5 shadow-lg'
                    : 'border-gray-200 hover:border-gray-300'
                } ${plan.id === 'pro' ? 'ring-2 ring-blue-100' : ''}`}
                onClick={() => onPlanSelect(plan.id)}
                data-testid={`plan-${plan.id}`}
              >
                {plan.id === 'pro' && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Recomendado
                    </span>
                  </div>
                )}
                
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-tatu-text">{plan.name}</h3>
                  {selectedPlan === plan.id && (
                    <CheckCircle className="h-6 w-6 text-tatu-green" />
                  )}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-bold text-tatu-text">
                    {formatPrice(plan.pricePerMonth)}
                  </div>
                  <div className="text-sm text-gray-600">
                    {formatStorage(plan.storageLimit)} de armazenamento
                  </div>
                  <div className="text-sm text-gray-600">
                    {plan.apiCallsPerHour} chamadas API/hora
                  </div>
                </div>

                <ul className="space-y-2 mb-6">
                  {getPlanFeatures(plan.id).map((feature, index) => (
                    <li key={index} className="flex items-center text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-8">
            <Button
              onClick={onNext}
              disabled={!selectedPlan}
              className="bg-tatu-green hover:bg-green-600 text-white px-8"
              data-testid="continue-button"
            >
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}