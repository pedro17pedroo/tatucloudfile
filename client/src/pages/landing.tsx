import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Cloud, Upload, Download, Search, Shield, User, Mail, Lock, ArrowLeft, Key, Phone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";

type AuthMode = 'login' | 'forgot-password' | 'verify-otp' | 'reset-password';

export default function Landing() {
  const [, navigate] = useLocation();
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>('login');
  const [loginForm, setLoginForm] = useState({
    emailOrPhone: "",
    password: ""
  });
  const [forgotPasswordForm, setForgotPasswordForm] = useState({
    emailOrPhone: ""
  });
  const [otpForm, setOtpForm] = useState({
    otp: ""
  });
  const [resetPasswordForm, setResetPasswordForm] = useState({
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

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: typeof forgotPasswordForm) => {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao enviar código");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Código enviado!",
        description: "Verifique o seu email ou SMS"
      });
      setAuthMode('verify-otp');
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar código",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async (data: typeof otpForm & { emailOrPhone: string }) => {
      const response = await fetch("/api/auth/verify-reset-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Código inválido");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Código verificado!",
        description: "Agora pode definir uma nova senha"
      });
      setAuthMode('reset-password');
    },
    onError: (error) => {
      toast({
        title: "Código inválido",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: typeof resetPasswordForm & { emailOrPhone: string }) => {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao redefinir senha");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Senha redefinida!",
        description: "Pode agora fazer login com a nova senha"
      });
      setAuthMode('login');
      setResetPasswordForm({ password: "", confirmPassword: "" });
      setForgotPasswordForm({ emailOrPhone: "" });
      setOtpForm({ otp: "" });
    },
    onError: (error) => {
      toast({
        title: "Erro ao redefinir senha",
        description: error.message,
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

  const handleForgotPassword = () => {
    if (!forgotPasswordForm.emailOrPhone) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o seu email ou telefone",
        variant: "destructive"
      });
      return;
    }
    forgotPasswordMutation.mutate(forgotPasswordForm);
  };

  const handleVerifyOtp = () => {
    if (!otpForm.otp) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, insira o código recebido",
        variant: "destructive"
      });
      return;
    }
    verifyOtpMutation.mutate({ ...otpForm, emailOrPhone: forgotPasswordForm.emailOrPhone });
  };

  const handleResetPassword = () => {
    if (!resetPasswordForm.password || !resetPasswordForm.confirmPassword) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos",
        variant: "destructive"
      });
      return;
    }
    if (resetPasswordForm.password !== resetPasswordForm.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique as senhas inseridas",
        variant: "destructive"
      });
      return;
    }
    if (resetPasswordForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres",
        variant: "destructive"
      });
      return;
    }
    resetPasswordMutation.mutate({ 
      password: resetPasswordForm.password,
      confirmPassword: resetPasswordForm.confirmPassword,
      emailOrPhone: forgotPasswordForm.emailOrPhone 
    });
  };

  const resetAuthModal = () => {
    setAuthMode('login');
    setLoginForm({ emailOrPhone: "", password: "" });
    setForgotPasswordForm({ emailOrPhone: "" });
    setOtpForm({ otp: "" });
    setResetPasswordForm({ password: "", confirmPassword: "" });
  };

  return (
    <div className="min-h-screen bg-tatu-light">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Cloud className="h-8 w-8 text-tatu-green mr-3" data-testid="logo-icon" />
              <span className="text-xl font-bold text-tatu-text" data-testid="logo-text">TATU File Manager</span>
            </div>
            <div className="flex items-center space-x-4">
              <Dialog open={isAuthOpen} onOpenChange={(open) => {
                setIsAuthOpen(open);
                if (!open) resetAuthModal();
              }}>
                <DialogTrigger asChild>
                  <Button 
                    className="bg-[#D9272E] hover:bg-[#B91C1C] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    data-testid="login-button"
                  >
                    <User className="mr-2 h-4 w-4" />
                    Entrar
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md max-w-lg">
                  {authMode === 'login' && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-center text-2xl font-bold text-gray-900 mb-2">
                          Bem-vindo de volta
                        </DialogTitle>
                        <p className="text-center text-gray-600 text-sm">
                          Entre na sua conta TATU File Manager
                        </p>
                      </DialogHeader>
                      
                      <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="login-email" className="text-sm font-medium text-gray-700">
                            Email ou Telemóvel
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="login-email"
                              type="text"
                              placeholder="nome@exemplo.com ou +351912345678"
                              value={loginForm.emailOrPhone}
                              onChange={(e) => setLoginForm(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green"
                              data-testid="login-email-input"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="login-password" className="text-sm font-medium text-gray-700">
                            Password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="login-password"
                              type="password"
                              placeholder="A sua password"
                              value={loginForm.password}
                              onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green"
                              data-testid="login-password-input"
                            />
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <button
                            type="button"
                            onClick={() => setAuthMode('forgot-password')}
                            className="text-sm text-tatu-green hover:text-green-600 font-medium transition-colors"
                          >
                            Esqueci a minha senha
                          </button>
                        </div>
                        
                        <Button 
                          onClick={handleLogin}
                          disabled={loginMutation.isPending}
                          className="w-full bg-tatu-green hover:bg-green-600 text-white h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                          data-testid="login-submit-button"
                        >
                          {loginMutation.isPending ? "A entrar..." : "Entrar"}
                        </Button>
                        
                        <div className="text-center pt-4 border-t border-gray-200">
                          <p className="text-sm text-gray-600">
                            Não tem conta?{" "}
                            <button
                              onClick={() => {
                                setIsAuthOpen(false);
                                navigate("/register");
                              }}
                              className="text-tatu-green hover:text-green-600 font-medium transition-colors"
                            >
                              Criar uma conta
                            </button>
                          </p>
                        </div>
                      </div>
                    </>
                  )}

                  {authMode === 'forgot-password' && (
                    <>
                      <DialogHeader>
                        <div className="flex items-center space-x-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuthMode('login')}
                            className="p-0 h-auto"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <DialogTitle className="text-xl font-bold text-gray-900">
                            Recuperar senha
                          </DialogTitle>
                        </div>
                        <p className="text-center text-gray-600 text-sm">
                          Enviaremos um código para recuperação da sua senha
                        </p>
                      </DialogHeader>
                      
                      <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email" className="text-sm font-medium text-gray-700">
                            Email ou Telemóvel
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="forgot-email"
                              type="text"
                              placeholder="nome@exemplo.com ou +351912345678"
                              value={forgotPasswordForm.emailOrPhone}
                              onChange={(e) => setForgotPasswordForm(prev => ({ ...prev, emailOrPhone: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleForgotPassword}
                          disabled={forgotPasswordMutation.isPending}
                          className="w-full bg-tatu-green hover:bg-green-600 text-white h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {forgotPasswordMutation.isPending ? "A enviar..." : "Enviar código"}
                        </Button>
                      </div>
                    </>
                  )}

                  {authMode === 'verify-otp' && (
                    <>
                      <DialogHeader>
                        <div className="flex items-center space-x-2 mb-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAuthMode('forgot-password')}
                            className="p-0 h-auto"
                          >
                            <ArrowLeft className="h-4 w-4" />
                          </Button>
                          <DialogTitle className="text-xl font-bold text-gray-900">
                            Verificar código
                          </DialogTitle>
                        </div>
                        <p className="text-center text-gray-600 text-sm">
                          Insira o código de 6 dígitos enviado para{" "}
                          <span className="font-medium">{forgotPasswordForm.emailOrPhone}</span>
                        </p>
                      </DialogHeader>
                      
                      <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="otp-code" className="text-sm font-medium text-gray-700">
                            Código de verificação
                          </Label>
                          <div className="relative">
                            <Key className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="otp-code"
                              type="text"
                              placeholder="123456"
                              value={otpForm.otp}
                              onChange={(e) => setOtpForm(prev => ({ ...prev, otp: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green text-center text-lg tracking-widest"
                              maxLength={6}
                            />
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleVerifyOtp}
                          disabled={verifyOtpMutation.isPending}
                          className="w-full bg-tatu-green hover:bg-green-600 text-white h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {verifyOtpMutation.isPending ? "A verificar..." : "Verificar código"}
                        </Button>
                        
                        <div className="text-center">
                          <button
                            onClick={() => setAuthMode('forgot-password')}
                            className="text-sm text-tatu-green hover:text-green-600 font-medium transition-colors"
                          >
                            Reenviar código
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {authMode === 'reset-password' && (
                    <>
                      <DialogHeader>
                        <DialogTitle className="text-center text-xl font-bold text-gray-900 mb-2">
                          Nova senha
                        </DialogTitle>
                        <p className="text-center text-gray-600 text-sm">
                          Defina uma nova senha para a sua conta
                        </p>
                      </DialogHeader>
                      
                      <div className="mt-6 space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="new-password" className="text-sm font-medium text-gray-700">
                            Nova password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="Mínimo 6 caracteres"
                              value={resetPasswordForm.password}
                              onChange={(e) => setResetPasswordForm(prev => ({ ...prev, password: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirm-password" className="text-sm font-medium text-gray-700">
                            Confirmar password
                          </Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="Repetir a nova password"
                              value={resetPasswordForm.confirmPassword}
                              onChange={(e) => setResetPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                              className="pl-10 h-12 border-gray-300 focus:border-tatu-green focus:ring-tatu-green"
                            />
                          </div>
                        </div>
                        
                        <Button 
                          onClick={handleResetPassword}
                          disabled={resetPasswordMutation.isPending}
                          className="w-full bg-tatu-green hover:bg-green-600 text-white h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all duration-200"
                        >
                          {resetPasswordMutation.isPending ? "A redefinir..." : "Redefinir senha"}
                        </Button>
                      </div>
                    </>
                  )}
                </DialogContent>
              </Dialog>
              <Button
                variant="outline"
                onClick={() => navigate("/register")}
                className="text-tatu-green border-tatu-green hover:bg-tatu-green hover:text-white"
                data-testid="register-nav-button"
              >
                Criar conta
              </Button>
            </div>
          </div>
        </div>
      </nav>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-tatu-light via-white to-tatu-light py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl font-bold text-tatu-text mb-6 leading-tight">
              Secure Cloud Storage
              <span className="text-tatu-green block">File API</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Connect your applications seamlessly with TATU cloud storage using our RESTful
              API. Upload, download, and manage files with enterprise-grade security.
            </p>
            <div className="flex justify-center">
              <Button
                onClick={() => navigate("/register")}
                className="bg-tatu-green hover:bg-green-600 text-white px-8 py-3 text-lg"
                data-testid="hero-register-button"
              >
                Começar Gratuitamente
              </Button>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-tatu-text mb-4">
              Everything you need to integrate with TATU
            </h2>
            <p className="text-xl text-gray-600">
              Powerful APIs and developer tools to build amazing file management experiences
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-tatu-green/30 hover:shadow-lg transition-all">
              <div className="bg-tatu-green/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-tatu-green" />
              </div>
              <h3 className="text-xl font-semibold text-tatu-text mb-2">File Upload</h3>
              <p className="text-gray-600">Upload files of any size with resumable uploads and progress tracking</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-tatu-green/30 hover:shadow-lg transition-all">
              <div className="bg-tatu-green/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="h-8 w-8 text-tatu-green" />
              </div>
              <h3 className="text-xl font-semibold text-tatu-text mb-2">File Download</h3>
              <p className="text-gray-600">Secure file downloads with temporary links and access controls</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-tatu-green/30 hover:shadow-lg transition-all">
              <div className="bg-tatu-green/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="h-8 w-8 text-tatu-green" />
              </div>
              <h3 className="text-xl font-semibold text-tatu-text mb-2">File Search</h3>
              <p className="text-gray-600">Advanced search capabilities across your entire file library</p>
            </div>

            <div className="text-center p-6 rounded-xl border border-gray-200 hover:border-tatu-green/30 hover:shadow-lg transition-all">
              <div className="bg-tatu-green/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-tatu-green" />
              </div>
              <h3 className="text-xl font-semibold text-tatu-text mb-2">Enterprise Security</h3>
              <p className="text-gray-600">End-to-end encryption with enterprise-grade security</p>
            </div>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 bg-tatu-green">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to get started?
          </h2>
          <p className="text-xl text-green-100 mb-8">Join thousands of developers already building with our TATU File Manager API</p>
          <Button
            onClick={() => navigate("/register")}
            className="bg-white text-mega-green hover:bg-gray-100 px-8 py-3 text-lg font-semibold"
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
                <span className="text-xl font-bold">TATU File Manager</span>
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
            <p>© 2025 TATU File Manager. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}