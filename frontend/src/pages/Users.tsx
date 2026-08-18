import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

const dummyUsers = [
  { username: "dev@example.com", department: "Engineering", requests: 154, avgRisk: 0.12 },
  { username: "sales@example.com", department: "Sales", requests: 89, avgRisk: 0.05 },
  { username: "hr@example.com", department: "HR", requests: 42, avgRisk: 0.88 },
  { username: "eng@example.com", department: "Engineering", requests: 312, avgRisk: 0.45 },
];

export function Users() {
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
            {dummyUsers.map((user) => (
              <TableRow key={user.username}>
                <TableCell className="font-medium">{user.username}</TableCell>
                <TableCell>{user.department}</TableCell>
                <TableCell className="text-right">{user.requests}</TableCell>
                <TableCell className={`text-right font-medium ${user.avgRisk > 0.7 ? 'text-destructive' : user.avgRisk > 0.4 ? 'text-amber-500' : 'text-green-500'}`}>
                  {user.avgRisk.toFixed(2)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
