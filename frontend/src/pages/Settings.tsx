import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select-native";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from '../lib/api';

interface Destination {
  id: number;
  name: string;
  provider: string;
  trust_level: string;
}

export function Settings() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    provider: 'OpenAI',
    trust_level: 'PUBLIC',
  });

  const fetchDestinations = async () => {
    try {
      const data = await api.getDestinations();
      setDestinations(data);
    } catch (err) {
      console.error('Failed to load destinations', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
  }, []);

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDestination(formData);
      setOpenAdd(false);
      fetchDestinations();
      setFormData({ name: '', provider: 'OpenAI', trust_level: 'PUBLIC' });
    } catch (err) {
      console.error('Failed to add destination', err);
      alert('Failed to add destination');
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDest) return;
    try {
      await api.updateDestination(selectedDest.id, formData);
      setOpenEdit(false);
      fetchDestinations();
      setSelectedDest(null);
    } catch (err) {
      console.error('Failed to edit destination', err);
      alert('Failed to edit destination');
    }
  };

  const openEditDialog = (dest: Destination) => {
    setSelectedDest(dest);
    setFormData({ name: dest.name, provider: dest.provider, trust_level: dest.trust_level });
    setOpenEdit(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage gateway configuration and AI destinations.</p>
      </div>

      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="destinations">AI Destinations</TabsTrigger>
          <TabsTrigger value="risk">Risk Weights</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured Destinations</CardTitle>
              <CardDescription>Manage where prompts are allowed to be routed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div>Loading...</div>
              ) : (
                <div className="space-y-4">
                  {destinations.length > 0 ? (
                    destinations.map((dest) => (
                      <div key={dest.id} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <p className="font-medium">{dest.name}</p>
                          <p className="text-sm text-muted-foreground">Provider: {dest.provider} | Trust: {dest.trust_level}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(dest)}>Edit</Button>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No destinations configured.</p>
                  )}
                  <Button className="mt-4" onClick={() => {
                    setFormData({ name: '', provider: 'OpenAI', trust_level: 'PUBLIC' });
                    setOpenAdd(true);
                  }}>Add Destination</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="risk">
          <Card>
            <CardHeader>
              <CardTitle>Risk Aggregation Weights</CardTitle>
              <CardDescription>Configure the boost applied for multiple independent findings.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User & Role Management</CardTitle>
              <CardDescription>Manage who has access to this dashboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Dialog */}
      <Dialog open={openAdd} onOpenChange={setOpenAdd}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Destination</DialogTitle>
            <DialogDescription>Add a new AI provider destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} placeholder="e.g. OpenAI GPT-4" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={formData.provider} onChange={(e: any) => setFormData({...formData, provider: e.target.value})}>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Azure">Azure</option>
                <option value="Google">Google</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Level</label>
              <Select value={formData.trust_level} onChange={(e: any) => setFormData({...formData, trust_level: e.target.value})}>
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Save</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Destination</DialogTitle>
            <DialogDescription>Modify destination configuration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={formData.name} onChange={(e: any) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={formData.provider} onChange={(e: any) => setFormData({...formData, provider: e.target.value})}>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Azure">Azure</option>
                <option value="Google">Google</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Level</label>
              <Select value={formData.trust_level} onChange={(e: any) => setFormData({...formData, trust_level: e.target.value})}>
                <option value="PUBLIC">PUBLIC</option>
                <option value="INTERNAL">INTERNAL</option>
                <option value="CONFIDENTIAL">CONFIDENTIAL</option>
              </Select>
            </div>
            <DialogFooter>
              <Button type="submit">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
