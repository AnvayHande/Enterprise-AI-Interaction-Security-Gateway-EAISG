import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { api } from '../lib/api';

export function Overview() {
  const [data, setData] = useState<{
    total_requests: number;
    decisions: Record<string, number>;
    average_risk: number;
  } | null>(null);
  const [criticalEvents, setCriticalEvents] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const init = async (showError = true, currentDays = days) => {
    try {
      if (showError) setError(null);
      setIsRefreshing(true);
      const stats = await api.getOverviewStats(currentDays);
      setData(stats);
      const events = await api.getCriticalEvents(5);
      setCriticalEvents(events);
    } catch (err: any) {
      console.error('Failed to load overview stats', err);
      if (showError) {
        setError(err?.message || 'Failed to load statistics. Please verify backend is running.');
      }
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    init(true, days);
    const interval = setInterval(() => {
      init(false, days);
    }, 5000);
    return () => clearInterval(interval);
  }, [days]);

  if (error) {
    return (
      <div className="p-8 text-center space-y-4 bg-card rounded-lg border max-w-md mx-auto mt-12">
        <p className="text-destructive font-medium text-sm">{error}</p>
        <div className="flex justify-center space-x-3">
          <Button onClick={() => init(true, days)} variant="outline" size="sm">Retry</Button>
          <Button onClick={() => { localStorage.removeItem('access_token'); window.location.reload(); }} size="sm">Login Again</Button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center p-12 text-sm text-muted-foreground">
        Loading gateway overview metrics...
      </div>
    );
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
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Security Overview</h2>
          <p className="text-sm text-muted-foreground">Live telemetry and policy enforcement statistics across enterprise interactions.</p>
        </div>
        <div className="flex items-center space-x-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value={7}>Last 7 Days</option>
            <option value={14}>Last 14 Days</option>
            <option value={30}>Last 30 Days</option>
          </select>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => init(true, days)} 
            disabled={isRefreshing}
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.total_requests}</div>
            <p className="text-xs text-muted-foreground">Last {days} days</p>
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
            <p className="text-xs text-muted-foreground">Last {days} days</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Decisions Breakdown (Last {days} Days)</CardTitle>
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
