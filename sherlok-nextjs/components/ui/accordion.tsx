"use client";

import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export const Accordion = AccordionPrimitive.Root;
export const AccordionItem = AccordionPrimitive.Item;

export function AccordionTrigger({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return <AccordionPrimitive.Header><AccordionPrimitive.Trigger className={cn("flex w-full items-center justify-between py-3 text-left text-sm font-semibold text-[#f8ebd2] [&[data-state=open]>svg]:rotate-180", className)} {...props}>{children}<ChevronDown className="size-4 text-[#f4b941] transition-transform" /></AccordionPrimitive.Trigger></AccordionPrimitive.Header>;
}

export function AccordionContent({ className, children, ...props }: ComponentProps<typeof AccordionPrimitive.Content>) {
  return <AccordionPrimitive.Content className={cn("overflow-hidden text-sm text-[#d8c4a0] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down", className)} {...props}><div className="pb-3">{children}</div></AccordionPrimitive.Content>;
}
