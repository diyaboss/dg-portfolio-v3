import type { SkillGroup } from "./types";

// Every skill below is taken from the stacks and case-study text of the
// projects in projects.ts, and lists the projects that evidence it.
// There are deliberately no proficiency percentages.
export const skillGroups: SkillGroup[] = [
  {
    id: "security",
    label: "Security",
    note: "Threat scenarios and trust boundaries",
    skills: [
      { name: "AI agent / MCP security", evidence: ["mcp-sentinel"] },
      { name: "Prompt-injection & tool-poisoning scenarios", evidence: ["mcp-sentinel"] },
      { name: "Ciphers & encoded media", evidence: ["cicada-2067"] },
      { name: "SSTV puzzles", evidence: ["cicada-2067"] },
    ],
  },
  {
    id: "languages",
    label: "Languages",
    skills: [
      { name: "Python", evidence: ["mcp-sentinel", "prompt-pursuit"] },
      { name: "TypeScript", evidence: ["mcp-sentinel"] },
      { name: "JavaScript", evidence: ["rewarp"] },
    ],
  },
  {
    id: "frontend",
    label: "Frontend",
    skills: [
      { name: "React", evidence: ["mcp-sentinel", "hackbuddy"] },
      { name: "Vite", evidence: ["hackbuddy"] },
      { name: "Canvas", evidence: ["rewarp"] },
    ],
  },
  {
    id: "backend",
    label: "Backend & realtime",
    skills: [
      { name: "Node.js", evidence: ["rewarp", "hackbuddy"] },
      { name: "Express", evidence: ["rewarp", "hackbuddy"] },
      { name: "FastAPI", evidence: ["prompt-pursuit"] },
      { name: "SQLAlchemy", evidence: ["prompt-pursuit"] },
      { name: "Socket.IO", evidence: ["rewarp"] },
      { name: "WebSocket", evidence: ["mcp-sentinel"] },
    ],
  },
  {
    id: "data",
    label: "Data & ML",
    skills: [
      { name: "PostgreSQL", evidence: ["hackbuddy", "prompt-pursuit"] },
      { name: "Supabase", evidence: ["prompt-pursuit"] },
      { name: "Computer vision", evidence: ["crashshield-ai"] },
      { name: "On-device inference", evidence: ["crashshield-ai"] },
    ],
  },
];
