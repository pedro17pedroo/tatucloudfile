import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Cloud, Upload, Download, Search, Shield } from "lucide-react";

export default function Landing() {
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
            <Button 
              onClick={() => window.location.href = '/api/login'} 
              className="bg-mega-red hover:bg-red-600 text-white"
              data-testid="login-button"
            >
              Sign In
            </Button>
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
            
            {/* API Key Generation */}
            <div className="bg-gradient-to-r from-mega-red to-red-600 rounded-lg p-8 max-w-md mx-auto mb-8">
              <h3 className="text-white font-semibold mb-4" data-testid="api-section-title">Get Started with API Access</h3>
              <div className="space-y-3">
                <Input 
                  type="email" 
                  placeholder="your@email.com" 
                  className="w-full" 
                  data-testid="email-input"
                />
                <Button 
                  className="w-full bg-white text-mega-red hover:bg-gray-100" 
                  data-testid="generate-api-key-button"
                >
                  Generate API Key
                </Button>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button 
                className="bg-mega-red text-white hover:bg-red-600" 
                onClick={() => window.location.href = '/api/login'}
                data-testid="try-dashboard-button"
              >
                <Cloud className="mr-2 h-4 w-4" />
                Try Dashboard
              </Button>
              <Button 
                variant="outline" 
                className="border-mega-red text-mega-red hover:bg-mega-red hover:text-white"
                data-testid="view-api-docs-button"
              >
                View API Docs
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
