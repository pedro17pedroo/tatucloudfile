import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { 
  Search, 
  Download, 
  Trash2, 
  Share2, 
  File, 
  FileText, 
  Image, 
  Archive,
  Grid,
  List
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FileGridProps {
  files: any[];
  onFileDeleted: () => void;
  isLoading: boolean;
}

export function FileGrid({ files, onFileDeleted, isLoading }: FileGridProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);

  const { data: apiKeys } = useQuery({
    queryKey: ["/api/api-keys"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest("DELETE", `/api/files/${fileId}`);
    },
    onSuccess: () => {
      toast({
        title: "File deleted",
        description: "File has been deleted successfully",
      });
      onFileDeleted();
      setDeleteFileId(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Delete failed",
        description: "Failed to delete file",
        variant: "destructive",
      });
    },
  });

  const createApiKeyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/api-keys", { name: "Default API Key" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/api-keys"] });
      toast({
        title: "API Key created",
        description: "Your API key has been generated",
      });
    },
  });

  const getFileIcon = (mimeType: string | null, fileName: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="h-8 w-8 text-purple-600" />;
    if (mimeType?.includes('pdf') || fileName.endsWith('.pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return <Archive className="h-8 w-8 text-orange-600" />;
    return <File className="h-8 w-8 text-blue-600" />;
  };

  const formatFileSize = (bytes: string) => {
    const size = parseInt(bytes);
    const units = ['B', 'KB', 'MB', 'GB'];
    let unitIndex = 0;
    let fileSize = size;
    
    while (fileSize >= 1024 && unitIndex < units.length - 1) {
      fileSize /= 1024;
      unitIndex++;
    }
    
    return `${fileSize.toFixed(1)} ${units[unitIndex]}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString();
  };

  const filteredFiles = files.filter(file =>
    file.fileName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <Card data-testid="file-grid-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="border border-gray-200 rounded-lg p-4">
                  <div className="h-16 bg-gray-200 rounded mb-3"></div>
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card data-testid="file-grid-header">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-mega-text" data-testid="files-title">Your Files</h2>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <span data-testid="files-count">{filteredFiles.length} files</span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="search-files-input"
                />
              </div>
              
              {(!apiKeys || apiKeys.length === 0) && (
                <Button
                  onClick={() => createApiKeyMutation.mutate()}
                  disabled={createApiKeyMutation.isPending}
                  className="bg-mega-accent hover:bg-blue-600 text-white"
                  data-testid="generate-api-key-button"
                >
                  Generate API Key
                </Button>
              )}
            </div>
            
            <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-4">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-mega-red text-white' : ''}
                data-testid="view-mode-grid"
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-mega-red text-white' : ''}
                data-testid="view-mode-list"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Files Display */}
      {filteredFiles.length === 0 ? (
        <Card data-testid="no-files-message">
          <CardContent className="p-12 text-center">
            <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-mega-text mb-2">No files found</h3>
            <p className="text-gray-500">
              {searchQuery ? "Try adjusting your search terms" : "Upload some files to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="files-container">
          <CardContent className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" data-testid="files-grid">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                    data-testid={`file-card-${file.id}`}
                  >
                    <div className="flex flex-col items-center">
                      <div className="mb-3">
                        {getFileIcon(file.mimeType, file.fileName)}
                      </div>
                      
                      <h4 className="text-sm font-medium text-mega-text mb-1 text-center truncate w-full" data-testid={`file-name-${file.id}`}>
                        {file.fileName}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1" data-testid={`file-size-${file.id}`}>
                        {formatFileSize(file.fileSize)}
                      </p>
                      <p className="text-xs text-gray-400 mb-3" data-testid={`file-date-${file.id}`}>
                        {formatDate(file.uploadedAt)}
                      </p>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-mega-accent hover:text-blue-700 h-8 w-8 p-0"
                          title="Download"
                          data-testid={`download-file-${file.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-gray-500 hover:text-gray-700 h-8 w-8 p-0"
                          title="Share"
                          data-testid={`share-file-${file.id}`}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleteFileId(file.id)}
                          className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                          title="Delete"
                          data-testid={`delete-file-${file.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2" data-testid="files-list">
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    data-testid={`file-row-${file.id}`}
                  >
                    <div className="flex items-center space-x-4">
                      {getFileIcon(file.mimeType, file.fileName)}
                      <div>
                        <h4 className="text-sm font-medium text-mega-text" data-testid={`file-name-list-${file.id}`}>
                          {file.fileName}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {formatFileSize(file.fileSize)} • {formatDate(file.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-mega-accent hover:text-blue-700"
                        data-testid={`download-file-list-${file.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 hover:text-gray-700"
                        data-testid={`share-file-list-${file.id}`}
                      >
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setDeleteFileId(file.id)}
                        className="text-red-500 hover:text-red-700"
                        data-testid={`delete-file-list-${file.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent data-testid="delete-confirmation-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this file? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="cancel-delete-button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && deleteMutation.mutate(deleteFileId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="confirm-delete-button"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
