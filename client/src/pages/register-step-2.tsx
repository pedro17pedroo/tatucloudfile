import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ArrowRight, Mail, Phone, User, Lock } from "lucide-react";

interface RegisterStep2Props {
  formData: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    password: string;
    confirmPassword: string;
  };
  contactMethod: 'email' | 'phone';
  onFormChange: (data: any) => void;
  onContactMethodChange: (method: 'email' | 'phone') => void;
  onBack: () => void;
  onNext: () => void;
  selectedPlan: string;
}

export default function RegisterStep2({
  formData,
  contactMethod,
  onFormChange,
  onContactMethodChange,
  onBack,
  onNext,
  selectedPlan
}: RegisterStep2Props) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.firstName) newErrors.firstName = "Nome é obrigatório";
    if (!formData.lastName) newErrors.lastName = "Apelido é obrigatório";
    
    if (contactMethod === 'email') {
      if (!formData.email) {
        newErrors.email = "Email é obrigatório";
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Email inválido";
      }
    } else {
      if (!formData.phone) {
        newErrors.phone = "Telefone é obrigatório";
      } else if (!/^\+\d{10,}$/.test(formData.phone)) {
        newErrors.phone = "Formato: +351912345678";
      }
    }

    if (!formData.password) {
      newErrors.password = "Password é obrigatória";
    } else if (formData.password.length < 8) {
      newErrors.password = "Mínimo 8 caracteres";
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords não coincidem";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateForm()) {
      onNext();
    }
  };

  const planNames = {
    basic: "Basic",
    pro: "Pro", 
    premium: "Premium"
  };

  return (
    <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="absolute left-4 top-4"
            data-testid="back-button"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <CardTitle className="text-3xl font-bold text-mega-text">
            Criar conta
          </CardTitle>
          <p className="text-gray-600 mt-2">
            Preencha os seus dados • Plano selecionado: <span className="font-semibold text-mega-red">{planNames[selectedPlan as keyof typeof planNames]}</span>
          </p>
        </CardHeader>

        <CardContent className="p-8 space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nome *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="firstName"
                  type="text"
                  placeholder="João"
                  value={formData.firstName}
                  onChange={(e) => onFormChange({ firstName: e.target.value })}
                  className={`pl-10 ${errors.firstName ? 'border-red-500' : ''}`}
                  data-testid="firstName-input"
                />
              </div>
              {errors.firstName && (
                <p className="text-red-500 text-sm">{errors.firstName}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apelido *</Label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="lastName"
                  type="text"
                  placeholder="Silva"
                  value={formData.lastName}
                  onChange={(e) => onFormChange({ lastName: e.target.value })}
                  className={`pl-10 ${errors.lastName ? 'border-red-500' : ''}`}
                  data-testid="lastName-input"
                />
              </div>
              {errors.lastName && (
                <p className="text-red-500 text-sm">{errors.lastName}</p>
              )}
            </div>
          </div>

          {/* Contact Method */}
          <div className="space-y-4">
            <Label className="text-base">Como prefere ser contactado? *</Label>
            <Tabs value={contactMethod} onValueChange={(value) => onContactMethodChange(value as 'email' | 'phone')}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="email" data-testid="email-tab">
                  <Mail className="h-4 w-4 mr-2" />
                  Email
                </TabsTrigger>
                <TabsTrigger value="phone" data-testid="phone-tab">
                  <Phone className="h-4 w-4 mr-2" />
                  Telefone
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="email" className="space-y-2 mt-4">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="joao@exemplo.com"
                    value={formData.email}
                    onChange={(e) => onFormChange({ email: e.target.value })}
                    className={`pl-10 ${errors.email ? 'border-red-500' : ''}`}
                    data-testid="email-input"
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email}</p>
                )}
              </TabsContent>

              <TabsContent value="phone" className="space-y-2 mt-4">
                <Label htmlFor="phone">Telemóvel *</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+351912345678"
                    value={formData.phone}
                    onChange={(e) => onFormChange({ phone: e.target.value })}
                    className={`pl-10 ${errors.phone ? 'border-red-500' : ''}`}
                    data-testid="phone-input"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone}</p>
                )}
              </TabsContent>
            </Tabs>
          </div>

          {/* Password */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Mínimo 8 caracteres"
                  value={formData.password}
                  onChange={(e) => onFormChange({ password: e.target.value })}
                  className={`pl-10 ${errors.password ? 'border-red-500' : ''}`}
                  data-testid="password-input"
                />
              </div>
              {errors.password && (
                <p className="text-red-500 text-sm">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Repetir password"
                  value={formData.confirmPassword}
                  onChange={(e) => onFormChange({ confirmPassword: e.target.value })}
                  className={`pl-10 ${errors.confirmPassword ? 'border-red-500' : ''}`}
                  data-testid="confirmPassword-input"
                />
              </div>
              {errors.confirmPassword && (
                <p className="text-red-500 text-sm">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <Button
              onClick={onBack}
              variant="outline"
              data-testid="back-step-button"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <Button
              onClick={handleNext}
              className="bg-mega-red hover:bg-red-600 text-white"
              data-testid="continue-step-button"
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