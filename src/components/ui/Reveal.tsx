"use client";

import { createElement, type ElementType, type ReactNode } from "react";
import { useReveal } from "@/lib/store";

/** Wraps children and exposes the reveal state as `data-on` for CSS. */
export function Reveal({
  k,
  as = "div",
  className,
  children,
}: {
  k: string;
  as?: ElementType;
  className?: string;
  children: ReactNode;
}) {
  const on = useReveal(k);
  return createElement(as, { className, "data-on": on ? "true" : "false" }, children);
}
