import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type Props = {
  title: string;
  phase: string;
  description: string;
};

export function PhasePlaceholder({ title, phase, description }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
          {phase}
        </Badge>
      </div>
      <Card className="border-dashed border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20">
        <CardHeader>
          <CardTitle className="text-base text-emerald-900 dark:text-emerald-300">Em construção</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{description}</CardContent>
      </Card>
    </div>
  );
}
