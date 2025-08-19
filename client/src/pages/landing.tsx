import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cloud, Upload, Download, Search, Shield, User, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

export default function Landing() {
  const [, navigate] = useLocation();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [loginForm, setLoginForm] = useState({
    emailOrPhone: "",
    password: ""
  });
  
  const { toast } = useToast();

  const loginMutation = useMutation({
    mutationFn: async (data: typeof loginForm) => {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro no login");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Login realizado com sucesso!",
        description: "Bem-vindo de volta!"
      });
      window.location.href = "/";
    },
    onError: (error) => {
      toast({
        title: "Erro no login",
        description: error.message || "Credenciais inválidas",
        variant: "destructive"
      });
    }
  });

  const handleLogin = () => {
    if (!loginForm.emailOrPhone || !loginForm.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    loginMutation.mutate(loginForm);
  };

  return (
    <div className="min-h-screen bg-mega-light">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Cloud className="h-8 w-8 text-mega-red mr-3" data-testid="logo-icon" />
              <span className="text-xl font-bold text-mega-text" data-testid="logo-text">MEGA File Manager</span>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#D9272E] hover:bg-[#B91C1C] text-white"
                    data-testid="login-button"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Entrar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold text-gray-900">
                      Bem-vindo ao MEGA File Manager
                    </DialogTitle>
                  </DialogHeader>
                  
                  <div className="mt-6 space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email ou Telemóvel</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-email"
                          type="text"
                          placeholder="nome@exemplo.com ou +351912345678"
                          value={loginForm.emailOrPhone}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                          className="pl-10"
                          data-testid="login-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="login-password"
                          type="password"
                          placeholder="A sua password"
                          value={loginForm.password}
                          onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10"
                          data-testid="login-password-input"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleLogin}
                      disabled={loginMutation.isPending}
                      className="w-full bg-[#D9272E] hover:bg-[#B91C1C] text-white"
                      data-testid="login-submit-button"
                    >
                      {loginMutation.isPending ? "A entrar..." : "Entrar"}
                    </Button>
                    
                  </div>
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => navigate("/register")}
                className="text-mega-red border-mega-red hover:bg-mega-red/5"
                data-testid="register-nav-button"
              >
                Criar conta
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-mega-light via-white to-mega-light py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-mega-text mb-6 leading-tight">
              Secure Cloud Storage
              <span className="text-mega-red block">File API</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect your applications seamlessly with MEGA cloud storage using our RESTful
              API. Upload, download, and manage files with enterprise-grade security.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate("/register")}
                className="bg-mega-red hover:bg-red-600 text-white px-8 py-3 text-lg"
                data-testid="hero-register-button"
              >
                Começar Gratuitamente
              </Button>
              <Button 
                variant="outline"
                onClick={() => setIsAuthOpen(true)}
                className="border-mega-red text-mega-red hover:bg-mega-red/5 px-8 py-3 text-lg"
                data-testid="hero-login-button"
              >
                <User className="mr-2 h-5 w-5" />
                Entrar
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-mega-text mb-4">
              Everything you need to integrate with MEGA
            </h2>
            <p className="text-xl text-gray-600">
              Powerful APIs and developer tools to build amazing file management experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-mega-red/30 hover:shadow-lg transition-all">
              <div className="bg-mega-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-mega-red" />
              </div>
              <h3 className="text-xl font-semibold text-mega-text mb-2">File Upload</h3>
              <p className="text-gray-600">Upload files of any size with resumable uploads and progress tracking</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-mega-red/30 hover:shadow-lg transition-all">
              <div className="bg-mega-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-mega-red" />
              </div>
              <h3 className="text-xl font-semibold text-mega-text mb-2">File Download</h3>
              <p className="text-gray-600">Secure file downloads with temporary links and access controls</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-mega-red/30 hover:shadow-lg transition-all">
              <div className="bg-mega-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-mega-red" />
              </div>
              <h3 className="text-xl font-semibold text-mega-text mb-2">File Search</h3>
              <p className="text-gray-600">Advanced search capabilities across your entire file library</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-mega-red/30 hover:shadow-lg transition-all">
              <div className="bg-mega-red/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-mega-red" />
              </div>
              <h3 className="text-xl font-semibold text-mega-text mb-2">Enterprise Security</h3>
              <p className="text-gray-600">End-to-end encryption with enterprise-grade security</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-mega-red">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Join thousands of developers already building with our MEGA File Manager API
          </p>
          <Button
            onClick={() => navigate("/register")}
            className="bg-white text-mega-red hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
            data-testid="cta-register-button"
          >
            Create Free Account
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center mb-4">
                <Cloud className="h-8 w-8 text-mega-red mr-3" />
                <span className="text-xl font-bold">MEGA File Manager</span>
              </div>
              <p className="text-gray-400 max-w-md">
                The most secure and reliable way to integrate MEGA cloud storage into your applications.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Examples</a></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 MEGA File Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}