import React from "react";
import Icon from "components/AppIcon";

export default function FinancialSummary({ revenue = 0, expenses = 0, netProfit = 0, costPerTon = 0, profitability = 0 }) {
  const now = new Date();
  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const monthTitle = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  const fmt = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 0 });
  const fmtDec = (n) => Number(n).toLocaleString('fr-FR', { maximumFractionDigits: 2 });

  const cards = [
    {
      id: 1,
      label: "Revenus Totaux",
      value: fmt(revenue),
      unit: "FCFA",
      icon: "TrendingUp",
      iconColor: "var(--color-success)",
      bgColor: "rgba(56,161,105,0.12)",
      subtitle: "Ventes minerai ce mois",
    },
    {
      id: 2,
      label: "Dépenses Totales",
      value: fmt(expenses),
      unit: "FCFA",
      icon: "Receipt",
      iconColor: "var(--color-error)",
      bgColor: "rgba(229,62,62,0.12)",
      subtitle: "Carburant + pièces + charges",
    },
    {
      id: 3,
      label: "Bénéfice Net",
      value: fmt(netProfit),
      unit: "FCFA",
      icon: "DollarSign",
      iconColor: "var(--color-accent)",
      bgColor: "rgba(214,158,46,0.12)",
      subtitle: revenue > 0 ? `Marge: ${fmtDec(profitability)}%` : "Aucune donnée",
    },
   
  ];

  return (
    <div
      className="rounded-xl border p-4 md:p-6"
      style={{ background: "var(--color-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}
    >
      <div className="flex items-center gap-2 mb-5">
        <Icon name="BarChart2" size={18} color="var(--color-primary)" />
        <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
          Résumé Financier — {monthTitle}
        </h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
        {cards.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-3 rounded-lg border"
            style={{ background: item.bgColor, borderColor: "var(--color-border)" }}
          >
            <div className="flex items-center justify-center w-9 h-9 rounded-lg flex-shrink-0" style={{ background: "var(--color-card)" }}>
              <Icon name={item.icon} size={16} color={item.iconColor} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
                {item.label}
              </p>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-lg font-bold whitespace-nowrap" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
                  {item.value}
                </span>
                <span className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
                  {item.unit}
                </span>
              </div>
              <p className="text-xs mt-1" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}
                dangerouslySetInnerHTML={{ __html: item.subtitle }}
              />
            </div>
          </div>
        ))}
      </div>
      {/* Profitability bar */}
      <div className="mt-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
            Rentabilité Globale
          </span>
          <span className="text-xs font-bold" style={{ color: profitability >= 30 ? "var(--color-success)" : "var(--color-warning)", fontFamily: "var(--font-data)" }}>
            {fmtDec(profitability)}%
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--color-muted)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, profitability)}%`, background: profitability >= 30 ? "var(--color-success)" : "var(--color-warning)" }}
          />
        </div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>0%</span>
          <span className="text-xs" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>Objectif: 40%</span>
        </div>
      </div>
    </div>
  );
}
