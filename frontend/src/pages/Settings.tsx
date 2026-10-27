import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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

interface UserItem {
  id: number;
  username: string;
  email: string;
  role: string;
  department_id: number | null;
  department_name: string;
  is_active: boolean;
  created_at: string;
}

interface DepartmentItem {
  id: number;
  name: string;
}

export function Settings() {
  // Destinations state
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loadingDestinations, setLoadingDestinations] = useState(true);
  const [openAddDest, setOpenAddDest] = useState(false);
  const [openEditDest, setOpenEditDest] = useState(false);
  const [selectedDest, setSelectedDest] = useState<Destination | null>(null);
  const [destFormData, setDestFormData] = useState({
    name: '',
    provider: 'OpenAI',
    trust_level: 'PUBLIC',
  });

  // Users & Departments state
  const [users, setUsers] = useState<UserItem[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [openAddUser, setOpenAddUser] = useState(false);
  const [openEditUser, setOpenEditUser] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);
  const [userFormData, setUserFormData] = useState({
    username: '',
    email: '',
    password: '',
    role: 'EMPLOYEE',
    department_id: 0,
  });

  // Risk Weights state
  const [riskWeights, setRiskWeights] = useState({
    boost_amount: 0.15,
    max_score: 1.0,
    low_risk_threshold: 0.40,
    high_risk_threshold: 0.80,
  });
  const [loadingWeights, setLoadingWeights] = useState(true);
  const [savingWeights, setSavingWeights] = useState(false);
  const [weightsSavedMsg, setWeightsSavedMsg] = useState('');

  // Fetch initial data
  const fetchDestinations = async () => {
    try {
      const data = await api.getDestinations();
      setDestinations(data);
    } catch (err) {
      console.error('Failed to load destinations', err);
    } finally {
      setLoadingDestinations(false);
    }
  };

  const fetchUsersAndDepts = async () => {
    try {
      const [uData, dData] = await Promise.all([
        api.getSettingsUsers(),
        api.getDepartments(),
      ]);
      setUsers(uData);
      setDepartments(dData);
      if (dData.length > 0 && userFormData.department_id === 0) {
        setUserFormData(prev => ({ ...prev, department_id: dData[0].id }));
      }
    } catch (err) {
      console.error('Failed to load users or departments', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchRiskWeights = async () => {
    try {
      const data = await api.getRiskWeights();
      setRiskWeights(data);
    } catch (err) {
      console.error('Failed to load risk weights', err);
    } finally {
      setLoadingWeights(false);
    }
  };

  useEffect(() => {
    fetchDestinations();
    fetchUsersAndDepts();
    fetchRiskWeights();
  }, []);

  // --- Destination Handlers ---
  const handleAddDestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createDestination(destFormData);
      setOpenAddDest(false);
      fetchDestinations();
      setDestFormData({ name: '', provider: 'OpenAI', trust_level: 'PUBLIC' });
    } catch (err) {
      console.error('Failed to add destination', err);
      alert('Failed to add destination');
    }
  };

  const handleEditDestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDest) return;
    try {
      await api.updateDestination(selectedDest.id, destFormData);
      setOpenEditDest(false);
      fetchDestinations();
      setSelectedDest(null);
    } catch (err) {
      console.error('Failed to edit destination', err);
      alert('Failed to edit destination');
    }
  };

  const handleDeleteDest = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete AI destination "${name}"?`)) return;
    try {
      await api.deleteDestination(id);
      fetchDestinations();
    } catch (err: any) {
      console.error('Failed to delete destination', err);
      alert(err.message || 'Failed to delete destination');
    }
  };

  // --- User Handlers ---
  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSettingsUser({
        username: userFormData.username,
        email: userFormData.email,
        password: userFormData.password,
        role: userFormData.role,
        department_id: userFormData.department_id || null,
      });
      setOpenAddUser(false);
      fetchUsersAndDepts();
      setUserFormData({
        username: '',
        email: '',
        password: '',
        role: 'EMPLOYEE',
        department_id: departments[0]?.id || 0,
      });
    } catch (err: any) {
      console.error('Failed to add user', err);
      alert(err.message || 'Failed to create user');
    }
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      await api.updateSettingsUser(selectedUser.id, {
        role: selectedUser.role,
        department_id: selectedUser.department_id,
        is_active: selectedUser.is_active,
        password: userFormData.password || undefined,
      });
      setOpenEditUser(false);
      fetchUsersAndDepts();
      setSelectedUser(null);
      setUserFormData(prev => ({ ...prev, password: '' }));
    } catch (err: any) {
      console.error('Failed to edit user', err);
      alert(err.message || 'Failed to update user');
    }
  };

  const handleDeleteUser = async (id: number, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) return;
    try {
      await api.deleteSettingsUser(id);
      fetchUsersAndDepts();
    } catch (err: any) {
      console.error('Failed to delete user', err);
      alert(err.message || 'Failed to delete user');
    }
  };

  // --- Risk Weights Handlers ---
  const handleSaveRiskWeights = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWeights(true);
    setWeightsSavedMsg('');
    try {
      const updated = await api.updateRiskWeights(riskWeights);
      setRiskWeights(updated);
      setWeightsSavedMsg('Risk weights configuration saved successfully!');
      setTimeout(() => setWeightsSavedMsg(''), 4000);
    } catch (err: any) {
      console.error('Failed to save risk weights', err);
      alert(err.message || 'Failed to save risk weights');
    } finally {
      setSavingWeights(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage gateway configuration, AI destinations, risk weights, and users.</p>
      </div>

      <Tabs defaultValue="destinations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="destinations">AI Destinations</TabsTrigger>
          <TabsTrigger value="risk">Risk Weights</TabsTrigger>
          <TabsTrigger value="users">User Management</TabsTrigger>
        </TabsList>
        
        {/* TAB 1: AI Destinations */}
        <TabsContent value="destinations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Configured Destinations</CardTitle>
              <CardDescription>Manage where prompts are allowed to be routed.</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDestinations ? (
                <div>Loading destinations...</div>
              ) : (
                <div className="space-y-4">
                  {destinations.length > 0 ? (
                    destinations.map((dest) => (
                      <div key={dest.id} className="flex items-center justify-between border-b pb-4">
                        <div>
                          <p className="font-medium">{dest.name}</p>
                          <p className="text-sm text-muted-foreground">Provider: {dest.provider} | Trust: {dest.trust_level}</p>
                        </div>
                        <div className="space-x-2">
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedDest(dest);
                            setDestFormData({ name: dest.name, provider: dest.provider, trust_level: dest.trust_level });
                            setOpenEditDest(true);
                          }}>Edit</Button>
                          <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDeleteDest(dest.id, dest.name)}>
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No destinations configured.</p>
                  )}
                  <Button className="mt-4" onClick={() => {
                    setDestFormData({ name: '', provider: 'OpenAI', trust_level: 'PUBLIC' });
                    setOpenAddDest(true);
                  }}>Add Destination</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* TAB 2: Risk Weights & Thresholds */}
        <TabsContent value="risk" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Risk Aggregation Weights & Thresholds</CardTitle>
              <CardDescription>
                Configure the mathematical boost applied when multiple independent detectors agree on a risk, and set the risk score decision boundaries.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingWeights ? (
                <div>Loading configuration...</div>
              ) : (
                <form onSubmit={handleSaveRiskWeights} className="space-y-6 max-w-xl">
                  {weightsSavedMsg && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md text-sm font-medium">
                      ✓ {weightsSavedMsg}
                    </div>
                  )}

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Agreement Boost Amount</label>
                      <p className="text-xs text-muted-foreground">Extra risk added for every corroborating detector after the first (e.g. Presidio + ML Classifier agree).</p>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        max="0.5"
                        value={riskWeights.boost_amount}
                        onChange={(e) => setRiskWeights({ ...riskWeights, boost_amount: parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-sm font-medium">Max Risk Score Ceiling</label>
                      <p className="text-xs text-muted-foreground">Upper bound for aggregated risk score (default: 1.0).</p>
                      <Input
                        type="number"
                        step="0.1"
                        min="0.5"
                        max="2.0"
                        value={riskWeights.max_score}
                        onChange={(e) => setRiskWeights({ ...riskWeights, max_score: parseFloat(e.target.value) || 1.0 })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-1">
                        <label className="text-sm font-medium">Low Risk Threshold (ALLOW)</label>
                        <p className="text-xs text-muted-foreground">Below this score, prompts default to ALLOW.</p>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.1"
                          max="0.6"
                          value={riskWeights.low_risk_threshold}
                          onChange={(e) => setRiskWeights({ ...riskWeights, low_risk_threshold: parseFloat(e.target.value) || 0.4 })}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-sm font-medium">High Risk Threshold (BLOCK)</label>
                        <p className="text-xs text-muted-foreground">Above this score, prompts default to BLOCK.</p>
                        <Input
                          type="number"
                          step="0.05"
                          min="0.5"
                          max="0.99"
                          value={riskWeights.high_risk_threshold}
                          onChange={(e) => setRiskWeights({ ...riskWeights, high_risk_threshold: parseFloat(e.target.value) || 0.8 })}
                        />
                      </div>
                    </div>
                  </div>

                  <Button type="submit" disabled={savingWeights}>
                    {savingWeights ? 'Saving...' : 'Save Configuration'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: User Management */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>User & Role Management</CardTitle>
                <CardDescription>
                  Manage employee accounts, assign departments for policy scoping, and control dashboard access.
                </CardDescription>
              </div>
              <Button onClick={() => setOpenAddUser(true)}>Add User</Button>
            </CardHeader>
            <CardContent>
              {loadingUsers ? (
                <div>Loading users...</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-medium">{u.username}</TableCell>
                          <TableCell className="text-muted-foreground">{u.email}</TableCell>
                          <TableCell>
                            <Badge variant={u.role === 'ADMIN' ? 'default' : u.role === 'MANAGER' ? 'secondary' : 'outline'}>
                              {u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{u.department_name}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${u.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                              {u.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setUserFormData(prev => ({ ...prev, password: '' }));
                                setOpenEditUser(true);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700"
                              onClick={() => handleDeleteUser(u.id, u.username)}
                            >
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* --- Dialogs --- */}

      {/* Destination Add Dialog */}
      <Dialog open={openAddDest} onOpenChange={setOpenAddDest}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Destination</DialogTitle>
            <DialogDescription>Add a new AI provider destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddDestSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={destFormData.name} onChange={(e: any) => setDestFormData({...destFormData, name: e.target.value})} placeholder="e.g. OpenAI GPT-4" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={destFormData.provider} onChange={(e: any) => setDestFormData({...destFormData, provider: e.target.value})}>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Azure">Azure</option>
                <option value="Google">Google</option>
                <option value="Perplexity">Perplexity</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Level</label>
              <Select value={destFormData.trust_level} onChange={(e: any) => setDestFormData({...destFormData, trust_level: e.target.value})}>
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

      {/* Destination Edit Dialog */}
      <Dialog open={openEditDest} onOpenChange={setOpenEditDest}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Destination</DialogTitle>
            <DialogDescription>Modify destination configuration.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditDestSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input required value={destFormData.name} onChange={(e: any) => setDestFormData({...destFormData, name: e.target.value})} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Provider</label>
              <Select value={destFormData.provider} onChange={(e: any) => setDestFormData({...destFormData, provider: e.target.value})}>
                <option value="OpenAI">OpenAI</option>
                <option value="Anthropic">Anthropic</option>
                <option value="Azure">Azure</option>
                <option value="Google">Google</option>
                <option value="Perplexity">Perplexity</option>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Trust Level</label>
              <Select value={destFormData.trust_level} onChange={(e: any) => setDestFormData({...destFormData, trust_level: e.target.value})}>
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

      {/* User Add Dialog */}
      <Dialog open={openAddUser} onOpenChange={setOpenAddUser}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>Create an employee or administrator account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUserSubmit} className="space-y-4 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Username</label>
              <Input
                required
                value={userFormData.username}
                onChange={(e) => setUserFormData({ ...userFormData, username: e.target.value })}
                placeholder="e.g. employee"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Address</label>
              <Input
                required
                type="email"
                value={userFormData.email}
                onChange={(e) => setUserFormData({ ...userFormData, email: e.target.value })}
                placeholder="employee@company.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                required
                type="password"
                value={userFormData.password}
                onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Role</label>
                <Select
                  value={userFormData.role}
                  onChange={(e) => setUserFormData({ ...userFormData, role: e.target.value })}
                >
                  <option value="EMPLOYEE">EMPLOYEE</option>
                  <option value="DEVELOPER">DEVELOPER</option>
                  <option value="ANALYST">ANALYST</option>
                  <option value="MANAGER">MANAGER</option>
                  <option value="ADMIN">ADMIN</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Department</label>
                <Select
                  value={userFormData.department_id}
                  onChange={(e) => setUserFormData({ ...userFormData, department_id: parseInt(e.target.value) || 0 })}
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Create User</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* User Edit Dialog */}
      <Dialog open={openEditUser} onOpenChange={setOpenEditUser}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            <DialogDescription>Modify user role, department, or reset password.</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <form onSubmit={handleEditUserSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Role</label>
                  <Select
                    value={selectedUser.role}
                    onChange={(e) => setSelectedUser({ ...selectedUser, role: e.target.value })}
                  >
                    <option value="EMPLOYEE">EMPLOYEE</option>
                    <option value="DEVELOPER">DEVELOPER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="MANAGER">MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Department</label>
                  <Select
                    value={selectedUser.department_id || 0}
                    onChange={(e) => setSelectedUser({ ...selectedUser, department_id: parseInt(e.target.value) || null })}
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={selectedUser.is_active ? 'true' : 'false'}
                  onChange={(e) => setSelectedUser({ ...selectedUser, is_active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">New Password (leave blank to keep current)</label>
                <Input
                  type="password"
                  value={userFormData.password}
                  onChange={(e) => setUserFormData({ ...userFormData, password: e.target.value })}
                  placeholder="Optional new password"
                />
              </div>
              <DialogFooter>
                <Button type="submit">Update User</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
