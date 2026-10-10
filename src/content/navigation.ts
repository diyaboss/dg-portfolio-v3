import type { NavItem } from "./types";

// Section ids must match the `id` attributes rendered in HomeSections.
export const navigation: NavItem[] = [
  { id: "intro", label: "Index", section: "intro" },
  { id: "work", label: "Work", section: "work" },
  { id: "about", label: "About", section: "about" },
  { id: "contact", label: "Contact", section: "contact" },
];
