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
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
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
      setFormData({ name: '', description: '', priority: 10, action: 'BLOCK' });
    } catch (err) {
      console.error('Failed to create policy', err);
      alert('Failed to create policy');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicy) return;
    try {
      await api.updatePolicy(selectedPolicy.id, {
        name: formData.name,
        description: formData.description,
        priority: formData.priority,
        action: formData.action,
      });
      setOpenEdit(false);
      setSelectedPolicy(null);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to update policy', err);
      alert('Failed to update policy');
    }
  };

  const handleToggleEnabled = async (policy: Policy) => {
    try {
      await api.updatePolicy(policy.id, {
        enabled: !policy.enabled,
      });
      fetchPolicies();
    } catch (err) {
      console.error('Failed to toggle policy status', err);
      alert('Failed to update policy status');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this policy?')) return;
    try {
      await api.deletePolicy(id);
      fetchPolicies();
    } catch (err) {
      console.error('Failed to delete policy', err);
      alert('Failed to delete policy');
    }
  };

  if (loading) return <div>Loading policies...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Policy Management</h2>
          <p className="text-sm text-muted-foreground">Define active gateway enforcement and routing policies.</p>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={fetchPolicies}>
            Refresh
          </Button>
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
                      onChange={(e: any) => setFormData({...formData, priority: parseInt(e.target.value) || 0})} 
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
      </div>

      {/* Edit Policy Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Policy: {selectedPolicy?.name}</DialogTitle>
            <DialogDescription>
              Update security policy details and action.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input 
                required 
                value={formData.name} 
                onChange={(e: any) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea 
                value={formData.description} 
                onChange={(e: any) => setFormData({...formData, description: e.target.value})} 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Input 
                  type="number" 
                  required 
                  value={formData.priority} 
                  onChange={(e: any) => setFormData({...formData, priority: parseInt(e.target.value) || 0})} 
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
              <Button type="submit">Update Policy</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Priority</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Action</TableHead>
              <TableHead className="text-right">Controls</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.map((policy) => (
              <TableRow key={policy.id}>
                <TableCell className="font-medium">{policy.priority}</TableCell>
                <TableCell>
                  <p className="font-semibold">{policy.name}</p>
                  {policy.description && <p className="text-xs text-muted-foreground">{policy.description}</p>}
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => handleToggleEnabled(policy)}
                    className="inline-flex cursor-pointer transition hover:opacity-80"
                    title="Click to toggle status"
                  >
                    <Badge variant={policy.enabled ? 'default' : 'secondary'}>
                      {policy.enabled ? 'Enabled (Active)' : 'Disabled (Paused)'}
                    </Badge>
                  </button>
                </TableCell>
                <TableCell>
                  <Badge variant={policy.action === 'BLOCK' ? 'destructive' : policy.action === 'SANITIZE' ? 'default' : policy.action === 'WARN' ? 'secondary' : 'outline'}>
                    {policy.action}
                  </Badge>
                </TableCell>
                <TableCell className="text-right space-x-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => {
                      setSelectedPolicy(policy);
                      setFormData({
                        name: policy.name,
                        description: policy.description || '',
                        priority: policy.priority,
                        action: policy.action,
                      });
                      setOpenEdit(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDelete(policy.id)} 
                    className="text-red-500 hover:text-red-700"
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
