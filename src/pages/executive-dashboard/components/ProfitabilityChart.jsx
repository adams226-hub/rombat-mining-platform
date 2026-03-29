import React from "react";
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg p-3 border shadow-lg" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", fontFamily: "var(--font-caption)" }}>
      <p className="text-xs font-semibold mb-2" style={{ color: "var(--color-foreground)" }}>{label}</p>
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div className="w-2 h-2 rounded-full" style={{ background: entry.color }} />
          <span style={{ color: "var(--color-muted-foreground)" }}>{entry.name}:</span>
          <span className="font-medium" style={{ color: "var(--color-foreground)" }}>
            {entry.value?.toLocaleString("fr-FR")} FCFA
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ProfitabilityChart({ data = [] }) {
  const isEmpty = data.length === 0 || data.every(d => d.revenus === 0 && d.depenses === 0);

  return (
    <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="mb-5">
        <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
          Analyse de Rentabilité
        </h3>
        <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
          Revenus, Dépenses & Bénéfice (6 derniers mois)
        </p>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-56 md:h-64 gap-2">
          <span style={{ color: "var(--color-muted-foreground)", fontSize: 13, fontFamily: "var(--font-caption)" }}>
            Aucune transaction financière enregistrée
          </span>
        </div>
      ) : (
        <div className="w-full h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="mois" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-caption)", paddingTop: "12px" }} />
              <Bar dataKey="revenus" name="Revenus" fill="rgba(44,85,48,0.7)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="depenses" name="Dépenses" fill="rgba(229,62,62,0.7)" radius={[3, 3, 0, 0]} />
              <Line type="monotone" dataKey="benefice" name="Bénéfice" stroke="var(--color-accent)" strokeWidth={2.5} dot={{ r: 4, fill: "var(--color-accent)" }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
