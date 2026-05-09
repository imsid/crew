"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

export function MarkdownRenderer({
  markdown,
  className,
}: Readonly<{
  markdown: string;
  className?: string;
}>) {
  return (
    <div className={cn("artifact-prose", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ className: anchorClassName, ...props }) => (
            <a
              className={cn("font-medium text-primary underline underline-offset-4", anchorClassName)}
              {...props}
            />
          ),
          table: ({ className: tableClassName, ...props }) => (
            <table className={cn("w-full text-sm", tableClassName)} {...props} />
          ),
          th: ({ className: thClassName, ...props }) => (
            <th className={cn("bg-secondary/60 px-3 py-2 text-left", thClassName)} {...props} />
          ),
          td: ({ className: tdClassName, ...props }) => (
            <td className={cn("px-3 py-2 align-top", tdClassName)} {...props} />
          ),
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
