import type { SocialLink } from "./types";
import { profile } from "./profile";

// Only links verified on the existing portfolio. Add LinkedIn etc. here.
export const socialLinks: SocialLink[] = [
  {
    id: "email",
    label: "Email",
    href: `mailto:${profile.email}`,
    glyph: "@",
    description: `Email Diya at ${profile.email}`,
  },
  {
    id: "github",
    label: "GitHub",
    href: "https://github.com/diyaboss",
    glyph: "</>",
    description: "Diya's GitHub profile, diyaboss",
  },
];
