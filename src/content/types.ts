/**
 * Shared content types. Everything the site displays about Diya lives in
 * `src/content/*` and is typed here, so scenes and UI never hard-code copy.
 */

export type ProjectLinkKind = "source" | "live" | "event" | "other";

export type ProjectLink = {
  /** Visible label, e.g. "Frontend source". */
  label: string;
  /** Absolute https:// URL. Validated at build time by `safeExternalUrl`. */
  href: string;
  kind: ProjectLinkKind;
};

export type ProjectSection = {
  id: string;
  heading?: string;
  body?: string;
  /** Paths under /public, e.g. "/media/projects/sentinel-1.webp". */
  images?: string[];
  video?: string;
};

export type PortfolioProject = {
  /** Stable identifier. Never change it once published. */
  id: string;
  /** URL segment: /projects/<slug>. Lowercase letters, digits and hyphens. */
  slug: string;
  title: string;
  /** One sentence shown on the crystal callout and at the top of the case study. */
  summary: string;
  description?: string;
  /** Short category, e.g. "Security". */
  category: string;
  technologies: string[];
  tags: string[];

  coverImage?: string;
  coverAlt?: string;
  gallery?: string[];
  video?: string;

  links?: ProjectLink[];

  featured: boolean;
  /** Ascending display order. */
  order: number;

  date?: string;
  status?: string;
  /** Your role on the project, e.g. "Security engineering · team project". */
  contribution?: string;
  collaborators?: string[];

  /** Optional ordered steps rendered as a small system-flow diagram. */
  flow?: string[];
  sections?: ProjectSection[];
};

export type SkillGroup = {
  id: string;
  label: string;
  /** Short description of what the group covers. */
  note?: string;
  skills: Skill[];
};

export type Skill = {
  name: string;
  /** Slugs of projects that demonstrate this skill. */
  evidence?: string[];
};

export type SocialLink = {
  id: string;
  label: string;
  href: string;
  /** Short text the contact particle sculpture forms, e.g. "@". */
  glyph: string;
  /** Screen-reader description of the destination. */
  description: string;
};

export type Profile = {
  name: string;
  shortName: string;
  role: string;
  /** Two or three sentences used in the landing "brief". */
  brief: string;
  about: string[];
  education: { degree: string; institution: string }[];
  focus: string[];
  work: string;
  location?: string;
  email: string;
  siteDescription: string;
  copyrightYear: number;
};

export type NavItem = {
  id: string;
  label: string;
  /** In-page section anchor (without #). */
  section: string;
};
