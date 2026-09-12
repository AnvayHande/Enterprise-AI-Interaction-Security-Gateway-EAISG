import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

export function Overview() {
  const [data, setData] = useState<{
    total_requests: number;
    decisions: Record<string, number>;
    average_risk: number;
  } | null>(null);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);

  useEffect(() => {
    const init = async () => {
      try {
        const stats = await api.getOverviewStats(7);
        setData(stats);
        const events = await api.getCriticalEvents(5);
        setCriticalEvents(events);
      } catch (err) {
        console.error('Failed to load overview stats', err);
      }
    };
    init();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  // Convert decisions into chart data
  const chartData = Object.entries(data.decisions).map(([name, count]) => ({
    name,
    count
  }));

  const blocked = data.decisions['BLOCK'] || 0;
  const sanitized = data.decisions['SANITIZE'] || 0;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_requests}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Blocked</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocked}</div>
            <p className="text-xs text-muted-foreground">{((blocked / (data.total_requests || 1)) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sanitized</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sanitized}</div>
            <p className="text-xs text-muted-foreground">{((sanitized / (data.total_requests || 1)) * 100).toFixed(1)}% of total</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.average_risk}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Decisions Breakdown (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                  <Tooltip />
                  <Bar dataKey="count" fill="currentColor" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Critical Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {criticalEvents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No critical events recently.</p>
              ) : (
                criticalEvents.map(event => (
                  <div key={event.id} className="flex items-center space-x-4 rounded-md border p-4">
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        Request Blocked (Risk: {event.risk_score.toFixed(2)})
                      </p>
                      <p className="text-sm text-muted-foreground">
                        User ID {event.user_id} &bull; {new Date(event.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
