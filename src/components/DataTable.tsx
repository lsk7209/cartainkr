import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DataTableColumn<T> {
  key: keyof T | string;
  header?: string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

interface DataTableProps<T> {
  title?: string;
  icon?: LucideIcon;
  data: T[];
  columns: DataTableColumn<T>[];
  variant?: "list" | "table";
  emptyMessage?: string;
}

const DataTable = <T,>({
  title,
  icon: Icon,
  data,
  columns,
  variant = "list",
  emptyMessage = "데이터가 없습니다.",
}: DataTableProps<T>) => {
  if (variant === "table") {
    return (
      <div className="bg-card rounded-lg border border-border overflow-hidden">
        {title && (
          <div className="p-6 pb-4">
            <h3 className="text-lg font-semibold text-card-foreground flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5" />}
              {title}
            </h3>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                {columns.map((column, colIndex) => (
                  <th
                    key={colIndex}
                    className={`text-left p-4 font-medium text-muted-foreground ${column.headerClassName || ""}`}
                  >
                    {column.header || ""}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((item, index) => (
                <tr key={index} className="hover:bg-muted/50 transition-colors">
                  {columns.map((column, colIndex) => (
                    <td key={colIndex} className={`p-4 ${column.className || ""}`}>
                      {column.render(item, index)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="p-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-lg border border-border p-6">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
          {Icon && <Icon className="w-5 h-5" />}
          {title}
        </h3>
      )}
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center justify-between">
            {columns.map((column, colIndex) => (
              <div key={colIndex} className={column.className}>
                {column.render(item, index)}
              </div>
            ))}
          </div>
        ))}
        {data.length === 0 && (
          <div className="text-center text-muted-foreground py-4">
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default DataTable;
