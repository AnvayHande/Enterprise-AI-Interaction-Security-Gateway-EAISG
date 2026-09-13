
import { Card, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ShieldAlert, AlertTriangle, Info, EyeOff } from 'lucide-react';

export interface Violation {
  type: string;
  confidence: number; // 0 to 100
  match: string;
  explanation?: string;
}

interface PolicyViolationsCardProps {
  violations: Violation[];
  title?: string;
  description?: string;
}

const getSeverityColor = (confidence: number) => {
  if (confidence >= 90) return 'text-red-500 bg-red-500/10 border-red-500/20';
  if (confidence >= 70) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
};

const getIcon = (confidence: number) => {
  if (confidence >= 90) return <ShieldAlert className="w-5 h-5 text-red-500" />;
  if (confidence >= 70) return <AlertTriangle className="w-5 h-5 text-orange-500" />;
  return <Info className="w-5 h-5 text-yellow-500" />;
};

export function PolicyViolationsCard({ 
  violations, 
  title = "Detected Policy Violations",
  description = "The following sensitive information was detected and blocked by the security policy."
}: PolicyViolationsCardProps) {
  if (!violations || violations.length === 0) return null;

  return (
    <Card className="w-full max-w-2xl border-destructive/20 shadow-sm overflow-hidden">
      <div className="bg-destructive/10 border-b border-destructive/20 px-6 py-4 flex items-start gap-4">
        <div className="p-2 bg-destructive/20 rounded-full mt-1">
          <EyeOff className="w-6 h-6 text-destructive" />
        </div>
        <div>
          <CardTitle className="text-xl text-destructive flex items-center gap-2">
            {title}
          </CardTitle>
          <CardDescription className="text-destructive/80 mt-1">
            {description}
          </CardDescription>
        </div>
      </div>
      
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {violations.map((violation, idx) => (
            <li key={idx} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  <div className="mt-0.5">
                    {getIcon(violation.confidence)}
                  </div>
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">
                        {violation.type.replace(/_/g, ' ')}
                      </span>
                      <Badge variant="outline" className={`text-[10px] uppercase tracking-wider ${getSeverityColor(violation.confidence)}`}>
                        {violation.type}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="flex-1 max-w-[200px]">
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-muted-foreground font-medium">Confidence</span>
                          <span className="font-bold">{violation.confidence}%</span>
                        </div>
                        <Progress 
                          value={violation.confidence} 
                          className="h-1.5"
                        />
                      </div>
                    </div>
                    
                    {violation.explanation && (
                      <p className="text-sm text-muted-foreground mt-2 italic border-l-2 border-muted-foreground/30 pl-2">
                        "{violation.explanation}"
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="bg-muted px-3 py-2 rounded-md border border-border/50 font-mono text-sm text-muted-foreground flex flex-col items-end min-w-[140px]">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 mb-1">Matched Content</span>
                  <span className="text-foreground break-all">{violation.match}</span>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
