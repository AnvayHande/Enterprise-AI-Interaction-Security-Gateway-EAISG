import React from 'react';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const dummyRequests = [
  { id: "REQ-001", user: "dev@example.com", action: "ALLOW", risk: 0.1, date: "2026-08-17 10:00:00" },
  { id: "REQ-002", user: "eng@example.com", action: "SANITIZE", risk: 0.72, date: "2026-08-17 10:05:00" },
  { id: "REQ-003", user: "sales@example.com", action: "BLOCK", risk: 0.95, date: "2026-08-17 10:15:00" },
  { id: "REQ-004", user: "hr@example.com", action: "WARN", risk: 0.45, date: "2026-08-17 10:30:00" },
];

export function Requests() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Requests Log</h2>
        <div className="flex w-full max-w-sm items-center space-x-2">
          <Input type="email" placeholder="Filter by user..." />
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px]">Request ID</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Risk Score</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {dummyRequests.map((req) => (
              <TableRow key={req.id}>
                <TableCell className="font-medium">{req.id}</TableCell>
                <TableCell>{req.user}</TableCell>
                <TableCell>{req.date}</TableCell>
                <TableCell>{req.risk}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={req.action === 'BLOCK' ? 'destructive' : req.action === 'SANITIZE' ? 'default' : req.action === 'WARN' ? 'secondary' : 'outline'}>
                    {req.action}
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
