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
  destination_id: number;
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

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const data = await api.getRequests();
        setRequests(data);
      } catch (err) {
        console.error('Failed to load requests', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Requests Log</h2>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input type="text" placeholder="Filter by user ID..." />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Request ID</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {requests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium" title={String(req.id)}>{String(req.id).substring(0, 8)}{String(req.id).length > 8 ? '...' : ''}</TableCell>
                <TableCell>{req.user_id}</TableCell>
                <TableCell>{new Date(req.created_at).toLocaleString()}</TableCell>
                <TableCell>{req.risk_score.toFixed(2)}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={req.final_action === 'BLOCK' ? 'destructive' : req.final_action === 'SANITIZE' ? 'default' : req.final_action === 'WARN' ? 'secondary' : 'success'}>
                    {req.final_action}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedRequest(req)}>Details</Button>
                </TableCell>
              </TableRow>
            ))}
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
                  <p className="font-semibold text-muted-foreground">User ID</p>
                  <p>{selectedRequest.user_id}</p>
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
                  <Badge variant={selectedRequest.final_action === 'BLOCK' ? 'destructive' : selectedRequest.final_action === 'SANITIZE' ? 'default' : selectedRequest.final_action === 'WARN' ? 'secondary' : 'success'}>
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
