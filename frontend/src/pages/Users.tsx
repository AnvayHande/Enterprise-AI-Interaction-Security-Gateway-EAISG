import React, { useEffect, useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { api } from '../lib/api';

export function Users() {
  const [users, setUsers] = useState<{ username: string; total_requests: number; avg_risk: number }[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">User Risk Aggregates</h2>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input type="text" placeholder="Search users or departments..." />
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
            {users.map((user) => (
              <TableRow key={user.username}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>N/A</TableCell> {/* Backend endpoint doesn't return department currently */}
                <TableCell className="text-right">{user.total_requests}</TableCell>
                <TableCell className={`text-right font-medium ${user.avg_risk > 0.7 ? 'text-destructive' : user.avg_risk > 0.4 ? 'text-amber-500' : 'text-green-500'}`}>
                  {user.avg_risk.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
