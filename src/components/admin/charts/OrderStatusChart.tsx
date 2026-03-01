"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface OrderStatusChartProps {
  data: Array<{
    name: string;
    value: number;
    status: string;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: "#eab308",
  CONFIRMED: "#3b82f6",
  PROCESSING: "#6366f1",
  PRINTING: "#a855f7",
  QUALITY_CHECK: "#f59e0b",
  PACKAGING: "#14b8a6",
  SHIPPED: "#10b981",
  DELIVERED: "#22c55e",
  CANCELLED: "#ef4444",
};

export function OrderStatusChart({ data }: OrderStatusChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-[300px] flex items-center justify-center text-muted-foreground">
        Henuz veri yok
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          paddingAngle={3}
          dataKey="value"
        >
          {data.map((entry) => (
            <Cell
              key={entry.status}
              fill={STATUS_COLORS[entry.status] || "#94a3b8"}
            />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "8px",
            fontSize: 12,
          }}
          formatter={(value: number | undefined) => [`${value ?? 0} sipariş`, ""]}
        />
        <Legend
          wrapperStyle={{ fontSize: 11 }}
          iconSize={10}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
