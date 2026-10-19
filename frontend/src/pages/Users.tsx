import { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { api } from '../lib/api';

interface UserRisk {
  username: string;
  department?: string;
  total_requests: number;
  avg_risk: number;
}

export function Users() {
  const [users, setUsers] = useState<UserRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getUsersRisk(30);
        setUsers(data);
      } catch (err) {
        console.error('Failed to load user risks', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      u.username.toLowerCase().includes(term) ||
      (u.department && u.department.toLowerCase().includes(term))
    );
  });

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Risk Aggregates</h2>
          <p className="text-sm text-muted-foreground">Historical risk telemetry per user across the last 30 days.</p>
        </div>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input
            type="text"
            placeholder="Search user or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Department</TableHead>
              <TableHead className="text-right">Total Requests</TableHead>
              <TableHead className="text-right">Avg Risk Score</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-6">
                  No user activity recorded in the selected period.
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.username}>
                  <TableCell className="font-semibold">{user.username}</TableCell>
                  <TableCell>{user.department || 'General'}</TableCell>
                  <TableCell className="text-right">{user.total_requests}</TableCell>
                  <TableCell className={`text-right font-medium ${user.avg_risk > 0.7 ? 'text-destructive' : user.avg_risk > 0.4 ? 'text-amber-500' : 'text-green-500'}`}>
                    {user.avg_risk.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
