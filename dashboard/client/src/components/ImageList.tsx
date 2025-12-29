import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { ConfirmDialog } from './ConfirmDialog';
import { Loader2, Download, Trash2, Disc3, X, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Image, PullProgress } from '../types';

interface ImageListProps {
  images: Image[];
  onRefresh: () => void;
}

export const ImageList: React.FC<ImageListProps> = ({
  images,
  onRefresh,
}) => {
  const [pullImageName, setPullImageName] = useState('');
  const [isPulling, setIsPulling] = useState(false);
  const [pullProgress, setPullProgress] = useState<PullProgress | null>(null);
  const [progressId, setProgressId] = useState<string | null>(null);
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pullingImageId, setPullingImageId] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; imageId: string; imageTags: string[] } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  useEffect(() => {
    if (progressId && isPulling) {
      const interval = setInterval(async () => {
        try {
          const progress = await apiService.getPullProgress(progressId);
          setPullProgress(progress);
          
          if (progress.status === 'completed' || progress.status === 'error' || progress.status === 'cancelled') {
            setIsPulling(false);
            setProgressId(null);
            clearInterval(interval);
            
            if (progress.status === 'completed') {
              toast.success('Image pulled successfully');
              setShowPullDialog(false);
              setPullImageName('');
              setPullingImageId(null);
              onRefresh();
            } else if (progress.status === 'cancelled') {
              // Don't show toast here, it's already shown in handleCancelPull
              setPullingImageId(null);
            } else {
              toast.error(progress.error || 'Failed to pull image');
              setPullingImageId(null);
            }
          }
        } catch (error: any) {
          // If progress not found, it might have been cancelled
          if (error.response?.status === 404) {
            setIsPulling(false);
            setProgressId(null);
            setPullingImageId(null);
            clearInterval(interval);
          } else {
            console.error('Error fetching progress:', error);
            // Don't stop polling on error, just log it
            // The progress might still be updating on backend
          }
        }
      }, 500);
      
      return () => clearInterval(interval);
    }
  }, [progressId, isPulling, onRefresh]);

  const handlePull = async (imageTag?: string) => {
    const imageNameToPull = imageTag || pullImageName.trim();
    
    if (!imageNameToPull) {
      toast.error('Please enter an image name');
      return;
    }

    setIsPulling(true);
    setPullProgress(null);
    setShowPullDialog(true);
    if (imageTag) {
      setPullImageName(imageTag);
    }

    try {
      const result = await apiService.pullImage(imageNameToPull);
      setProgressId(result.progressId);
    } catch (error: any) {
      setIsPulling(false);
      toast.error(error.response?.data?.error || 'Failed to start pull');
    }
  };

  const handlePullExistingImage = async (imageId: string, imageTags: string[]) => {
    // Use the first tag, or if it's <none>:<none>, try to extract from repoDigests
    const imageTag = imageTags[0] && imageTags[0] !== '<none>:<none>' 
      ? imageTags[0] 
      : imageTags.find(tag => tag !== '<none>:<none>') || imageTags[0];
    
    if (!imageTag || imageTag === '<none>:<none>') {
      toast.error('Cannot pull image: no valid tag found');
      return;
    }

    setPullingImageId(imageId);
    await handlePull(imageTag);
  };

  const handleCancelPull = async () => {
    if (!progressId) return;
    
    // Stop polling immediately
    setIsPulling(false);
    const currentProgressId = progressId;
    setProgressId(null);
    setPullingImageId(null);
    
    // Update progress to show cancelled status immediately
    if (pullProgress) {
      setPullProgress({
        ...pullProgress,
        status: 'cancelled',
        error: 'Pull cancelled by user',
      });
    }
    
    // Try to cancel on backend (fire and forget)
    try {
      await apiService.cancelPull(currentProgressId);
      toast.info('Pull cancelled');
    } catch (error: any) {
      // Even if API call fails, we've already stopped polling
      console.warn('Failed to cancel pull on backend:', error);
      toast.info('Pull cancelled (local)');
    }
  };

  const handleDeleteClick = (imageId: string, imageTags: string[]) => {
    setDeleteConfirmDialog({ open: true, imageId, imageTags });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDialog) return;

    const { imageId } = deleteConfirmDialog;
    setDeletingId(imageId);

    try {
      await apiService.deleteImage(imageId);
      toast.success('Image deleted successfully');
      setDeleteConfirmDialog(null);
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete image');
    } finally {
      setDeletingId(null);
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  // Filter images based on search query
  const filteredImages = useMemo(() => {
    if (!searchQuery.trim()) {
      return images;
    }
    const query = searchQuery.toLowerCase();
    return images.filter(image => {
      const tags = image.tags || [];
      const tagMatch = tags.some(tag => tag.toLowerCase().includes(query));
      const idMatch = image.id.toLowerCase().includes(query);
      return tagMatch || idMatch;
    });
  }, [images, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredImages.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedImages = filteredImages.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      {/* Pull Image Section */}
      <Card className="border border-primary mb-4">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold">Pull Image</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., nginx:latest, ubuntu:20.04"
              value={pullImageName}
              onChange={(e) => setPullImageName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isPulling) {
                  handlePull();
                }
              }}
              disabled={isPulling}
              className="flex-1"
            />
            <Button
              onClick={handlePull}
              disabled={isPulling || !pullImageName.trim()}
              variant="outline"
              size="sm"
              className="border border-primary"
            >
              {isPulling ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-1" />
              )}
              Pull
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search images by name, tag, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 border border-primary"
          />
        </div>
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="mb-2 text-sm text-muted-foreground">
          Found {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Images List */}
      <div className="space-y-2">
        {paginatedImages.length === 0 ? (
          <Card className="border border-primary">
            <CardContent className="py-8 text-center">
              <Disc3 className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">No images found</p>
            </CardContent>
          </Card>
        ) : (
          paginatedImages.map((image) => (
            <Card key={image.id} className="hover:shadow-sm transition-shadow border border-primary">
              <CardContent className="p-2 px-2">
                <div className="flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <Disc3 className="h-5 w-5 text-muted-foreground" />
                  </div>

                  <div className="flex-1 min-w-0 grid grid-cols-12 gap-4 items-center">
                    {/* Image Tags */}
                    <div className="min-w-0 col-span-4">
                      <p className="text-xs text-muted-foreground mb-0.5">Image Name</p>
                      <p className="text-sm truncate">
                        {image.tags && image.tags.length > 0 && image.tags[0] !== '<none>:<none>' 
                          ? image.tags[0] 
                          : 'null'}
                        {image.tags && image.tags.length > 1 && (
                          <span className="text-muted-foreground"> (+{image.tags.length - 1} more)</span>
                        )}
                      </p>
                    </div>

                    {/* Size */}
                    <div className="min-w-0 col-span-2">
                      <p className="text-xs text-muted-foreground mb-0.5">Size</p>
                      <p className="text-sm">{formatBytes(image.size)}</p>
                    </div>

                    {/* Created */}
                    <div className="min-w-0 col-span-3">
                      <p className="text-xs text-muted-foreground mb-0.5">Created</p>
                      <p className="text-sm">{formatDate(image.created)}</p>
                    </div>

                    {/* Actions */}
                    <div className="col-span-3 flex justify-end gap-1">
                      <Button
                        onClick={() => handlePullExistingImage(image.id, image.tags)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        disabled={pullingImageId === image.id || isPulling}
                        title="Pull Latest Version"
                      >
                        {pullingImageId === image.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        onClick={() => handleDeleteClick(image.id, image.tags)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={deletingId === image.id}
                        title="Delete Image"
                      >
                        {deletingId === image.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border border-primary mt-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredImages.length)} of {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="border border-primary"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <div className="text-sm text-muted-foreground">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="border border-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pull Progress Dialog */}
      <Dialog 
        open={showPullDialog} 
        onOpenChange={(open) => {
          setShowPullDialog(open);
          if (!open && !isPulling) {
            setProgressId(null);
            setPullProgress(null);
            setPullingImageId(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isPulling && <Loader2 className="h-5 w-5 animate-spin" />}
              Pulling Image: {pullImageName}
            </DialogTitle>
            <DialogDescription>
              {!pullProgress ? (
                'Initializing pull...'
              ) : pullProgress.status === 'starting' ? (
                'Connecting to registry and preparing to download...'
              ) : pullProgress.status === 'completed' ? (
                'Image pulled successfully!'
              ) : pullProgress.status === 'cancelled' ? (
                'Pull operation was cancelled.'
              ) : pullProgress.status === 'error' ? (
                'An error occurred while pulling the image.'
              ) : (
                `Downloading image layers... ${pullProgress.progress}% complete`
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {/* Progress Bar */}
            {pullProgress ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    {pullProgress.progress}%
                    {isPulling && pullProgress.progress < 100 && (
                      <Loader2 className="h-3 w-3 inline-block ml-2 animate-spin" />
                    )}
                  </span>
                </div>
                <Progress value={pullProgress.progress} />
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">
                    <Loader2 className="h-3 w-3 inline-block animate-spin" /> Initializing...
                  </span>
                </div>
                <Progress value={0} />
              </div>
            )}

            {/* Status with more detail */}
            <div>
              <p className="text-sm font-medium mb-1">Status:</p>
              <div className="flex items-center gap-2">
                <Badge 
                  variant="outline"
                  className={
                    pullProgress?.status === 'completed' 
                      ? 'border-green-500 text-green-700 bg-green-50' 
                      : pullProgress?.status === 'error' || pullProgress?.status === 'cancelled'
                      ? 'border-red-500 text-red-700 bg-red-50'
                      : 'border-primary'
                  }
                >
                  {pullProgress?.status || 'starting'}
                </Badge>
                {isPulling && pullProgress && pullProgress.status !== 'completed' && (
                  <span className="text-xs text-muted-foreground">
                    {pullProgress.status === 'starting' && 'Preparing download...'}
                    {pullProgress.status && pullProgress.status.includes('Downloading') && 'Downloading layers...'}
                    {pullProgress.status && pullProgress.status.includes('Extracting') && 'Extracting layers...'}
                    {pullProgress.status && pullProgress.status.includes('Pulling') && 'Pulling from registry...'}
                    {pullProgress.status && pullProgress.status.includes('Waiting') && 'Waiting for download...'}
                    {pullProgress.status && pullProgress.status.includes('Verifying') && 'Verifying checksum...'}
                    {!pullProgress.status?.includes('Downloading') && 
                     !pullProgress.status?.includes('Extracting') && 
                     !pullProgress.status?.includes('Pulling') &&
                     !pullProgress.status?.includes('Waiting') &&
                     !pullProgress.status?.includes('Verifying') &&
                     pullProgress.status !== 'starting' &&
                     pullProgress.status !== 'completed' &&
                     'Processing...'}
                  </span>
                )}
              </div>
            </div>

            {/* Current Activity */}
            {pullProgress && pullProgress.logs && pullProgress.logs.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Current Activity:</p>
                <div className="bg-muted rounded-md p-3">
                  {(() => {
                    const lastLog = pullProgress.logs[pullProgress.logs.length - 1];
                    if (lastLog?.status) {
                      return (
                        <div className="text-sm">
                          <p className="font-medium text-foreground">{lastLog.status}</p>
                          {lastLog.progress && (
                            <p className="text-xs text-muted-foreground mt-1">{lastLog.progress}</p>
                          )}
                          {lastLog.id && (
                            <p className="text-xs text-muted-foreground mt-1">Layer ID: {lastLog.id}</p>
                          )}
                        </div>
                      );
                    }
                    return <p className="text-sm text-muted-foreground">Processing...</p>;
                  })()}
                </div>
              </div>
            )}

            {/* Detailed Logs (Collapsible) */}
            {pullProgress && pullProgress.logs && pullProgress.logs.length > 0 && (
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium mb-2 list-none">
                  <span className="flex items-center gap-2">
                    Detailed Logs ({pullProgress.logs.length} entries)
                    <span className="text-xs text-muted-foreground group-open:hidden">(Click to expand)</span>
                  </span>
                </summary>
                <div className="bg-muted rounded-md p-3 max-h-64 overflow-y-auto mt-2">
                  <div className="space-y-1 font-mono text-xs">
                    {pullProgress.logs.slice(-30).map((log: any, idx: number) => (
                      <div key={idx} className="text-muted-foreground">
                        {log.status && (
                          <span className="text-foreground">{log.status}</span>
                        )}
                        {log.progress && (
                          <span className="ml-2 text-muted-foreground">{log.progress}</span>
                        )}
                        {log.id && (
                          <span className="ml-2 text-muted-foreground">[{log.id}]</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </details>
            )}

            {/* Error */}
            {pullProgress?.error && (
              <div className="bg-destructive/10 border border-destructive rounded-md p-3">
                <p className="text-sm text-destructive">{pullProgress.error}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
              {isPulling && (
                <Button
                  onClick={handleCancelPull}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  Cancel
                </Button>
              )}
              <Button
                onClick={() => {
                  setShowPullDialog(false);
                  setIsPulling(false);
                  setProgressId(null);
                  setPullProgress(null);
                  setPullingImageId(null);
                  if (!pullingImageId) {
                    setPullImageName('');
                  }
                }}
                variant="outline"
                disabled={isPulling}
              >
                {isPulling ? 'Pulling...' : 'Close'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      {deleteConfirmDialog && (
        <ConfirmDialog
          open={deleteConfirmDialog.open}
          onOpenChange={(open) => setDeleteConfirmDialog(open ? deleteConfirmDialog : null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Image"
          description={`Apakah Anda yakin ingin menghapus image "${deleteConfirmDialog.imageTags && deleteConfirmDialog.imageTags.length > 0 && deleteConfirmDialog.imageTags[0] !== '<none>:<none>' ? deleteConfirmDialog.imageTags[0] : 'null'}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={deletingId === deleteConfirmDialog.imageId}
        />
      )}
    </>
  );
};

