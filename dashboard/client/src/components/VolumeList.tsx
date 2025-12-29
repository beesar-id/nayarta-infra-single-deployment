import React, { useState, useMemo } from 'react';
import { apiService } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from './ConfirmDialog';
import { Loader2, Trash2, HardDrive, ChevronDown, ChevronUp, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import type { Volume } from '../types';

interface VolumeListProps {
  volumes: Volume[];
  onRefresh: () => void;
}

export const VolumeList: React.FC<VolumeListProps> = ({
  volumes,
  onRefresh,
}) => {
  const [deletingName, setDeletingName] = useState<string | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; volumeName: string } | null>(null);
  const [expandedVolumes, setExpandedVolumes] = useState<Set<string>>(new Set());
  const [volumeDetails, setVolumeDetails] = useState<Record<string, Volume>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString();
  };

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleDelete = (volumeName: string) => {
    setDeleteConfirmDialog({ open: true, volumeName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDialog) return;
    
    const { volumeName } = deleteConfirmDialog;
    setDeletingName(volumeName);
    
    try {
      const result = await apiService.deleteVolume(volumeName);
      if (result.success) {
        toast.success(result.message || `Volume ${volumeName} deleted successfully`);
        setDeleteConfirmDialog(null);
        onRefresh();
      } else {
        toast.error(result.message || 'Failed to delete volume');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete volume');
    } finally {
      setDeletingName(null);
    }
  };

  const toggleExpand = async (volumeName: string) => {
    const newExpanded = new Set(expandedVolumes);
    if (newExpanded.has(volumeName)) {
      newExpanded.delete(volumeName);
    } else {
      newExpanded.add(volumeName);
      // Fetch details if not already loaded
      if (!volumeDetails[volumeName]) {
        try {
          const details = await apiService.getVolumeDetails(volumeName);
          setVolumeDetails(prev => ({ ...prev, [volumeName]: details }));
        } catch (error: any) {
          toast.error(`Failed to load volume details: ${error.message}`);
        }
      }
    }
    setExpandedVolumes(newExpanded);
  };

  // Filter volumes based on search query
  const filteredVolumes = useMemo(() => {
    if (!searchQuery.trim()) {
      return volumes;
    }
    const query = searchQuery.toLowerCase();
    return volumes.filter(volume => 
      volume.name.toLowerCase().includes(query) ||
      volume.driver.toLowerCase().includes(query) ||
      volume.scope.toLowerCase().includes(query) ||
      volume.mountpoint.toLowerCase().includes(query)
    );
  }, [volumes, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredVolumes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVolumes = filteredVolumes.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (volumes.length === 0) {
    return (
      <Card className="border border-primary">
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground text-center">No volumes found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search volumes by name, driver, scope, or mountpoint..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 border border-primary"
          />
        </div>
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="mb-2 text-sm text-muted-foreground">
          Found {filteredVolumes.length} volume{filteredVolumes.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </div>
      )}

      {/* Volumes List */}
      {volumes.length === 0 ? (
        <Card className="border border-primary">
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground text-center">No volumes found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedVolumes.length === 0 ? (
            <Card className="border border-primary">
              <CardContent className="p-6">
                <p className="text-sm text-muted-foreground text-center">No volumes found matching your search</p>
              </CardContent>
            </Card>
          ) : (
            paginatedVolumes.map((volume) => {
          const isExpanded = expandedVolumes.has(volume.name);
          const details = volumeDetails[volume.name] || volume;
          
          return (
            <Card key={volume.name} className="border border-primary">
              <CardContent className="p-2 px-2">
                <div className="grid grid-cols-12 gap-4 items-start">
                  {/* Volume Icon */}
                  <div className="col-span-1 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-primary" />
                  </div>

                  {/* Volume Name */}
                  <div className="min-w-0 col-span-4">
                    <p className="text-xs text-muted-foreground mb-0.5">Volume Name</p>
                    <p className="font-medium text-sm truncate">{volume.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(volume.created)}
                    </p>
                  </div>

                  {/* Driver */}
                  <div className="min-w-0 col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Driver</p>
                    <p className="text-sm truncate">{volume.driver}</p>
                  </div>

                  {/* Scope */}
                  <div className="min-w-0 col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Scope</p>
                    <p className="text-sm truncate">{volume.scope}</p>
                  </div>

                  {/* Usage Data */}
                  <div className="min-w-0 col-span-2">
                    <p className="text-xs text-muted-foreground mb-0.5">Size</p>
                    <p className="text-sm truncate">
                      {volume.usageData ? formatBytes(volume.usageData.size) : 'N/A'}
                    </p>
                    {volume.usageData && volume.usageData.refCount > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {volume.usageData.refCount} container{volume.usageData.refCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="col-span-1 flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(volume.name)}
                      className="h-8 w-8 p-0"
                    >
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(volume.name)}
                      disabled={deletingName !== null}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      {deletingName === volume.name ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-primary/10">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Mount Point</p>
                        <p className="font-mono text-xs break-all">{details.mountpoint}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Created</p>
                        <p>{formatDate(details.created)}</p>
                      </div>
                      {details.usageData && (
                        <>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Size</p>
                            <p>{formatBytes(details.usageData.size)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground mb-1">Reference Count</p>
                            <p>{details.usageData.refCount}</p>
                          </div>
                        </>
                      )}
                      {Object.keys(details.labels || {}).length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Labels</p>
                          <div className="space-y-1">
                            {Object.entries(details.labels).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {Object.keys(details.options || {}).length > 0 && (
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground mb-1">Options</p>
                          <div className="space-y-1">
                            {Object.entries(details.options).map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="font-medium">{key}:</span> {value}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border border-primary mt-3">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredVolumes.length)} of {filteredVolumes.length} volume{filteredVolumes.length !== 1 ? 's' : ''}
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

      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <ConfirmDialog
          open={deleteConfirmDialog.open}
          onOpenChange={(open) => setDeleteConfirmDialog(open ? deleteConfirmDialog : null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Volume"
          description={`Apakah Anda yakin ingin menghapus volume "${deleteConfirmDialog.volumeName}"? Tindakan ini tidak dapat dibatalkan dan dapat mempengaruhi container yang menggunakan volume ini.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={deletingName === deleteConfirmDialog.volumeName}
        />
      )}
    </>
  );
};

