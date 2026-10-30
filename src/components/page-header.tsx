import { cn } from "@/lib/utils";

/** The title row every screen opens with: a noun h1, an optional grey line, actions on the right. */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1 text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/** Content column of the sheet: 24px padding, a 1152px cap so wide screens keep a readable measure. */
export function Page({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1152px] px-4 py-6 sm:px-6 lg:py-8", className)}>{children}</div>;
}
