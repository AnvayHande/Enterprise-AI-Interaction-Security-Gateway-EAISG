import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { RefreshCw, AlertTriangle, CheckCircle2, TrendingUp } from 'lucide-react';
import { api } from '../lib/api';

export function Findings() {
  const [data, setData] = useState<{ category: string; count: number }[] | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);

  const loadData = async (selectedDays = days) => {
    setLoading(true);
    try {
      const stats = await api.getFindingsStats(selectedDays);
      setData(stats);
    } catch (err) {
      console.error('Failed to load findings stats', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(days);
  }, [days]);

  const totalFindings = data?.reduce((acc, curr) => acc + curr.count, 0) || 0;
  const sortedFindings = data ? [...data].sort((a, b) => b.count - a.count) : [];
  const topCategory = sortedFindings.length > 0 ? sortedFindings[0] : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Findings Analysis</h2>
          <p className="text-sm text-muted-foreground">Aggregated security violation patterns across intercepted requests.</p>
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
          <Button variant="outline" size="sm" onClick={() => loadData(days)} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>
      
      {loading && !data ? (
        <div className="p-12 text-center text-muted-foreground">Loading findings analytics...</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {/* Chart */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle>Findings by Category</CardTitle>
              <CardDescription>Frequency of threat vectors detected over the last {days} days.</CardDescription>
            </CardHeader>
            <CardContent>
              {totalFindings === 0 ? (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground text-sm space-y-2">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                  <p>No security violations detected in the past {days} days.</p>
                </div>
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data || []} layout="vertical" margin={{ left: 40 }}>
                      <XAxis type="number" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="category" type="category" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill="currentColor" radius={[0, 4, 4, 0]} className="fill-primary" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Dynamic Insights & Trending Patterns */}
          <Card className="col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Trending Patterns & Insights
              </CardTitle>
              <CardDescription>Telemetry summary and automated security recommendations</CardDescription>
            </CardHeader>
            <CardContent>
              {totalFindings === 0 ? (
                <div className="space-y-3 py-6 text-center text-muted-foreground">
                  <p className="text-sm">Gateway telemetry indicates clean interaction traffic with zero active violations.</p>
                  <p className="text-xs">Submit test prompts in the <strong>Playground</strong> to see real-time categorization and risk distribution.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-muted rounded-lg border">
                      <p className="text-xs text-muted-foreground">Total Violations</p>
                      <p className="text-2xl font-bold mt-1">{totalFindings}</p>
                    </div>
                    <div className="p-3 bg-muted rounded-lg border">
                      <p className="text-xs text-muted-foreground">Primary Threat Vector</p>
                      <p className="text-lg font-bold mt-1 text-destructive truncate">
                        {topCategory?.category || 'None'}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {topCategory ? `${((topCategory.count / totalFindings) * 100).toFixed(1)}% of all detections` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category Breakdown</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {sortedFindings.map((item) => (
                        <div key={item.category} className="flex items-center justify-between text-sm p-2 rounded bg-card border">
                          <span className="font-medium">{item.category}</span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary">
                            {item.count} incident{item.count !== 1 ? 's' : ''} ({((item.count / totalFindings) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">Security Recommendation</p>
                      <p className="mt-0.5">
                        Ensure appropriate enforcement policies are active in the <strong>Policies</strong> tab for high-frequency categories like {topCategory?.category}.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
