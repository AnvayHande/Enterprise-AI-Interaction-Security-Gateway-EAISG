import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const dummyFindings = [
  { category: 'CREDENTIAL', count: 120 },
  { category: 'PROPRIETARY_CODE', count: 85 },
  { category: 'PII', count: 210 },
  { category: 'FINANCIAL', count: 45 },
  { category: 'MALICIOUS_PROMPT', count: 12 },
];

export function Findings() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Findings Analysis</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Findings by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dummyFindings} layout="vertical" margin={{ left: 40 }}>
                  <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis dataKey="category" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="currentColor" radius={[0, 4, 4, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Trending Patterns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-sm">
                <p className="font-semibold text-destructive">↑ PII Data Exfiltration</p>
                <p className="text-muted-foreground">Spike in PII findings over the last 48 hours, primarily from the HR department.</p>
              </div>
              <div className="text-sm">
                <p className="font-semibold text-amber-500">→ Code Pasting</p>
                <p className="text-muted-foreground">Stable volume of proprietary code pasting from Engineering. Mostly handled by SANITIZE policy.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
