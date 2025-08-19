import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cloud, Upload, Download, Search, Shield, User, Phone, Mail, Lock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Landing() {
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState("login");
  const [loginForm, setLoginForm] = useState({
    emailOrPhone: "",
    password: ""
  });
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    emailOrPhone: "",
    password: "",
    confirmPassword: ""
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

  const registerMutation = useMutation({
    mutationFn: async (data: typeof registerForm) => {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro no registo");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Conta criada com sucesso!",
        description: "Por favor, faça login para continuar"
      });
      setAuthTab("login");
      setRegisterForm({
        firstName: "",
        lastName: "",
        emailOrPhone: "",
        password: "",
        confirmPassword: ""
      });
    },
    onError: (error) => {
      toast({
        title: "Erro no registo",
        description: error.message || "Erro ao criar conta",
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

  const handleRegister = () => {
    if (!registerForm.firstName || !registerForm.lastName || !registerForm.emailOrPhone || !registerForm.password) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Passwords não coincidem",
        description: "Por favor, confirme a sua password",
        variant: "destructive"
      });
      return;
    }
    registerMutation.mutate(registerForm);
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
                
                <Tabs value={authTab} onValueChange={setAuthTab} className="mt-6">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Entrar</TabsTrigger>
                    <TabsTrigger value="register">Registar</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="login" className="space-y-4 mt-6">
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
                  </TabsContent>
                  
                  <TabsContent value="register" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstname">Nome</Label>
                        <Input
                          id="register-firstname"
                          type="text"
                          placeholder="João"
                          value={registerForm.firstName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, firstName: e.target.value }))}
                          data-testid="register-firstname-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="register-lastname">Apelido</Label>
                        <Input
                          id="register-lastname"
                          type="text"
                          placeholder="Silva"
                          value={registerForm.lastName}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, lastName: e.target.value }))}
                          data-testid="register-lastname-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email ou Telemóvel</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-email"
                          type="text"
                          placeholder="nome@exemplo.com ou +351912345678"
                          value={registerForm.emailOrPhone}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                          className="pl-10"
                          data-testid="register-email-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-password"
                          type="password"
                          placeholder="Mínimo 8 caracteres"
                          value={registerForm.password}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, password: e.target.value }))}
                          className="pl-10"
                          data-testid="register-password-input"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-confirm-password">Confirmar Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="register-confirm-password"
                          type="password"
                          placeholder="Repita a sua password"
                          value={registerForm.confirmPassword}
                          onChange={(e) => setRegisterForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="pl-10"
                          data-testid="register-confirm-password-input"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleRegister}
                      disabled={registerMutation.isPending}
                      className="w-full bg-[#D9272E] hover:bg-[#B91C1C] text-white"
                      data-testid="register-submit-button"
                    >
                      {registerMutation.isPending ? "A criar conta..." : "Criar Conta"}
                    </Button>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-mega-text mb-6" data-testid="hero-title">
              Secure Cloud Storage
              <span className="text-mega-red"> API Integration</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto" data-testid="hero-description">
              Connect your applications with MEGA's powerful cloud storage using our RESTful API. Upload, download, manage, and search files with enterprise-grade security.
            </p>
            
            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Dialog open={isAuthOpen} onOpenChange={setIsAuthOpen}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#D9272E] text-white hover:bg-[#B91C1C]" 
                    onClick={() => setAuthTab("register")}
                    data-testid="try-dashboard-button"
                  >
                    <Cloud className="mr-2 h-4 w-4" />
                    Começar Gratuitamente
                  </Button>
                </DialogTrigger>
              </Dialog>
              <Button 
                variant="outline" 
                className="border-[#D9272E] text-[#D9272E] hover:bg-[#D9272E] hover:text-white"
                data-testid="view-api-docs-button"
              >
                Ver Documentação API
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-mega-text mb-4" data-testid="features-title">Powerful File Management API</h2>
            <p className="text-xl text-gray-600" data-testid="features-description">Everything you need to integrate with MEGA cloud storage</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="hover:shadow-md transition-shadow" data-testid="feature-upload">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-mega-red rounded-lg flex items-center justify-center mb-4">
                  <Upload className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-mega-text mb-2">File Upload</h3>
                <p className="text-gray-600 text-sm">Upload files up to 1GB with progress tracking and drag-and-drop support</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow" data-testid="feature-download">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-mega-accent rounded-lg flex items-center justify-center mb-4">
                  <Download className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-mega-text mb-2">Download & Stream</h3>
                <p className="text-gray-600 text-sm">Download files securely with streaming support for large files</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow" data-testid="feature-search">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-mega-success rounded-lg flex items-center justify-center mb-4">
                  <Search className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-mega-text mb-2">Search & Filter</h3>
                <p className="text-gray-600 text-sm">Advanced file search with filtering by type, size, and date</p>
              </CardContent>
            </Card>
            
            <Card className="hover:shadow-md transition-shadow" data-testid="feature-security">
              <CardContent className="p-6">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-mega-text mb-2">Secure API</h3>
                <p className="text-gray-600 text-sm">Enterprise-grade security with encrypted transfers and API authentication</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-mega-dark text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <Cloud className="h-6 w-6 text-mega-red mr-3" />
                <span className="text-xl font-bold">MEGA File Manager</span>
              </div>
              <p className="text-gray-400 text-sm">Secure cloud storage API integration with enterprise-grade security and privacy.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">API</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Authentication</a></li>
                <li><a href="#" className="hover:text-white">Rate Limits</a></li>
                <li><a href="#" className="hover:text-white">SDKs</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Getting Started</a></li>
                <li><a href="#" className="hover:text-white">Tutorials</a></li>
                <li><a href="#" className="hover:text-white">Code Examples</a></li>
                <li><a href="#" className="hover:text-white">Status Page</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><a href="#" className="hover:text-white">Help Center</a></li>
                <li><a href="#" className="hover:text-white">Contact Us</a></li>
                <li><a href="#" className="hover:text-white">Community</a></li>
                <li><a href="#" className="hover:text-white">Bug Reports</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2024 MEGA File Manager API. Built with security and privacy first.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
