import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const dummyPolicies = [
  { id: 1, name: "Block AWS Keys", priority: 10, enabled: true, action: "BLOCK" },
  { id: 2, name: "Sanitize PII", priority: 20, enabled: true, action: "SANITIZE" },
  { id: 3, name: "Warn on Proprietary Code", priority: 30, enabled: true, action: "WARN" },
  { id: 4, name: "Default Allow", priority: 1000, enabled: true, action: "ALLOW" },
];

export function Policies() {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold tracking-tight">Policy Management</h2>
        <Button>Create Policy</Button>
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
            {dummyPolicies.map((policy) => (
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
