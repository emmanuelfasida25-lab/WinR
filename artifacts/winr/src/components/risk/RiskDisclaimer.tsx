import { AlertTriangle } from "lucide-react";

export const RISK_TEXT =
  "Trading involves significant risk. Losses can exceed expectations and past performance does not guarantee future results. Only trade with money you can afford to lose.";

export function RiskFooter() {
  return (
    <footer
      className="border-t border-amber-500/20 bg-amber-500/5 py-4 px-4 mt-8"
      data-testid="risk-disclaimer-footer"
    >
      <div className="max-w-6xl mx-auto flex items-start gap-3">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
        <p className="text-xs text-muted-foreground leading-relaxed">
          <span className="font-semibold text-amber-500">Risk Warning:</span> {RISK_TEXT}
        </p>
      </div>
    </footer>
  );
}
