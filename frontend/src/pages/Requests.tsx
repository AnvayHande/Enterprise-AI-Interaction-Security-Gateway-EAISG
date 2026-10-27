import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { api } from '../lib/api';

interface RequestLog {
  id: string | number;
  user_id: number;
  username?: string;
  destination_id: number;
  ai_model?: string;
  status: string;
  final_action: string;
  risk_score: number;
  created_at: string;
}

interface Finding {
  id: number;
  category: string;
  severity: string;
  description: string;
}

export function Requests() {
  const [requests, setRequests] = useState<RequestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<RequestLog | null>(null);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [loadingFindings, setLoadingFindings] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchRequests = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    setIsRefreshing(true);
    try {
      const data = await api.getRequests();
      setRequests(data);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      if (showLoading) setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchRequests(true);
    const interval = setInterval(() => {
      fetchRequests(false);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedRequest) {
      setLoadingFindings(true);
      api.getRequestFindings(String(selectedRequest.id))
        .then(data => setFindings(data))
        .catch(err => console.error('Failed to load findings', err))
        .finally(() => setLoadingFindings(false));
    } else {
      setFindings([]);
    }
  }, [selectedRequest]);

  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');

  const filteredRequests = requests.filter((req) => {
    const matchesSearch = !searchTerm || (
      String(req.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.username && req.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (req.ai_model && req.ai_model.toLowerCase().includes(searchTerm.toLowerCase())) ||
      req.final_action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.status.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const matchesAction = actionFilter === 'ALL' || req.final_action === actionFilter;
    return matchesSearch && matchesAction;
  });

  if (loading) return <div className="p-12 text-center text-muted-foreground">Loading requests...</div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Requests Log</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Live monitoring • Updates automatically</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchRequests(false)} 
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="ALL">All Actions</option>
            <option value="BLOCK">BLOCK</option>
            <option value="SANITIZE">SANITIZE</option>
            <option value="WARN">WARN</option>
            <option value="ALLOW">ALLOW</option>
          </select>
          <div className="flex w-full max-w-xs items-center space-x-2">
            <Input 
              type="text" 
              placeholder="Filter requests..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                ✕
              </Button>
            )}
          </div>
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Request ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>AI Model</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                  {requests.length === 0 ? 'No requests logged yet.' : 'No requests match your search or filter.'}
                </TableCell>
              </TableRow>
            ) : (
              filteredRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium" title={String(req.id)}>{String(req.id).substring(0, 8)}{String(req.id).length > 8 ? '...' : ''}</TableCell>
                  <TableCell>
                    <span className="font-semibold text-slate-800 dark:text-slate-100">
                      {req.username || `User #${req.user_id}`}
                    </span>
                  </TableCell>
                  <TableCell>{req.ai_model || req.destination_id}</TableCell>
                  <TableCell>{new Date(req.created_at).toLocaleString()}</TableCell>
                  <TableCell>{req.risk_score.toFixed(2)}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={req.final_action === 'BLOCK' ? 'destructive' : req.final_action === 'SANITIZE' ? 'default' : req.final_action === 'WARN' ? 'secondary' : 'outline'}>
                      {req.final_action}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>Details</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!selectedRequest} onOpenChange={(open: boolean) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold text-muted-foreground">Request ID</p>
                  <p>{String(selectedRequest.id)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">User</p>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">{selectedRequest.username || `User ID ${selectedRequest.user_id}`}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">AI Model</p>
                  <p>{selectedRequest.ai_model || selectedRequest.destination_id}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Date</p>
                  <p>{new Date(selectedRequest.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Status</p>
                  <p>{selectedRequest.status}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Risk Score</p>
                  <p>{selectedRequest.risk_score.toFixed(2)}</p>
                </div>
                <div>
                  <p className="font-semibold text-muted-foreground">Final Action</p>
                  <Badge variant={selectedRequest.final_action === 'BLOCK' ? 'destructive' : selectedRequest.final_action === 'SANITIZE' ? 'default' : selectedRequest.final_action === 'WARN' ? 'secondary' : 'outline'}>
                    {selectedRequest.final_action}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="font-semibold text-muted-foreground text-sm mb-2">Audit Trail / Findings</p>
                <div className="text-sm bg-muted p-4 rounded-md space-y-2 max-h-40 overflow-y-auto">
                  {loadingFindings ? (
                    <p>Loading findings...</p>
                  ) : findings.length > 0 ? (
                    findings.map((f, i) => (
                      <div key={i} className="border-b border-muted-foreground/20 pb-2 last:border-0 last:pb-0">
                        <span className="font-medium">[{f.severity}]</span> {f.category}: {f.description}
                      </div>
                    ))
                  ) : (
                    <p>No detailed findings available for this request.</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
