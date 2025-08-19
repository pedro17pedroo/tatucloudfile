import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, ExternalLink } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function ApiDocs() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Code copied to clipboard",
    });
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-mega-light flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-mega-red mx-auto mb-4"></div>
          <p className="text-mega-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-mega-light">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-mega-text mb-2" data-testid="api-docs-title">API Documentation</h1>
          <p className="text-xl text-gray-600">RESTful endpoints for MEGA cloud storage integration</p>
        </div>

        {/* API Overview */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-gradient-to-br from-mega-green to-green-600 text-white" data-testid="base-url-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Base URL</h3>
              <code className="text-sm bg-black bg-opacity-20 px-2 py-1 rounded">
                {window.location.origin}/api/v1
              </code>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-mega-accent to-blue-600 text-white" data-testid="auth-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Authentication</h3>
              <code className="text-sm bg-black bg-opacity-20 px-2 py-1 rounded">
                Bearer {"{api_key}"}
              </code>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-mega-success to-green-600 text-white" data-testid="rate-limit-card">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-2">Rate Limit</h3>
              <code className="text-sm bg-black bg-opacity-20 px-2 py-1 rounded">
                1000 requests/hour
              </code>
            </CardContent>
          </Card>
        </div>

        {/* Upload Endpoint */}
        <Card className="mb-8" data-testid="upload-endpoint-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-mega-success text-white">POST</Badge>
              <CardTitle className="text-mega-text">/files/upload</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Upload a file to MEGA cloud storage</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-mega-text mb-2">Request Body (multipart/form-data)</h4>
                <div className="relative">
                  <pre className="bg-gray-900 text-green-400 p-4 rounded text-sm overflow-x-auto">
{`{
  "file": "[binary_file_data]",
  "fileName": "document.pdf",
  "path": "/documents/report.pdf"
}`}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('{"file": "[binary_file_data]", "fileName": "document.pdf", "path": "/documents/report.pdf"}')}
                    data-testid="copy-upload-request-button"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-mega-text mb-2">Response</h4>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "status": "success",
  "file_id": "f1a2b3c4d5e6",
  "name": "document.pdf",
  "size": 2457600,
  "upload_date": "2024-08-18T10:30:00Z"
}`}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('{"status": "success", "file_id": "f1a2b3c4d5e6", "name": "document.pdf", "size": 2457600, "upload_date": "2024-08-18T10:30:00Z"}')}
                    data-testid="copy-upload-response-button"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Download Endpoint */}
        <Card className="mb-8" data-testid="download-endpoint-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-mega-accent text-white">GET</Badge>
              <CardTitle className="text-mega-text">/files/{"{file_id}"}/download</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Download a file from MEGA cloud storage</p>
            
            <div>
              <h4 className="font-semibold text-mega-text mb-2">Response</h4>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "download_url": "https://mega.nz/file/temp-secure-link",
  "expires_at": "2024-08-18T11:30:00Z",
  "file_name": "document.pdf"
}`}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard('{"download_url": "https://mega.nz/file/temp-secure-link", "expires_at": "2024-08-18T11:30:00Z", "file_name": "document.pdf"}')}
                  data-testid="copy-download-response-button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Search Endpoint */}
        <Card className="mb-8" data-testid="search-endpoint-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-purple-600 text-white">GET</Badge>
              <CardTitle className="text-mega-text">/files/search</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Search files in MEGA storage</p>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-mega-text mb-2">Query Parameters</h4>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`query: string    // Search term
type: string     // File type filter (pdf, image, document)
limit: number    // Max results (default: 50)
offset: number   // Pagination offset`}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('query: string\ntype: string\nlimit: number\noffset: number')}
                    data-testid="copy-search-params-button"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-mega-text mb-2">Response</h4>
                <div className="relative">
                  <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "status": "success",
  "total": 25,
  "files": [
    {
      "id": "f1a2b3c4d5e6",
      "name": "document.pdf",
      "size": 2457600,
      "type": "application/pdf",
      "created_at": "2024-08-18T10:30:00Z"
    }
  ]
}`}
                  </pre>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="absolute top-2 right-2"
                    onClick={() => copyToClipboard('{"status": "success", "total": 25, "files": [{"id": "f1a2b3c4d5e6", "name": "document.pdf", "size": 2457600, "type": "application/pdf", "created_at": "2024-08-18T10:30:00Z"}]}')}
                    data-testid="copy-search-response-button"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Delete Endpoint */}
        <Card className="mb-8" data-testid="delete-endpoint-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className="bg-red-600 text-white">DELETE</Badge>
              <CardTitle className="text-mega-text">/files/{"{file_id}"}</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">Delete a file from MEGA storage</p>
            
            <div>
              <h4 className="font-semibold text-mega-text mb-2">Response</h4>
              <div className="relative">
                <pre className="bg-gray-100 p-4 rounded text-sm overflow-x-auto">
{`{
  "status": "success",
  "message": "File deleted successfully"
}`}
                </pre>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="absolute top-2 right-2"
                  onClick={() => copyToClipboard('{"status": "success", "message": "File deleted successfully"}')}
                  data-testid="copy-delete-response-button"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDK Integration */}
        <Card data-testid="sdk-integration-card">
          <CardHeader>
            <CardTitle className="text-mega-text">Node.js Example</CardTitle>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold text-mega-text mb-4">Upload File Example</h4>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded overflow-x-auto text-sm">
{`const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadFile(filePath, apiKey) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('fileName', 'document.pdf');
  
  const response = await axios.post('${window.location.origin}/api/v1/files/upload', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': \`Bearer \${apiKey}\`
    }
  });
  
  return response.data;
}`}
              </pre>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2"
                onClick={() => copyToClipboard(`const FormData = require('form-data');
const fs = require('fs');
const axios = require('axios');

async function uploadFile(filePath, apiKey) {
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('fileName', 'document.pdf');
  
  const response = await axios.post('${window.location.origin}/api/v1/files/upload', form, {
    headers: {
      ...form.getHeaders(),
      'Authorization': \`Bearer \${apiKey}\`
    }
  });
  
  return response.data;
}`)}
                data-testid="copy-sdk-example-button"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
