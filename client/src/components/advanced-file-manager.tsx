import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useAuth } from "@/hooks/useAuth";
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
  List,
  Upload,
  FolderPlus,
  Eye,
  Move,
  X,
  Folder,
  FolderOpen,
  ChevronRight,
  Home,
  MoreHorizontal,
  Play,
  Music,
  FileSpreadsheet,
  Presentation,
  FileVideo
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import type { Plan } from "@shared/schema";

interface AdvancedFileManagerProps {
  files: any[];
  onFileChange: () => void;
  isLoading: boolean;
}

interface UploadingFile {
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  folderId?: string;
}

interface Folder {
  id: string;
  name: string;
  createdAt: string;
  parentId?: string;
}

export function AdvancedFileManager({ files, onFileChange, isLoading }: AdvancedFileManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<Folder[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  
  // Dialogs
  const [deleteFileId, setDeleteFileId] = useState<string | null>(null);
  const [deleteFolderId, setDeleteFolderId] = useState<string | null>(null);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [showPreview, setShowPreview] = useState<any>(null);

  // Fetch folders data from API
  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ["/api/portal/folders"],
    queryFn: async () => {
      const response = await apiRequest("/api/portal/folders", "GET");
      const data = await response.json();
      return data.folders || [];
    },
  });

  const { data: plans = [] } = useQuery<Plan[]>({
    queryKey: ["/api/auth/plans"],
  });

  const userPlan = plans.find((p) => p.id === user?.planId);
  const planStorageLimit = userPlan ? parseInt(userPlan.storageLimit) : 2147483648;
  const maxFileSize = Math.min(planStorageLimit, 1024 * 1024 * 1024);

  // Mutations
  const uploadMutation = useMutation({
    mutationFn: async (data: { file: File; folderId?: string }) => {
      const formData = new FormData();
      formData.append('file', data.file);
      if (data.folderId) {
        formData.append('folderId', data.folderId);
      }

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
    onSuccess: (data, variables) => {
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.file === variables.file 
            ? { ...uf, progress: 100, status: 'completed' as const }
            : uf
        )
      );
      
      toast({
        title: "Upload realizado",
        description: `${variables.file.name} foi carregado com sucesso`,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/portal/files"] });
      
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(uf => uf.file !== variables.file));
      }, 2000);
      
      onFileChange();
    },
    onError: (error, variables) => {
      setUploadingFiles(prev => 
        prev.map(uf => 
          uf.file === variables.file 
            ? { ...uf, status: 'error' as const }
            : uf
        )
      );

      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Sessão expirada. A recarregar...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }

      toast({
        title: "Falha no upload",
        description: error.message || `Falha ao carregar ${variables.file.name}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (fileId: string) => {
      return apiRequest(`/api/portal/files/${fileId}`, "DELETE");
    },
    onSuccess: () => {
      toast({
        title: "Ficheiro eliminado",
        description: "O ficheiro foi eliminado com sucesso",
      });
      onFileChange();
      setDeleteFileId(null);
      setSelectedFiles([]);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Sessão expirada. A recarregar...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Falha na eliminação",
        description: "Erro ao eliminar ficheiro",
        variant: "destructive",
      });
    },
  });

  const createFolderMutation = useMutation({
    mutationFn: async (data: { name: string; parentId?: string }) => {
      return apiRequest("/api/portal/folders", "POST", data);
    },
    onSuccess: () => {
      toast({
        title: "Pasta criada",
        description: `Pasta "${newFolderName}" criada com sucesso`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/portal/folders"] });
      setShowCreateFolder(false);
      setNewFolderName("");
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado",
          description: "Sessão expirada. A recarregar...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Falha na criação",
        description: error.message || "Erro ao criar pasta",
        variant: "destructive",
      });
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (folderId: string) => {
      return apiRequest(`/api/portal/folders/${folderId}`, "DELETE");
    },
    onSuccess: () => {
      setDeleteFolderId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/portal/folders"] });
      toast({
        title: "Pasta eliminada",
        description: "A pasta foi eliminada com sucesso",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Não autorizado", 
          description: "Sessão expirada. A recarregar...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Erro ao eliminar pasta",
        description: "Não foi possível eliminar a pasta",
        variant: "destructive",
      });
    },
  });

  // Drop zone
  const onDrop = useCallback((acceptedFiles: File[]) => {
    acceptedFiles.forEach(file => {
      setUploadingFiles(prev => [...prev, {
        file,
        progress: 0,
        status: 'uploading',
        folderId: currentFolder || undefined
      }]);

      uploadMutation.mutate({ file, folderId: currentFolder || undefined });
    });
  }, [uploadMutation, currentFolder]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxSize: maxFileSize,
    noClick: true,
  });

  // Utility functions
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

  const getFileIcon = (mimeType: string | null, fileName: string) => {
    if (mimeType?.startsWith('image/')) return <Image className="h-8 w-8 text-purple-600" />;
    if (mimeType?.startsWith('video/')) return <FileVideo className="h-8 w-8 text-red-500" />;
    if (mimeType?.startsWith('audio/')) return <Music className="h-8 w-8 text-green-600" />;
    if (mimeType?.includes('pdf') || fileName.endsWith('.pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (mimeType?.includes('spreadsheet') || fileName.match(/\.(xlsx?|csv)$/i)) return <FileSpreadsheet className="h-8 w-8 text-green-700" />;
    if (mimeType?.includes('presentation') || fileName.match(/\.(pptx?)$/i)) return <Presentation className="h-8 w-8 text-orange-600" />;
    if (mimeType?.includes('document') || fileName.match(/\.(docx?)$/i)) return <FileText className="h-8 w-8 text-blue-700" />;
    if (mimeType?.includes('zip') || mimeType?.includes('archive')) return <Archive className="h-8 w-8 text-orange-600" />;
    return <File className="h-8 w-8 text-blue-600" />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-PT');
  };

  // Filter files based on current folder and search
  const filteredFiles = files.filter(file => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFolder = currentFolder ? file.folderId === currentFolder : !file.folderId;
    console.log('[Frontend Debug] File:', file.fileName, 'folderId:', file.folderId, 'currentFolder:', currentFolder, 'matches:', matchesFolder);
    return matchesSearch && matchesFolder;
  });

  const currentFolderData = folders.filter(folder => 
    currentFolder ? folder.parentId === currentFolder : !folder.parentId
  );

  // Handle file selection
  const toggleFileSelection = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  const selectAllFiles = () => {
    setSelectedFiles(filteredFiles.map(file => file.id));
  };

  const clearSelection = () => {
    setSelectedFiles([]);
  };

  // Preview file
  const previewFile = (file: any) => {
    const isPreviewable = 
      file.mimeType?.startsWith('image/') ||
      file.mimeType?.startsWith('video/') ||
      file.mimeType?.startsWith('audio/') ||
      file.mimeType?.includes('pdf') ||
      file.fileName.match(/\.(pdf|jpg|jpeg|png|gif|mp4|mp3|wav|xlsx?|pptx?|docx?)$/i);
    
    if (isPreviewable) {
      setShowPreview(file);
    } else {
      toast({
        title: "Pré-visualização",
        description: "Pré-visualização não disponível para este tipo de ficheiro",
      });
    }
  };

  if (isLoading) {
    return (
      <Card data-testid="file-manager-loading">
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
    <div className="space-y-6" {...getRootProps()}>
      <input {...getInputProps()} />
      
      {/* Drag overlay */}
      {isDragActive && (
        <div className="fixed inset-0 bg-tatu-green/20 border-4 border-dashed border-tatu-green z-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <Upload className="h-16 w-16 text-tatu-green mx-auto mb-4" />
            <h3 className="text-xl font-bold text-tatu-green">Solte os ficheiros aqui</h3>
            <p className="text-gray-600">para fazer upload</p>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <Card>
        <CardContent className="p-6">
          {/* Breadcrumb */}
          <div className="flex items-center space-x-2 mb-4 text-sm">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setCurrentFolder(null);
                setFolderPath([]);
              }}
              className="text-tatu-green hover:text-tatu-green/80"
            >
              <Home className="h-4 w-4 mr-1" />
              Início
            </Button>
            {folderPath.map((folder, index) => (
              <div key={folder.id} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-gray-400" />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setCurrentFolder(folder.id);
                    setFolderPath(folderPath.slice(0, index + 1));
                  }}
                  className="text-tatu-green hover:text-tatu-green/80"
                >
                  {folder.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Actions Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4 flex-1">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Pesquisar ficheiros..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Action Buttons */}
              <Button
                onClick={() => setShowCreateFolder(true)}
                className="bg-tatu-green hover:bg-green-600 text-white"
              >
                <FolderPlus className="h-4 w-4 mr-2" />
                Nova Pasta
              </Button>

              <div className="relative">
                <input
                  type="file"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    files.forEach(file => {
                      setUploadingFiles(prev => [...prev, {
                        file,
                        progress: 0,
                        status: 'uploading',
                        folderId: currentFolder || undefined
                      }]);
                      uploadMutation.mutate({ file, folderId: currentFolder || undefined });
                    });
                  }}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload">
                  <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white">
                    <span>
                      <Upload className="h-4 w-4 mr-2" />
                      Carregar Ficheiros
                    </span>
                  </Button>
                </label>
              </div>
            </div>

            {/* Selection Actions */}
            {selectedFiles.length > 0 && (
              <div className="flex items-center space-x-2">
                <Badge variant="secondary">
                  {selectedFiles.length} selecionados
                </Badge>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMoveDialog(true)}
                >
                  <Move className="h-4 w-4 mr-1" />
                  Mover
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => setDeleteFileId(selectedFiles[0])}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
                <Button size="sm" variant="ghost" onClick={clearSelection}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}

            {/* View Toggle */}
            <div className="flex border border-gray-300 rounded-lg overflow-hidden ml-4">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-tatu-green text-white' : ''}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={viewMode === 'list' ? 'bg-tatu-green text-white' : ''}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadingFiles.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Progresso do Upload</h3>
            <div className="space-y-3">
              {uploadingFiles.map((uploadingFile, index) => (
                <div key={index} className="flex items-center justify-between py-2">
                  <div className="flex items-center flex-1">
                    <File className="h-5 w-5 text-tatu-accent mr-3" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">
                          {uploadingFile.file.name}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setUploadingFiles(prev => prev.filter(uf => uf.file !== uploadingFile.file))}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress value={uploadingFile.progress} className="flex-1 h-2" />
                        <span className="text-xs text-gray-500 min-w-12">
                          {uploadingFile.status === 'completed' ? '100%' : 
                           uploadingFile.status === 'error' ? 'Erro' :
                           `${Math.round(uploadingFile.progress)}%`}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        {formatBytes(uploadingFile.file.size)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Files Display */}
      {filteredFiles.length === 0 && currentFolderData.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhum ficheiro encontrado</h3>
            <p className="text-gray-500 mb-4">
              {searchQuery ? "Tente ajustar os termos de pesquisa" : "Carregue alguns ficheiros para começar"}
            </p>
            <div className="space-x-2">
              <label htmlFor="file-upload-empty">
                <Button asChild>
                  <span>Carregar Ficheiros</span>
                </Button>
              </label>
              <Button variant="outline" onClick={() => setShowCreateFolder(true)}>
                Criar Pasta
              </Button>
            </div>
            <input
              type="file"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                files.forEach(file => {
                  setUploadingFiles(prev => [...prev, {
                    file,
                    progress: 0,
                    status: 'uploading',
                    folderId: currentFolder || undefined
                  }]);
                  uploadMutation.mutate({ file, folderId: currentFolder || undefined });
                });
              }}
              className="hidden"
              id="file-upload-empty"
            />
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {/* Folders */}
                {currentFolderData.map((folder) => (
                  <div
                    key={folder.id}
                    className="group border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer relative"
                  >
                    <div 
                      className="flex flex-col items-center"
                      onClick={() => {
                        setCurrentFolder(folder.id);
                        setFolderPath([...folderPath, folder]);
                      }}
                    >
                      <Folder className="h-12 w-12 text-amber-500 mb-3" />
                      <h4 className="text-sm font-medium text-center truncate w-full">
                        {folder.name}
                      </h4>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatDate(folder.createdAt)}
                      </p>
                    </div>
                    
                    {/* Folder Actions */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteFolderId(folder.id);
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`group border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer ${
                      selectedFiles.includes(file.id) ? 'border-tatu-green bg-green-50' : 'border-gray-200'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <div className="flex flex-col items-center">
                      <div className="mb-3">
                        {getFileIcon(file.mimeType, file.fileName)}
                      </div>
                      
                      <h4 className="text-sm font-medium mb-1 text-center truncate w-full">
                        {file.fileName}
                      </h4>
                      <p className="text-xs text-gray-500 mb-1">
                        {formatBytes(parseInt(file.fileSize))}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        {formatDate(file.uploadedAt)}
                      </p>
                      
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            previewFile(file);
                          }}
                          title="Visualizar"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            const link = document.createElement('a');
                            link.href = `/api/portal/files/${file.id}/download`;
                            link.download = file.fileName;
                            link.click();
                          }}
                          title="Download"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Share2 className="h-4 w-4 mr-2" />
                              Partilhar
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Move className="h-4 w-4 mr-2" />
                              Mover
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setDeleteFileId(file.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* List View */
              <div className="space-y-2">
                {/* Folders */}
                {currentFolderData.map((folder) => (
                  <div
                    key={folder.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer group"
                  >
                    <div 
                      className="flex items-center space-x-4 flex-1"
                      onClick={() => {
                        setCurrentFolder(folder.id);
                        setFolderPath([...folderPath, folder]);
                      }}
                    >
                      <Folder className="h-8 w-8 text-amber-500" />
                      <div>
                        <h4 className="text-sm font-medium">{folder.name}</h4>
                        <p className="text-xs text-gray-500">Pasta • {formatDate(folder.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteFolderId(folder.id);
                              }}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                  </div>
                ))}

                {/* Files */}
                {filteredFiles.map((file) => (
                  <div
                    key={file.id}
                    className={`flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer ${
                      selectedFiles.includes(file.id) ? 'border-tatu-green bg-green-50' : 'border-gray-200'
                    }`}
                    onClick={() => toggleFileSelection(file.id)}
                  >
                    <div className="flex items-center space-x-4">
                      {getFileIcon(file.mimeType, file.fileName)}
                      <div>
                        <h4 className="text-sm font-medium">{file.fileName}</h4>
                        <p className="text-xs text-gray-500">
                          {formatBytes(parseInt(file.fileSize))} • {formatDate(file.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          previewFile(file);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          const link = document.createElement('a');
                          link.href = `/api/portal/files/${file.id}/download`;
                          link.download = file.fileName;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem>
                            <Share2 className="h-4 w-4 mr-2" />
                            Partilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Move className="h-4 w-4 mr-2" />
                            Mover
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setDeleteFileId(file.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={showCreateFolder} onOpenChange={setShowCreateFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Pasta</DialogTitle>
            <DialogDescription>
              Digite o nome da nova pasta.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="folder-name">Nome da Pasta</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Nome da pasta"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateFolder(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={() => {
                createFolderMutation.mutate({ 
                  name: newFolderName.trim(), 
                  parentId: currentFolder || undefined 
                });
              }}
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              Criar Pasta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* File Preview Dialog */}
      <Dialog open={!!showPreview} onOpenChange={() => setShowPreview(null)}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-semibold truncate">
                {showPreview?.fileName || "Ficheiro"}
              </DialogTitle>
              <div className="flex items-center space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (showPreview) {
                      const link = document.createElement('a');
                      link.href = `/api/portal/files/${showPreview.id}/download`;
                      link.download = showPreview.fileName;
                      link.click();
                    }
                  }}
                  className="flex items-center space-x-1"
                >
                  <Download className="h-4 w-4" />
                  <span>Download</span>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPreview(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </DialogHeader>
          
          <div className="flex justify-center items-center min-h-[400px]">
            {showPreview?.mimeType?.startsWith('image/') ? (
              <img
                src={`/api/portal/files/${showPreview?.id}/download`}
                alt={showPreview?.fileName || "Imagem"}
                className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
              />
            ) : showPreview?.mimeType?.startsWith('video/') ? (
              <video
                controls
                className="max-w-full max-h-[70vh] rounded-lg shadow-lg"
                preload="metadata"
              >
                <source src={`/api/portal/files/${showPreview?.id}/download`} type={showPreview?.mimeType} />
                O seu navegador não suporta reprodução de vídeo.
              </video>
            ) : showPreview?.mimeType?.startsWith('audio/') ? (
              <div className="text-center p-8">
                <Music className="h-16 w-16 text-blue-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">{showPreview?.fileName || "Ficheiro de áudio"}</h3>
                <audio
                  controls
                  className="w-full max-w-md"
                  preload="metadata"
                >
                  <source src={`/api/portal/files/${showPreview?.id}/download`} type={showPreview?.mimeType} />
                  O seu navegador não suporta reprodução de áudio.
                </audio>
              </div>
            ) : showPreview?.mimeType?.includes('pdf') || showPreview?.fileName?.endsWith('.pdf') ? (
              <iframe
                src={`/api/portal/files/${showPreview?.id}/download`}
                title={showPreview?.fileName || "PDF"}
                className="w-full h-[70vh] border-0 rounded-lg shadow-lg"
                loading="lazy"
              />
            ) : showPreview?.fileName?.match(/\.(xlsx?|csv)$/i) ? (
              <div className="text-center p-8 w-full">
                <FileSpreadsheet className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">{showPreview?.fileName || "Ficheiro Excel"}</h3>
                <p className="text-gray-600 mb-4">Ficheiro Excel/CSV</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Para visualizar este ficheiro Excel, clique no botão Download para o transferir e abrir no seu computador.
                  </p>
                  <Button 
                    onClick={() => window.open(`/api/portal/files/${showPreview?.id}/download`, '_blank')}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download e Visualizar
                  </Button>
                </div>
              </div>
            ) : showPreview?.fileName?.match(/\.(pptx?)$/i) ? (
              <div className="text-center p-8 w-full">
                <Presentation className="h-16 w-16 text-orange-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">{showPreview?.fileName || "Apresentação"}</h3>
                <p className="text-gray-600 mb-4">Apresentação PowerPoint</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Para visualizar esta apresentação, clique no botão Download para a transferir e abrir no seu computador.
                  </p>
                  <Button 
                    onClick={() => window.open(`/api/portal/files/${showPreview?.id}/download`, '_blank')}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download e Visualizar
                  </Button>
                </div>
              </div>
            ) : showPreview?.fileName?.match(/\.(docx?)$/i) ? (
              <div className="text-center p-8 w-full">
                <FileText className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">{showPreview?.fileName || "Documento"}</h3>
                <p className="text-gray-600 mb-4">Documento Word</p>
                <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Para visualizar este documento, clique no botão Download para o transferir e abrir no seu computador.
                  </p>
                  <Button 
                    onClick={() => window.open(`/api/portal/files/${showPreview?.id}/download`, '_blank')}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download e Visualizar
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center p-8">
                <File className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-4">{showPreview?.fileName || "Ficheiro"}</h3>
                <p className="text-gray-600">Pré-visualização não disponível para este tipo de ficheiro</p>
                <p className="text-sm text-gray-500 mt-2">Use o botão Download para transferir o ficheiro</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteFileId} onOpenChange={() => setDeleteFileId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Ficheiro</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que quer eliminar este ficheiro? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFileId && deleteMutation.mutate(deleteFileId)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteMutation.isPending ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation Dialog */}
      <AlertDialog open={!!deleteFolderId} onOpenChange={() => setDeleteFolderId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Pasta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem a certeza que pretende eliminar esta pasta? Todos os ficheiros e subpastas contidos serão também eliminados. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolderId && deleteFolderMutation.mutate(deleteFolderId)}
              disabled={deleteFolderMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteFolderMutation.isPending ? "A eliminar..." : "Eliminar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}