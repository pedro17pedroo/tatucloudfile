import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Upload, File, X } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
import type { Plan } from "@shared/schema";

interface FileUploadProps {
  onUploadComplete: () => void;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
}

export function FileUpload({ onUploadComplete }: FileUploadProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/portal/plans"],
  });

  // Get user's plan to determine file size limits
  const userPlan = plans.find((p) => p.id === user?.planId);
  const maxFileSize = userPlan ? Math.min(parseInt(userPlan.storageLimit), 1024 * 1024 * 1024) : 1024 * 1024 * 1024; // Max 1GB or plan limit
  
  const formatBytes = (bytes: number) => {
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${size.toFixed(size < 10 ? 1 : 0)} ${units[unitIndex]}`;
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/portal/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      return response.json();
    },
    onSuccess: (data, file) => {
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.file === file 
            ? { ...uf, progress: 100, status: 'completed' as const }
            : uf
        )
      );
      
      toast({
        title: "Upload successful",
        description: `${file.name} has been uploaded successfully`,
      });
      
      // Remove completed file after a delay
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
      }, 2000);
      
      onUploadComplete();
    },
    onError: (error, file) => {
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.file === file 
            ? { ...uf, status: 'error' as const }
            : uf
        )
      );

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
        title: "Upload failed",
        description: error.message || `Failed to upload ${file.name}`,
        variant: "destructive",
      });
    },
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      // Add file to uploading list
      setUploadingFiles(prev => [...prev, {
        file,
        progress: 0,
        status: 'uploading'
      }]);

      // Start upload
      uploadMutation.mutate(file);
    });
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
  });

  const removeFile = (file: File) => {
    setUploadingFiles(prev => prev.filter(uf => uf.file !== file));
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <Card 
        {...getRootProps()} 
        className={`cursor-pointer transition-colors ${
          isDragActive 
            ? 'border-mega-red border-2 border-dashed bg-red-50' 
            : 'border-dashed border-2 border-gray-300 hover:border-mega-red hover:bg-gray-50'
        }`}
        data-testid="file-upload-dropzone"
      >
        <CardContent className="p-8 text-center">
          <input {...getInputProps()} data-testid="file-upload-input" />
          <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-mega-text mb-2" data-testid="upload-title">
            {isDragActive ? 'Drop files here' : 'Drag and drop files here'}
          </h3>
          <p className="text-gray-500 mb-4">
            or{' '}
            <Button variant="link" className="text-mega-red font-medium p-0" data-testid="browse-files-button">
              browse files
            </Button>{' '}
            from your computer
          </p>
          <p className="text-sm text-gray-400">Maximum file size: {formatBytes(maxFileSize)}</p>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card data-testid="upload-progress-card">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold text-mega-text mb-4">Upload Progress</h3>
            <div className="space-y-3">
              {uploadingFiles.map((uploadingFile, index) => (
                <div key={index} className="flex items-center justify-between py-2" data-testid={`upload-item-${index}`}>
                  <div className="flex items-center flex-1">
                    <File className="h-5 w-5 text-mega-accent mr-3" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-mega-text" data-testid={`upload-filename-${index}`}>
                          {uploadingFile.file.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(uploadingFile.file)}
                          className="h-6 w-6 p-0"
                          data-testid={`remove-upload-${index}`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress 
                          value={uploadingFile.progress} 
                          className="flex-1 h-2" 
                          data-testid={`upload-progress-${index}`}
                        />
                        <span className="text-xs text-gray-500 min-w-12" data-testid={`upload-percentage-${index}`}>
                          {uploadingFile.status === 'completed' ? '100%' : 
                           uploadingFile.status === 'error' ? 'Error' :
                           `${Math.round(uploadingFile.progress)}%`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500" data-testid={`upload-size-${index}`}>
                        {(uploadingFile.file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
