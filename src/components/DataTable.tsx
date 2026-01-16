import { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface DataTableColumn<T> {
  key: keyof T | string;
  render: (item: T, index: number) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  title: string;
  icon: LucideIcon;
  data: T[];
  columns: DataTableColumn<T>[];
}

const DataTable = <T,>({
  title,
  icon: Icon,
  data,
  columns,
}: DataTableProps<T>) => {
  return (
    <div className="bg-card rounded-lg border border-border p-6">
      <h3 className="text-lg font-semibold mb-4 text-card-foreground flex items-center gap-2">
        <Icon className="w-5 h-5" />
        {title}
      </h3>
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
      </div>
    </div>
  );
};

export default DataTable;
