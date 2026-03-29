import React, { useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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
            {entry.value?.toLocaleString("fr-FR")} t
          </span>
        </div>
      ))}
    </div>
  );
};

export default function ProductionChart({ weekData = [], monthData = [] }) {
  const [period, setPeriod] = useState("week");
  const data = period === "week" ? weekData : monthData;
  const isEmpty = data.length === 0 || data.every(d => d.production === 0);

  return (
    <div className="rounded-xl border p-4 md:p-6" style={{ background: "var(--color-card)", borderColor: "var(--color-border)", boxShadow: "var(--shadow-sm)" }}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="text-base font-semibold" style={{ color: "var(--color-foreground)", fontFamily: "var(--font-heading)" }}>
            Tendance de Production
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }}>
            Production vs Objectif (tonnes)
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: "var(--color-muted)" }}>
          {["week", "month"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
              style={{
                background: period === p ? "var(--color-card)" : "transparent",
                color: period === p ? "var(--color-foreground)" : "var(--color-muted-foreground)",
                fontFamily: "var(--font-caption)",
                boxShadow: period === p ? "var(--shadow-sm)" : "none",
              }}
            >
              {p === "week" ? "Semaine" : "Mois"}
            </button>
          ))}
        </div>
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center justify-center h-56 md:h-64 gap-2">
          <span style={{ color: "var(--color-muted-foreground)", fontSize: 13, fontFamily: "var(--font-caption)" }}>
            Aucune production enregistrée {period === "week" ? "cette semaine" : "ce mois"}
          </span>
        </div>
      ) : (
        <div className="w-full h-56 md:h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="prodGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="objGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="jour" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)", fontFamily: "var(--font-caption)" }} axisLine={false} tickLine={false} tickFormatter={(v) => v?.toLocaleString("fr-FR")} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "var(--font-caption)", paddingTop: "12px" }} />
              <Area type="monotone" dataKey="production" name="Production" stroke="var(--color-primary)" strokeWidth={2.5} fill="url(#prodGrad)" dot={{ r: 3, fill: "var(--color-primary)" }} />
              <Area type="monotone" dataKey="objectif" name="Objectif" stroke="var(--color-accent)" strokeWidth={2} strokeDasharray="5 5" fill="url(#objGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
