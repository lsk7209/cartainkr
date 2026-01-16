import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ChartDataItem = Record<string, any>;

interface AdminChartProps {
  /** 차트 제목 */
  title: string;
  /** 차트 데이터 */
  data: ChartDataItem[];
  /** X축 데이터 키 */
  dataKeyX: string;
  /** Y축 데이터 키 */
  dataKeyY: string;
  /** 차트 타입 */
  type?: "bar" | "line";
  /** X축 레이블 포맷터 */
  xAxisFormatter?: (value: string) => string;
  /** 툴팁 레이블 포맷터 */
  tooltipLabelFormatter?: (value: string) => string;
  /** 데이터 이름 (툴팁용) */
  dataName?: string;
  /** 차트 높이 */
  height?: number;
}

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "hsl(var(--card))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "8px",
  },
  labelStyle: { color: "hsl(var(--foreground))" },
};

/**
 * 재사용 가능한 관리자 차트 컴포넌트
 */
export const AdminChart = ({
  title,
  data,
  dataKeyX,
  dataKeyY,
  type = "bar",
  xAxisFormatter,
  tooltipLabelFormatter,
  dataName,
  height = 250,
}: AdminChartProps) => {
  const ChartComponent = type === "bar" ? BarChart : LineChart;

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground">{title}</h3>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={dataKeyX}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              tickFormatter={xAxisFormatter}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              {...tooltipStyle}
              labelFormatter={tooltipLabelFormatter}
            />
            {type === "bar" ? (
              <Bar
                dataKey={dataKeyY}
                name={dataName}
                fill="hsl(var(--primary))"
                radius={[4, 4, 0, 0]}
              />
            ) : (
              <Line
                type="monotone"
                dataKey={dataKeyY}
                name={dataName}
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2 }}
              />
            )}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
