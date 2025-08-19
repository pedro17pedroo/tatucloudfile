import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RegisterStep1 from "./register-step-1";
import RegisterStep2 from "./register-step-2";
import RegisterStep3 from "./register-step-3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Home } from "lucide-react";

export default function Register() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("");
  const [contactMethod, setContactMethod] = useState<'email' | 'phone'>('email');
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const registerMutation = useMutation({
    mutationFn: async () => {
      const registrationData = {
        ...(contactMethod === 'email' ? { email: formData.email } : { phone: formData.phone }),
        firstName: formData.firstName,
        lastName: formData.lastName,
        password: formData.password,
        planId: selectedPlan,
      };

      return apiRequest("/api/auth/register", "POST", registrationData);
    },
    onSuccess: () => {
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo ao MEGA File Manager",
      });
      // Move to success step (step 4) instead of immediate redirect
      setCurrentStep(4);
      // Invalidate queries after a short delay to prevent issues during registration
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }, 500);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar conta",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
      setCurrentStep(2); // Go back to form
    },
  });

  const handleFormChange = (updates: Partial<typeof formData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleStep3Complete = () => {
    // OTP verified, create account
    registerMutation.mutate();
  };

  const handleLoginRedirect = async () => {
    // Force a final query refresh before navigating to ensure user state is current
    await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
    // Small delay to allow the query to complete
    setTimeout(() => {
      navigate("/");
    }, 500);
  };

  // Loading state during registration
  if (registerMutation.isPending) {
    return (
      <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-mega-text">
              A criar conta...
            </CardTitle>
            <p className="text-gray-600 mt-2">
              Aguarde enquanto configuramos a sua conta
            </p>
          </CardHeader>
          <CardContent className="p-8">
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-red"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentStep === 1) {
    return (
      <RegisterStep1
        selectedPlan={selectedPlan}
        onPlanSelect={setSelectedPlan}
        onNext={() => setCurrentStep(2)}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <RegisterStep2
        formData={formData}
        contactMethod={contactMethod}
        onFormChange={handleFormChange}
        onContactMethodChange={setContactMethod}
        onBack={() => setCurrentStep(1)}
        onNext={() => setCurrentStep(3)}
        selectedPlan={selectedPlan}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <RegisterStep3
        contactMethod={contactMethod}
        contactValue={contactMethod === 'email' ? formData.email : formData.phone}
        onBack={() => setCurrentStep(2)}
        onNext={handleStep3Complete}
      />
    );
  }

  if (currentStep === 4) {
    // Success page (step 4)
    return (
      <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-mega-text">
              Conta criada com sucesso!
            </CardTitle>
            <p className="text-gray-600 mt-2">
              A sua conta foi criada e verificada. Pode agora aceder ao seu dashboard.
            </p>
          </CardHeader>

          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Resumo da conta:</h4>
                <div className="space-y-1 text-sm text-gray-600">
                  <div><strong>Nome:</strong> {formData.firstName} {formData.lastName}</div>
                  <div><strong>Contacto:</strong> {contactMethod === 'email' ? formData.email : formData.phone}</div>
                  <div><strong>Plano:</strong> {selectedPlan === 'basic' ? 'Basic' : selectedPlan === 'pro' ? 'Pro' : 'Premium'}</div>
                </div>
              </div>
              
              <Button
                onClick={handleLoginRedirect}
                className="w-full bg-mega-red hover:bg-red-600 text-white"
                data-testid="go-to-dashboard-button"
              >
                <Home className="h-4 w-4 mr-2" />
                Ir para o Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Default fallback (should not happen)
  return null;
}