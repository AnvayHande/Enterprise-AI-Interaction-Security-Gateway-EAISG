import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { api } from '../lib/api';

interface Policy {
  id: number;
  name: string;
  description: string;
  priority: number;
  enabled: boolean;
  action: string;
}

export function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 10,
    action: 'BLOCK',
  });

  const fetchPolicies = async () => {
    try {
      const data = await api.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createPolicy({
        ...formData,
        enabled: true,
      });
      setOpen(false);
      fetchPolicies();
      // Reset form
      setFormData({ name: '', description: '', priority: 10, action: 'BLOCK' });
    } catch (err) {
      console.error('Failed to create policy', err);
      alert('Failed to create policy');
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Policy Management</h2>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>Create Policy</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Create Policy</DialogTitle>
              <DialogDescription>
                Add a new security policy.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input 
                  required 
                  value={formData.name} 
                  onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
                  placeholder="e.g. Block Sensitive API Keys"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description</label>
                <Textarea 
                  value={formData.description} 
                  onChange={(e: any) => setFormData({...formData, description: e.target.value})} 
                  placeholder="Description of the policy..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Priority (lower = higher prio)</label>
                  <Input 
                    type="number" 
                    required 
                    value={formData.priority} 
                    onChange={(e: any) => setFormData({...formData, priority: parseInt(e.target.value)})} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Action</label>
                  <Select 
                    value={formData.action} 
                    onChange={(e: any) => setFormData({...formData, action: e.target.value})}
                  >
                    <option value="BLOCK">BLOCK</option>
                    <option value="SANITIZE">SANITIZE</option>
                    <option value="WARN">WARN</option>
                    <option value="ALLOW">ALLOW</option>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button type="submit">Save Policy</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">{policy.priority}</TableCell>
                <TableCell>{policy.name}</TableCell>
                <TableCell>
                  <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                    {policy.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant={policy.action === 'BLOCK' ? 'destructive' : policy.action === 'SANITIZE' ? 'default' : policy.action === 'WARN' ? 'secondary' : 'outline'}>
                    {policy.action}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
