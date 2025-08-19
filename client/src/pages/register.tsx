import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { ArrowLeft, CheckCircle, DollarSign } from "lucide-react";
import type { Plan } from "@shared/schema";

export default function Register() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    phone: "",
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
    planId: "",
  });
  const [useEmail, setUseEmail] = useState(true);

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  const registerMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords do not match");
      }

      const registrationData = {
        ...(useEmail ? { email: data.email } : { phone: data.phone }),
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        planId: data.planId,
      };

      return apiRequest("/api/auth/register", "POST", registrationData);
    },
    onSuccess: () => {
      toast({
        title: "Registration successful",
        description: "Your account has been created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      navigate("/");
    },
    onError: (error: any) => {
      toast({
        title: "Registration failed",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.planId) {
      toast({
        title: "Plan required",
        description: "Please select a plan to continue",
        variant: "destructive",
      });
      return;
    }

    registerMutation.mutate(formData);
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    return numPrice === 0 ? "Free" : `€${numPrice}/month`;
  };

  const formatStorage = (bytes: string) => {
    const size = parseInt(bytes);
    const gb = size / (1024 * 1024 * 1024);
    return `${gb}GB`;
  };

  return (
    <div className="min-h-screen bg-mega-light flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="absolute left-4 top-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Login
            </Button>
          </div>
          <CardTitle className="text-3xl font-bold text-mega-text">Create Account</CardTitle>
          <p className="text-gray-600 mt-2">Sign up and choose your plan to get started</p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Contact Method Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <Button
                type="button"
                variant={useEmail ? "default" : "ghost"}
                size="sm"
                className={`flex-1 ${useEmail ? 'bg-mega-red text-white' : ''}`}
                onClick={() => setUseEmail(true)}
              >
                Email
              </Button>
              <Button
                type="button"
                variant={!useEmail ? "default" : "ghost"}
                size="sm"
                className={`flex-1 ${!useEmail ? 'bg-mega-red text-white' : ''}`}
                onClick={() => setUseEmail(false)}
              >
                Phone
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label htmlFor={useEmail ? "email" : "phone"}>
                {useEmail ? "Email" : "Phone Number"}
              </Label>
              <Input
                id={useEmail ? "email" : "phone"}
                type={useEmail ? "email" : "tel"}
                placeholder={useEmail ? "your@email.com" : "+351 912 345 678"}
                required
                value={useEmail ? formData.email : formData.phone}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  [useEmail ? "email" : "phone"]: e.target.value 
                })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                />
              </div>
            </div>

            {/* Plan Selection - Required */}
            <div>
              <Label htmlFor="plan" className="text-lg font-semibold">
                Choose Your Plan <span className="text-red-500">*</span>
              </Label>
              <p className="text-sm text-gray-600 mb-3">Required: Select a plan to continue</p>
              
              <div className="grid gap-3">
                {plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`p-4 border rounded-lg cursor-pointer transition-all ${
                      formData.planId === plan.id
                        ? 'border-mega-red bg-mega-red/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setFormData({ ...formData, planId: plan.id })}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold text-mega-text">{plan.name}</h3>
                        <p className="text-sm text-gray-600">
                          {formatStorage(plan.storageLimit)} • {plan.apiCallsPerHour} API calls/hour
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-mega-text">
                          {formatPrice(plan.pricePerMonth)}
                        </span>
                        {formData.planId === plan.id && (
                          <CheckCircle className="h-5 w-5 text-mega-red" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Button
              type="submit"
              disabled={registerMutation.isPending || !formData.planId}
              className="w-full bg-mega-red hover:bg-red-600 text-white"
            >
              {registerMutation.isPending ? "Creating Account..." : "Create Account"}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Button
                variant="link"
                onClick={() => navigate("/login")}
                className="text-mega-red hover:text-red-600 p-0"
              >
                Sign in here
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}