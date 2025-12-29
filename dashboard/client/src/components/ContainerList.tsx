import React, { useState, useMemo, useEffect } from 'react';
import { apiService } from '../services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContainerDetailsDialog } from './ContainerDetailsDialog';
import { ContainerLogsDialog } from './ContainerLogsDialog';
import { ContainerEnvDialog } from './ContainerEnvDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { Loader2, Container as PackageContainer, Clock, ChevronDown, ChevronUp, MoreVertical, Play, RotateCw, FileText, Settings, Trash2, Pause, Search, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { toast } from 'sonner';
import { Container } from '@/types';

interface ContainerListProps {
  containers: Container[];
  onRefresh: () => void;
}

export const ContainerList: React.FC<ContainerListProps> = ({
  containers,
  onRefresh,
}) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [expandedContainers, setExpandedContainers] = useState<Set<string>>(new Set());
  const [detailsDialog, setDetailsDialog] = useState<{ open: boolean; containerId: string; containerName: string } | null>(null);
  const [logsDialog, setLogsDialog] = useState<{ open: boolean; containerId: string; containerName: string } | null>(null);
  const [envDialog, setEnvDialog] = useState<{ open: boolean; containerId: string; containerName: string } | null>(null);
  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ open: boolean; containerId: string; containerName: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const handleContainerAction = async (id: string, action: 'start' | 'stop' | 'restart' | 'remove') => {
    if (action === 'remove') {
      const container = containers.find(c => c.id === id);
      setDeleteConfirmDialog({ 
        open: true, 
        containerId: id, 
        containerName: container?.name || 'this container' 
      });
      return;
    }
    
    setLoading(id);
    try {
      await apiService.containerAction(id, action);
      toast.success(`Container ${action} berhasil`);
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || `Gagal ${action} container`);
      console.error('Error performing action:', error);
    } finally {
      setLoading(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmDialog) return;
    
    setLoading(deleteConfirmDialog.containerId);
    setDeleteConfirmDialog(null);
    
    try {
      await apiService.containerAction(deleteConfirmDialog.containerId, 'remove');
      toast.success('Container removed successfully');
      setTimeout(() => {
        onRefresh();
      }, 1000);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Gagal menghapus container');
      console.error('Error removing container:', error);
    } finally {
      setLoading(null);
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedContainers);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedContainers(newExpanded);
  };

  const getStatusBadge = (state: string) => {
    switch (state) {
      case 'running':
        return (
          <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-600 rounded-full shadow-none flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" />
            Running
          </Badge>
        );
      case 'exited':
        return (
          <Badge variant="destructive" className="text-xs rounded-full flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" />
            Stopped
          </Badge>
        );
      case 'created':
        return (
          <Badge variant="secondary" className="text-xs rounded-full flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" />
            Created
          </Badge>
        );
      case 'restarting':
        return (
          <Badge variant="outline" className="text-xs rounded-full flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" />
            Restarting
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="text-xs rounded-full flex items-center gap-1">
            <Circle className="h-2 w-2 fill-current" />
            {state}
          </Badge>
        );
    }
  };


  // Filter containers based on search query
  const filteredContainers = useMemo(() => {
    if (!searchQuery.trim()) {
      return containers;
    }
    const query = searchQuery.toLowerCase();
    return containers.filter(container => 
      container.name.toLowerCase().includes(query) ||
      container.id.toLowerCase().includes(query) ||
      container.image.toLowerCase().includes(query) ||
      container.status.toLowerCase().includes(query) ||
      container.state.toLowerCase().includes(query)
    );
  }, [containers, searchQuery]);

  // Pagination
  const totalPages = Math.ceil(filteredContainers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedContainers = filteredContainers.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  return (
    <>
      {/* Search Bar */}
      <div className="mb-3">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search containers by name, ID, image, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 border border-primary"
          />
        </div>
      </div>

      {/* Results Info */}
      {searchQuery && (
        <div className="mb-2 text-sm text-muted-foreground">
          Found {filteredContainers.length} container{filteredContainers.length === 1 ? '' : 's'} matching "{searchQuery}"
        </div>
      )}

      {/* Containers List */}
      {containers.length === 0 ? (
        <Card className="border border-primary">
          <CardContent className="py-8 text-center">
            <p className="text-sm text-muted-foreground">Tidak ada container yang ditemukan</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {paginatedContainers.length === 0 ? (
            <Card className="border border-primary">
              <CardContent className="py-8 text-center">
                <p className="text-sm text-muted-foreground">No containers found matching your search</p>
              </CardContent>
            </Card>
          ) : (
          paginatedContainers.map((container) => {
          const isExpanded = expandedContainers.has(container.id);
          const isLoading = loading === container.id;
          
          return (
            <Card key={container.id} className="hover:shadow-sm transition-shadow border border-primary">
              <CardContent className="p-2 px-2">
                <div className="flex items-center gap-4">
                  {/* Icon Container */}
                  <div className="shrink-0">
                    <PackageContainer className="h-5 w-5 text-primary" />
                  </div>

                  {/* Container Info */}
                  <div className="flex-1 grid grid-cols-12 gap-4 items-center">
                  {/* Container Name Section */}
                  <div className="col-span-4 overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-0.5">Container Name</p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm truncate">{container.name}</p>
                      {container.profile && container.profile !== 'unknown' && (
                        <Badge variant="outline" className="text-xs rounded-full border-primary">
                          {container.profile}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      ID: {container.id.substring(0, 12)}
                    </p>
                  </div>

                  {/* Image Section */}
                  <div className="col-span-4 overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-0.5">Image</p>
                    <p className="text-sm truncate">{container.image}</p>
                  </div>

                  {/* Status Section */}
                  <div className="col-span-3 overflow-hidden">
                    <p className="text-xs text-muted-foreground mb-0.5">Status</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {getStatusBadge(container.state)}
                      {container.state === 'running' && (
                        <ContainerUptime containerId={container.id} />
                      )}
                    </div>
                  </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 justify-end col-span-1">
                      <Button
                        onClick={() => toggleExpand(container.id)}
                        variant="ghost"
                        size="icon"
                        title="Toggle Details"
                        className="rounded-full"
                      >
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            disabled={isLoading}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {container.state === 'running' ? (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleContainerAction(container.id, 'stop')}
                                disabled={isLoading}
                              >
                                <Pause className="mr-2 h-4 w-4" />
                                Stop
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleContainerAction(container.id, 'restart')}
                                disabled={isLoading}
                              >
                                <RotateCw className="mr-2 h-4 w-4" />
                                Restart
                              </DropdownMenuItem>
                            </>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => handleContainerAction(container.id, 'start')}
                              disabled={isLoading}
                            >
                              <Play className="mr-2 h-4 w-4" />
                              Start
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => setDetailsDialog({ open: true, containerId: container.id, containerName: container.name })}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setLogsDialog({ open: true, containerId: container.id, containerName: container.name })}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            Logs
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setEnvDialog({ open: true, containerId: container.id, containerName: container.name })}
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Env
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleContainerAction(container.id, 'remove')}
                            disabled={isLoading}
                            className="text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t">
                    <ContainerExpandedDetails containerId={container.id} />
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
                Showing {startIndex + 1} to {Math.min(endIndex, filteredContainers.length)} of {filteredContainers.length} container{filteredContainers.length === 1 ? '' : 's'}
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

      {/* Dialogs */}
      {detailsDialog && (
        <ContainerDetailsDialog
          open={detailsDialog.open}
          onOpenChange={(open) => setDetailsDialog(open ? detailsDialog : null)}
          containerId={detailsDialog.containerId}
          containerName={detailsDialog.containerName}
        />
      )}
      {logsDialog && (
        <ContainerLogsDialog
          open={logsDialog.open}
          onOpenChange={(open) => setLogsDialog(open ? logsDialog : null)}
          containerId={logsDialog.containerId}
          containerName={logsDialog.containerName}
        />
      )}
      {envDialog && (
        <ContainerEnvDialog
          open={envDialog.open}
          onOpenChange={(open) => setEnvDialog(open ? envDialog : null)}
          containerId={envDialog.containerId}
          containerName={envDialog.containerName}
        />
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <ConfirmDialog
          open={deleteConfirmDialog.open}
          onOpenChange={(open) => setDeleteConfirmDialog(open ? deleteConfirmDialog : null)}
          onConfirm={handleDeleteConfirm}
          title="Delete Container"
          description={`Apakah Anda yakin ingin menghapus container "${deleteConfirmDialog.containerName}"? Tindakan ini tidak dapat dibatalkan.`}
          confirmText="Delete"
          cancelText="Cancel"
          variant="destructive"
          loading={loading === deleteConfirmDialog.containerId}
        />
      )}
    </>
  );
};

const ContainerUptime: React.FC<{ containerId: string }> = ({ containerId }) => {
  const [uptime, setUptime] = useState<string | null>(null);

  useEffect(() => {
    const fetchUptime = async () => {
      try {
        const details = await apiService.getContainerDetails(containerId);
        if (details.started) {
          const start = new Date(details.started).getTime();
          const now = Date.now();
          const diff = now - start;
          
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          if (days > 0) {
            setUptime(`${days} day${days > 1 ? 's' : ''}`);
          } else if (hours > 0) {
            setUptime(`${hours} hour${hours > 1 ? 's' : ''}`);
          } else {
            setUptime(`${minutes} minute${minutes > 1 ? 's' : ''}`);
          }
        }
      } catch (error) {
        console.error('Error fetching uptime:', error);
      }
    };

    fetchUptime();
    const interval = setInterval(fetchUptime, 60000);
    return () => clearInterval(interval);
  }, [containerId]);

  if (!uptime) return null;

  return (
    <div className="flex items-center gap-1 text-xs text-muted-foreground">
      <Clock className="h-3 w-3" />
      <span>{uptime}</span>
    </div>
  );
};

const ContainerExpandedDetails: React.FC<{ containerId: string }> = ({ containerId }) => {
  const [details, setDetails] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiService.getContainerDetails(containerId),
      apiService.getContainerStats(containerId).catch(() => null),
    ])
      .then(([detailsData, statsData]) => {
        setDetails(detailsData);
        setStats(statsData);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [containerId]);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!details) return null;

  return (
    <div className="space-y-2 text-sm">
      {/* Ports */}
      {details.ports && Object.keys(details.ports).length > 0 && (
        <div>
          <p className="text-xs font-medium text-muted-foreground mb-0.5">Ports</p>
          <div className="flex flex-wrap gap-1">
            {Object.entries(details.ports).map(([port, config]: [string, any]) => (
              <Badge key={port} variant="outline" className="text-xs">
                {config?.[0]?.HostPort ? `${config[0].HostPort}:${port}/${config[0].Type}` : `${port}/${config?.[0]?.Type || 'tcp'}`}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Resource Usage */}
      {stats && (
        <div className="grid grid-cols-2 gap-2">
          {stats.cpu !== undefined && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">CPU</p>
              <p className="text-sm font-medium">{(stats.cpu * 100).toFixed(2)}%</p>
            </div>
          )}
          {stats.memory && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Memory</p>
              <p className="text-sm font-medium">{formatBytes(stats.memory.usage)} / {formatBytes(stats.memory.limit)}</p>
            </div>
          )}
          {stats.disk && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Disk R/W</p>
              <p className="text-sm font-medium">{formatBytes(stats.disk.read)} / {formatBytes(stats.disk.write)}</p>
            </div>
          )}
          {stats.network && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-0.5">Network I/O</p>
              <p className="text-sm font-medium">↓ {formatBytes(stats.network.rx)} / ↑ {formatBytes(stats.network.tx)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
