"use client";

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Player } from "@/lib/types";

const COLOURS = ["#7c7cff", "#2fd889", "#f3c24f", "#ff6169"];

function normalise(value: number, max: number) {
  return Math.round((value / max) * 100);
}

export function CompareRadar({ players, xpMap }: { players: Player[]; xpMap: Map<number, number> }) {
  const maxima = {
    xp: Math.max(1, ...players.map((p) => xpMap.get(p.id) ?? 0)),
    xg: Math.max(0.1, ...players.map((p) => p.xG90)),
    xa: Math.max(0.1, ...players.map((p) => p.xA90)),
    form: Math.max(1, ...players.map((p) => p.form)),
    minutes: 90,
    bonus: Math.max(1, ...players.map((p) => p.bpsPerGame)),
  };

  const metrics = [
    { key: "xp", label: "xP (5 GW)", get: (p: Player) => normalise(xpMap.get(p.id) ?? 0, maxima.xp) },
    { key: "xg", label: "xG/90", get: (p: Player) => normalise(p.xG90, maxima.xg) },
    { key: "xa", label: "xA/90", get: (p: Player) => normalise(p.xA90, maxima.xa) },
    { key: "form", label: "Form", get: (p: Player) => normalise(p.form, maxima.form) },
    { key: "minutes", label: "Minutes/game", get: (p: Player) => normalise(p.minutesPerGame, maxima.minutes) },
    { key: "bonus", label: "BPS/game", get: (p: Player) => normalise(p.bpsPerGame, maxima.bonus) },
  ];

  const data = metrics.map((m) => {
    const row: Record<string, number | string> = { metric: m.label };
    players.forEach((p) => {
      row[p.webName] = m.get(p);
    });
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={340}>
      <RadarChart data={data} outerRadius="75%">
        <PolarGrid stroke="var(--border)" />
        <PolarAngleAxis dataKey="metric" tick={{ fill: "var(--text-muted)", fontSize: 11 }} />
        <PolarRadiusAxis tick={false} axisLine={false} />
        {players.map((p, i) => (
          <Radar key={p.id} name={p.webName} dataKey={p.webName} stroke={COLOURS[i % COLOURS.length]} fill={COLOURS[i % COLOURS.length]} fillOpacity={0.15} />
        ))}
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
