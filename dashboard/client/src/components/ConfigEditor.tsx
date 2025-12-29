import React, { useEffect, useState } from 'react';
import { apiService } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, FileCode2, Settings2, Network, Edit, ChevronDown, ChevronUp, Wrench, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';

export const ConfigEditor: React.FC = () => {
  const [envContent, setEnvContent] = useState('');
  const [envLoading, setEnvLoading] = useState(false);
  const [envSaving, setEnvSaving] = useState(false);

  const [mediamtxContent, setMediamtxContent] = useState('');
  const [mediamtxLoading, setMediamtxLoading] = useState(false);
  const [mediamtxSaving, setMediamtxSaving] = useState(false);

  const [hostIp, setHostIp] = useState('');
  const [hostIpUpdating, setHostIpUpdating] = useState(false);
  const [hostIpLoading, setHostIpLoading] = useState(true);
  const [buildImageLoading, setBuildImageLoading] = useState(false);
  const [githubToken, setGithubToken] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const [envEditing, setEnvEditing] = useState(false);
  const [mediamtxEditing, setMediamtxEditing] = useState(false);
  const [advancedExpanded, setAdvancedExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'env' | 'mediamtx'>('env');

  const loadEnv = async () => {
    try {
      setEnvLoading(true);
      const content = await apiService.getEnvConfig();
      setEnvContent(content ?? '');
    } catch (err: any) {
      toast.error('Gagal memuat file .env');
      console.error(err);
    } finally {
      setEnvLoading(false);
    }
  };

  const saveEnv = async () => {
    try {
      setEnvSaving(true);
      await apiService.updateEnvConfig(envContent);
      toast.success('File .env berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan file .env');
      console.error(err);
    } finally {
      setEnvSaving(false);
    }
  };

  const loadMediamtx = async () => {
    try {
      setMediamtxLoading(true);
      const content = await apiService.getMediamtxConfig();
      setMediamtxContent(content ?? '');
    } catch (err: any) {
      toast.error('Gagal memuat mediamtx.yml');
      console.error(err);
    } finally {
      setMediamtxLoading(false);
    }
  };

  const saveMediamtx = async () => {
    try {
      setMediamtxSaving(true);
      await apiService.updateMediamtxConfig(mediamtxContent);
      toast.success('mediamtx.yml berhasil disimpan');
    } catch (err: any) {
      toast.error('Gagal menyimpan mediamtx.yml');
      console.error(err);
    } finally {
      setMediamtxSaving(false);
    }
  };

  const updateHostIp = async () => {
    if (!hostIp.trim()) {
      toast.error('IP address tidak boleh kosong');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(hostIp.trim())) {
      toast.error('Format IP address tidak valid');
      return;
    }

    try {
      setHostIpUpdating(true);
      const result = await apiService.updateHostIp(hostIp.trim());
      toast.success(result.message || 'HOST_IP dan SSE_ALLOW_ORIGINS berhasil diupdate');
      // Reload env and mediamtx to show updated values
      await Promise.all([loadEnv(), loadMediamtx()]);
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal mengupdate HOST_IP');
      console.error(err);
    } finally {
      setHostIpUpdating(false);
    }
  };

  const buildImageByIp = async () => {
    if (!hostIp.trim()) {
      toast.error('IP address tidak boleh kosong');
      return;
    }

    if (!githubToken.trim()) {
      toast.error('GitHub PAT token tidak boleh kosong');
      return;
    }

    // Basic IP validation
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(hostIp.trim())) {
      toast.error('Format IP address tidak valid');
      return;
    }

    try {
      setBuildImageLoading(true);
      const result = await apiService.buildImageByIp(hostIp.trim(), githubToken.trim());
      toast.success(result.message || 'Image build berhasil di-trigger');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal trigger image build');
      console.error(err);
    } finally {
      setBuildImageLoading(false);
    }
  };

  const resetToDefault = async () => {
    try {
      setResetLoading(true);
      const result = await apiService.resetToDefault();
      toast.success(result.message || 'Berhasil reset ke default');
      // Reload all configs to show updated values
      await Promise.all([loadEnv(), loadMediamtx()]);
      // Reset host IP to localhost
      setHostIp('localhost');
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Gagal reset ke default');
      console.error(err);
    } finally {
      setResetLoading(false);
    }
  };

  useEffect(() => {
    // Load both configs on first mount
    loadEnv();
    loadMediamtx();
  }, []);

  useEffect(() => {
    // Extract current HOST_IP from env content when loaded
    if (envContent) {
      const match = envContent.match(/^HOST_IP=(.+)$/m);
      if (match) {
        setHostIp(match[1].trim());
        setHostIpLoading(false); // Enable input after data is loaded
      } else {
        setHostIpLoading(false); // Enable input even if HOST_IP not found
      }
    }
  }, [envContent]);

  return (
    <div className="space-y-4">
      {/* Host IP Section - Always Visible */}
      <Card className="border border-primary">
        <CardHeader className="pb-2 pt-3 px-3">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Network className="h-4 w-4 text-primary" />
            Host IP Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Input
                  id="host-ip-input"
                  type="text"
                  placeholder="e.g., 192.168.1.100"
                  value={hostIp}
                  onChange={(e) => setHostIp(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !hostIpUpdating && !hostIpLoading) {
                      updateHostIp();
                    }
                  }}
                  disabled={hostIpUpdating || hostIpLoading || buildImageLoading || resetLoading}
                  className="font-mono flex-1"
                />
                <Button
                  variant="default"
                  size="sm"
                  onClick={updateHostIp}
                  disabled={hostIpUpdating || !hostIp.trim() || hostIpLoading || buildImageLoading || resetLoading}
                  className="border border-primary"
                >
                  {hostIpUpdating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    <>
                      <Network className="h-4 w-4" />
                      Update Host IP
                    </>
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  id="github-token-input"
                  type="password"
                  placeholder="GitHub PAT Token (ghp_...)"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  disabled={buildImageLoading || hostIpUpdating || hostIpLoading || resetLoading}
                  className="font-mono flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={buildImageByIp}
                  disabled={buildImageLoading || !hostIp.trim() || !githubToken.trim() || hostIpLoading || hostIpUpdating || resetLoading}
                  className="border border-primary"
                >
                  {buildImageLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pulling...
                    </>
                  ) : (
                    <>
                      <Wrench className="h-4 w-4" />
                      Build Image by IP
                    </>
                  )}
                </Button>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={resetToDefault}
                  disabled={resetLoading || hostIpUpdating || buildImageLoading || hostIpLoading}
                  className="border border-primary"
                >
                  {resetLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      Reset Default
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Section - Collapsible */}
      <Card className="border border-primary">
        <CardHeader className="pb-2 pt-3 px-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Settings2 className="h-4 w-4 text-primary" />
              Advanced Configuration
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setAdvancedExpanded(!advancedExpanded)}
              className="h-6 w-6 p-0"
            >
              {advancedExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {advancedExpanded && (
          <CardContent className="px-3 pb-3">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'env' | 'mediamtx')} className="w-full">
              <div className="flex items-center justify-between mb-3">
                <TabsList>
                  <TabsTrigger value="env" className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4" />
                    .env
                  </TabsTrigger>
                  <TabsTrigger value="mediamtx" className="flex items-center gap-2">
                    <FileCode2 className="h-4 w-4" />
                    mediamtx.yml
                  </TabsTrigger>
                </TabsList>
                {activeTab === 'env' ? (
                  envEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setEnvEditing(false);
                        loadEnv(); // Reload to discard changes
                      }}
                      className="border border-primary"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEnvEditing(true);
                        if (!envContent) {
                          loadEnv();
                        }
                      }}
                      className="rounded-full"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )
                ) : (
                  mediamtxEditing ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setMediamtxEditing(false);
                        loadMediamtx(); // Reload to discard changes
                      }}
                      className="border border-primary"
                    >
                      Cancel
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setMediamtxEditing(true);
                        if (!mediamtxContent) {
                          loadMediamtx();
                        }
                      }}
                      className="rounded-full"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )
                )}
              </div>

              <TabsContent value="env" className="mt-0 space-y-2">
                {envLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={envContent}
                      onChange={(e) => setEnvContent(e.target.value)}
                      className="font-mono text-xs min-h-[400px]"
                      spellCheck={false}
                      disabled={!envEditing}
                    />
                    {envEditing && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadEnv}
                          disabled={envLoading || envSaving}
                          className="border border-primary"
                        >
                          {envLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reload'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await saveEnv();
                            setEnvEditing(false);
                          }}
                          disabled={envSaving}
                          className="border border-primary"
                        >
                          {envSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="mediamtx" className="mt-0 space-y-2">
                {mediamtxLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <>
                    <Textarea
                      value={mediamtxContent}
                      onChange={(e) => setMediamtxContent(e.target.value)}
                      className="font-mono text-xs min-h-[400px]"
                      spellCheck={false}
                      disabled={!mediamtxEditing}
                    />
                    {mediamtxEditing && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={loadMediamtx}
                          disabled={mediamtxLoading || mediamtxSaving}
                          className="border border-primary"
                        >
                          {mediamtxLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reload'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            await saveMediamtx();
                            setMediamtxEditing(false);
                          }}
                          disabled={mediamtxSaving}
                          className="border border-primary"
                        >
                          {mediamtxSaving ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            'Save'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        )}
      </Card>

    </div>
  );
};



