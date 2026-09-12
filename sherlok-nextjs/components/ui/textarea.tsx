import type { TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-40 w-full resize-y rounded-[8px] border border-[#745022] bg-[#382315] px-4 py-3 text-[15px] leading-6 text-[#f8ebd2] outline-none placeholder:text-[#d8c4a0]/65 focus:border-[#f4b941] focus:ring-2 focus:ring-[#f4b941]/25 disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}
