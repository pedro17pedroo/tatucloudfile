import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import RegisterStep1 from "./register-step-1";
import RegisterStep2 from "./register-step-2";
import RegisterStep3 from "./register-step-3";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    onSuccess: async () => {
      toast({
        title: "Conta criada com sucesso!",
        description: "A redirecionar para o dashboard...",
      });
      
      // Invalidate and refetch user data immediately to update auth state
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      // Redirect to dashboard after a short delay to show success message
      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-green"></div>
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

  // Default fallback (should not happen)
  return null;
}