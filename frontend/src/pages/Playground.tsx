import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select-native";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from '../lib/api';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Send,
  Loader2,
  Zap,
  RotateCcw,
  ChevronRight,
  AlertTriangle,
  Eye,
  Bot,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Finding {
  category: string;
  confidence: number;
  detector_source: string;
  evidence?: string;
}

interface AnalyzeResult {
  request_id: number;
  final_action: string;
  risk_score: number;
  findings: Finding[];
  aggregation_breakdown?: Record<string, any>;
  sanitized_content?: string | null;
  provider_response?: string | null;
  provider_used?: number | null;
  response_findings?: Finding[];
  response_action?: string | null;
}

interface Destination {
  id: number;
  name: string;
  provider: string;
  trust_level: string;
}

interface HistoryItem {
  prompt: string;
  result: AnalyzeResult;
  timestamp: Date;
}

// ─── Example Prompts ────────────────────────────────────────────────────────

const EXAMPLE_PROMPTS = [
  {
    label: '🔐 PII Leak',
    prompt: 'Please help me draft an email. My name is John Smith, my SSN is 539-72-4891, and my email is john.smith@company.com. I live at 742 Evergreen Terrace, Springfield.',
    description: 'Contains PII: SSN, email, name, address',
  },
  {
    label: '🔑 Secret Key',
    prompt: 'I need to debug my AWS connection. Here is my access key: AKIA4MTWDHFZ9EXAMPLE and my secret key is wJalrXUtnFEMI/K7MDENG/bPxRfiCY. Can you help?',
    description: 'Contains AWS credentials',
  },
  {
    label: '💻 Source Code',
    prompt: 'Can you review this code?\n\ndef connect_to_db():\n    password = "super_secret_123"\n    conn = psycopg2.connect(\n        host="prod-db.internal.company.com",\n        database="users",\n        user="admin",\n        password=password\n    )\n    return conn',
    description: 'Contains source code with hardcoded credentials',
  },
  {
    label: '✅ Clean Prompt',
    prompt: 'What are the best practices for writing clean Python code? Can you give me some tips on code organization and naming conventions?',
    description: 'Harmless question — should be ALLOWED',
  },
];

// ─── Helper Components ──────────────────────────────────────────────────────

function ActionBadge({ action }: { action: string }) {
  const config: Record<string, { variant: 'destructive' | 'default' | 'secondary' | 'outline'; icon: React.ReactNode; className: string }> = {
    BLOCK: { variant: 'destructive', icon: <ShieldX className="w-3 h-3 mr-1" />, className: 'bg-red-600 hover:bg-red-700 text-white' },
    SANITIZE: { variant: 'default', icon: <ShieldAlert className="w-3 h-3 mr-1" />, className: 'bg-amber-500 hover:bg-amber-600 text-white' },
    ALLOW: { variant: 'outline', icon: <ShieldCheck className="w-3 h-3 mr-1" />, className: 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-600' },
    WARN: { variant: 'secondary', icon: <AlertTriangle className="w-3 h-3 mr-1" />, className: 'bg-yellow-500 hover:bg-yellow-600 text-black' },
    FAILED: { variant: 'destructive', icon: <ShieldX className="w-3 h-3 mr-1" />, className: '' },
  };
  const c = config[action] || config.FAILED;
  return (
    <Badge variant={c.variant} className={`text-sm px-3 py-1 ${c.className}`}>
      {c.icon} {action}
    </Badge>
  );
}

function RiskScoreDisplay({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const label = percentage >= 80 ? 'Critical' : percentage >= 50 ? 'Medium' : percentage > 0 ? 'Low' : 'None';
  const color = percentage >= 80 ? 'text-red-500' : percentage >= 50 ? 'text-amber-500' : 'text-emerald-500';

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Risk Score</span>
        <span className={`text-2xl font-bold tabular-nums ${color}`}>
          {score.toFixed(2)}
        </span>
      </div>
      <Progress value={percentage} max={100} />
      <p className={`text-xs font-medium ${color}`}>{label} Risk</p>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export function Playground() {
  const [prompt, setPrompt] = useState('');
  const [destinationId, setDestinationId] = useState<number>(1);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Fetch destinations on mount
  useEffect(() => {
    const fetchDestinations = async () => {
      try {
        const data = await api.getDestinations();
        setDestinations(data);
        if (data.length > 0) {
          setDestinationId(data[0].id);
        }
      } catch (err) {
        console.error('Failed to load destinations', err);
      }
    };
    fetchDestinations();
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await api.analyzePrompt(prompt, destinationId);
      setResult(data);
      setHistory(prev => [
        { prompt, result: data, timestamp: new Date() },
        ...prev.slice(0, 4),
      ]);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze prompt');
    } finally {
      setLoading(false);
    }
  }, [prompt, destinationId]);

  const handleExampleClick = (examplePrompt: string) => {
    setPrompt(examplePrompt);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setPrompt('');
    setResult(null);
    setError(null);
  };

  const handleHistoryClick = (item: HistoryItem) => {
    setPrompt(item.prompt);
    setResult(item.result);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          Prompt Playground
        </h2>
        <p className="text-muted-foreground mt-1">
          Send prompts through the Gateway and see how the security engine analyzes them in real time.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column: Input */}
        <div className="lg:col-span-2 space-y-4">
          {/* Example Prompts */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Quick Examples
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {EXAMPLE_PROMPTS.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleClick(ex.prompt)}
                    className="group relative text-left p-3 rounded-lg border border-border bg-card hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                  >
                    <span className="text-sm font-medium block">{ex.label}</span>
                    <span className="text-xs text-muted-foreground mt-1 block leading-tight">{ex.description}</span>
                    <ChevronRight className="w-3 h-3 absolute top-3 right-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Prompt Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Prompt Input</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                id="prompt-input"
                placeholder="Type or paste a prompt to analyze..."
                value={prompt}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setPrompt(e.target.value)}
                className="min-h-[160px] font-mono text-sm resize-y"
                onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    handleAnalyze();
                  }
                }}
              />
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <label htmlFor="destination-select" className="text-sm text-muted-foreground whitespace-nowrap">
                    AI Destination:
                  </label>
                  <Select
                    id="destination-select"
                    value={destinationId}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setDestinationId(Number(e.target.value))}
                    className="w-48"
                  >
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.provider})
                      </option>
                    ))}
                    {destinations.length === 0 && (
                      <option value={1}>Default (ID: 1)</option>
                    )}
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={handleReset} disabled={loading}>
                    <RotateCcw className="w-4 h-4 mr-1" /> Clear
                  </Button>
                  <Button onClick={handleAnalyze} disabled={loading || !prompt.trim()} size="sm">
                    {loading ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4 mr-1" />
                    )}
                    {loading ? 'Analyzing...' : 'Analyze'}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">Ctrl+Enter</kbd> to submit
              </p>
            </CardContent>
          </Card>

          {/* Error State */}
          {error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-destructive">
                  <ShieldX className="w-5 h-5" />
                  <span className="font-medium">Analysis Failed</span>
                </div>
                <p className="text-sm mt-2 text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
              {/* Summary Row */}
              <Card>
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Decision */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Gateway Decision</p>
                      <ActionBadge action={result.final_action} />
                      <p className="text-xs text-muted-foreground mt-1">
                        Request #{result.request_id}
                      </p>
                    </div>
                    {/* Risk Score */}
                    <div>
                      <RiskScoreDisplay score={result.risk_score} />
                    </div>
                    {/* Findings Count */}
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-muted-foreground">Findings Detected</p>
                      <p className="text-2xl font-bold tabular-nums">
                        {result.findings.length}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {result.findings.length > 0
                          ? `Across ${new Set(result.findings.map(f => f.detector_source)).size} detector(s)`
                          : 'No sensitive content detected'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Findings Table */}
              {result.findings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="w-4 h-4" /> Findings Detail
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Detector</TableHead>
                            <TableHead>Evidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.findings.map((f, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">
                                  {f.category}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className={`font-medium tabular-nums ${
                                  f.confidence >= 0.9 ? 'text-red-500' :
                                  f.confidence >= 0.7 ? 'text-amber-500' : 'text-muted-foreground'
                                }`}>
                                  {(f.confidence * 100).toFixed(0)}%
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className="text-xs text-muted-foreground font-mono">
                                  {f.detector_source}
                                </span>
                              </TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">
                                  {f.evidence || '—'}
                                </code>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Aggregation Breakdown */}
              {result.aggregation_breakdown && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Risk Aggregation Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-xs font-mono bg-muted p-4 rounded-lg overflow-x-auto whitespace-pre-wrap">
                      {JSON.stringify(result.aggregation_breakdown, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Sanitized Content */}
              {result.sanitized_content && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500" /> Sanitized Output
                    </CardTitle>
                    <CardDescription>
                      The Gateway redacted sensitive content before forwarding to the AI provider.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Original</p>
                        <pre className="text-xs font-mono bg-red-500/10 border border-red-500/20 p-3 rounded-lg whitespace-pre-wrap">
                          {prompt}
                        </pre>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Sanitized</p>
                        <pre className="text-xs font-mono bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-lg whitespace-pre-wrap">
                          {result.sanitized_content}
                        </pre>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Provider Response */}
              {result.provider_response && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Bot className="w-4 h-4" /> AI Provider Response
                    </CardTitle>
                    <CardDescription>
                      {result.provider_used
                        ? `Routed to destination #${result.provider_used}`
                        : 'Response from AI provider'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <pre className="text-sm font-mono bg-muted p-4 rounded-lg whitespace-pre-wrap">
                      {result.provider_response}
                    </pre>
                  </CardContent>
                </Card>
              )}

              {/* Response Findings */}
              {result.response_findings && result.response_findings.length > 0 && (
                <Card className="border-amber-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" /> Response Analysis
                    </CardTitle>
                    <CardDescription>
                      The AI provider's response was also scanned.
                      {result.response_action && (
                        <span className="ml-2">
                          Action: <ActionBadge action={result.response_action} />
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Category</TableHead>
                            <TableHead>Confidence</TableHead>
                            <TableHead>Detector</TableHead>
                            <TableHead>Evidence</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {result.response_findings.map((f, i) => (
                            <TableRow key={i}>
                              <TableCell>
                                <Badge variant="outline" className="font-mono text-xs">{f.category}</Badge>
                              </TableCell>
                              <TableCell className="tabular-nums">{(f.confidence * 100).toFixed(0)}%</TableCell>
                              <TableCell className="font-mono text-xs">{f.detector_source}</TableCell>
                              <TableCell>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{f.evidence || '—'}</code>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>

        {/* Right Column: Session History */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Session History</CardTitle>
              <CardDescription>Last {Math.min(history.length, 5)} prompts from this session</CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No prompts sent yet. Try an example above!
                </p>
              ) : (
                <div className="space-y-3">
                  {history.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => handleHistoryClick(item)}
                      className="w-full text-left p-3 rounded-lg border border-border hover:bg-muted/50 hover:border-primary/30 transition-all duration-200 cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <ActionBadge action={item.result.final_action} />
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-2 font-mono">
                        {item.prompt.substring(0, 100)}{item.prompt.length > 100 ? '...' : ''}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">
                          Risk: {item.result.risk_score.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {item.result.findings.length} finding(s)
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <h4 className="text-sm font-medium mb-2">How it works</h4>
              <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                <li>Your prompt is sent to the Gateway's analysis pipeline</li>
                <li>Multiple detectors scan for PII, secrets, source code, and financial data</li>
                <li>An ML classifier runs in parallel for additional coverage</li>
                <li>The risk aggregator computes a composite score</li>
                <li>The policy engine decides: <strong>ALLOW</strong>, <strong>SANITIZE</strong>, <strong>WARN</strong>, or <strong>BLOCK</strong></li>
                <li>If allowed, the prompt is routed to the AI provider</li>
              </ol>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
