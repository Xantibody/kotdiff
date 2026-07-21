import type { HTMLAttributes, ReactElement, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>): ReactElement {
  return (
    <div className="relative w-full overflow-auto">
      <table className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  );
}

function TableHeader({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  return <thead className={cn("[&_tr]:border-b", className)} {...props} />;
}

function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>): ReactElement {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>): ReactElement {
  return (
    <tr className={cn("border-b transition-colors hover:bg-gray-100/50", className)} {...props} />
  );
}

function TableHead({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>): ReactElement {
  return (
    <th
      className={cn(
        "h-10 px-2 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>): ReactElement {
  return (
    <td className={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  );
}

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
