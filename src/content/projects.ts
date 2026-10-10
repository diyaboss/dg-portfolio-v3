import type { PortfolioProject } from "./types";

// Source: the six case studies on dg-theta-ten.vercel.app/projects.
// To add a project, append an object to this array — see CONTENT_GUIDE.md.
export const projects: PortfolioProject[] = [
  {
    id: "mcp-sentinel",
    slug: "mcp-sentinel",
    title: "MCP Sentinel",
    summary:
      "A security gateway prototype for AI tool calls, with attack scenarios, provenance traces, and allow / ask / block decisions.",
    category: "Security",
    technologies: ["Python", "MCP", "React", "TypeScript", "WebSocket"],
    tags: ["AI security", "Prompt injection", "Gateway"],
    coverImage: "/media/projects/sentinel.webp",
    coverAlt: "MCP Sentinel's product homepage",
    links: [
      {
        label: "Frontend source",
        href: "https://github.com/diyaboss/mcp-sentinel-frontend",
        kind: "source",
      },
      {
        label: "Demo",
        href: "https://mcp-sentinel-frontend.vercel.app/",
        kind: "live",
      },
    ],
    featured: true,
    order: 1,
    date: "2026",
    status: "Prototype",
    contribution: "Security engineering · team project",
    flow: ["User intent", "Agent tool call", "Gateway checks", "Allow / Ask / Block"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "Attack-lab scenarios and security-engine work. The dashboard was developed with teammates; its default demonstration uses simulated events.",
      },
      {
        id: "boundary",
        heading: "The boundary",
        body: "An agent can encounter hostile instructions in a tool response. Those instructions should not acquire the authority of the user. Sentinel explores enforcing that boundary before a proposed action executes.",
      },
      {
        id: "attack-lab",
        heading: "Attack lab",
        body: "The project work includes prompt injection, cross-tool escalation, tool poisoning, and a tool-definition rug pull. The scenarios distinguish the origin of an instruction from the capability the agent tries to exercise.",
      },
      {
        id: "decision",
        heading: "An inspectable decision",
        body: "The frontend separates the event stream, decision details, configuration, and history. A shared event contract connects the visual trace to the gateway interface. Default mock mode allows the team to rehearse scenarios independently of backend availability.",
      },
      {
        id: "evidence",
        heading: "Current evidence",
        body: "The public frontend and its simulated decision flow are inspectable. End-to-end enforcement against a connected live gateway has not been verified for this portfolio. The demonstration interface is not evidence of production protection.",
      },
    ],
  },
  {
    id: "rewarp",
    slug: "rewarp",
    title: "Rewarp",
    summary:
      "A multiplayer browser game adapted for a live event, with shared arena state, warp mechanics, and event controls.",
    category: "Interactive",
    technologies: ["JavaScript", "Canvas", "Node.js", "Express", "Socket.IO"],
    tags: ["Multiplayer", "Live event", "Realtime"],
    coverImage: "/media/projects/rewarp.webp",
    coverAlt: "Rewarp's multiplayer game lobby",
    links: [
      {
        label: "Source",
        href: "https://github.com/diyaboss/STARFALL-REWARP",
        kind: "source",
      },
      { label: "Play", href: "https://starfall-rewarp.onrender.com/", kind: "live" },
    ],
    featured: true,
    order: 2,
    date: "2026",
    status: "Event build",
    contribution: "Event adaptation & development",
    flow: ["Player input", "Socket.IO events", "Shared arena state", "Canvas view"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "Starfall / Rewarp event adaptation, gameplay changes and operator controls, built on an existing open-source multiplayer game foundation.",
      },
      {
        id: "system",
        heading: "An event-specific system",
        body: "The repository combines a browser-rendered arena with a Node.js server and Socket.IO communication. Event-specific controls and warp mechanics adapt the underlying multiplayer experience to a timed session.",
      },
      {
        id: "operator",
        heading: "Operator controls",
        body: "The event notes describe a 35-minute default round and an explicit operator action to arm the TV view. A client-side operator code should not be treated as a strong administrative security boundary.",
      },
      {
        id: "attribution",
        heading: "Attribution and limits",
        body: "The repository retains its agar.io-clone origin and MIT attribution. This portfolio presents the event adaptation as Diya's work, rather than claiming the entire game engine was written from scratch. Concurrent-player capacity has not been benchmarked here.",
      },
    ],
  },
  {
    id: "hackbuddy",
    slug: "hackbuddy",
    title: "HackBuddy",
    summary:
      "A teammate-discovery platform for hackathon participants, connecting profiles, skills, preferences, and match requests.",
    category: "Web systems",
    technologies: ["React", "Vite", "Node.js", "Express", "PostgreSQL"],
    tags: ["Full-stack", "Matching", "Hackathons"],
    coverImage: "/media/projects/hackbuddy.webp",
    coverAlt: "HackBuddy's teammate discovery homepage",
    links: [
      {
        label: "Frontend",
        href: "https://github.com/diyaboss/hackbuddy-frontend",
        kind: "source",
      },
      {
        label: "Backend",
        href: "https://github.com/diyaboss/hackbuddy-backend",
        kind: "source",
      },
      { label: "Demo", href: "https://hackbuddy-frontend.vercel.app/", kind: "live" },
    ],
    featured: true,
    order: 3,
    date: "2026",
    status: "Prototype",
    contribution: "Full-stack development",
    flow: ["Registration", "Participant profile", "Discovery", "Match request"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "Frontend flows and backend development for registration, participant profiles, discovery and match requests.",
      },
      {
        id: "teams",
        heading: "Complementary teams",
        body: "Participants describe their skills, interests and preferred ways of working. The product organizes teammate discovery around those profiles and explicit incoming requests, instead of treating every possible pairing as a completed match.",
      },
      {
        id: "apps",
        heading: "Separate applications",
        body: "The current source is split into frontend and backend repositories. The frontend implements staged sign-in, phone/setup and discovery flows. The backend uses Express and PostgreSQL-related dependencies.",
      },
      {
        id: "verified",
        heading: "What is verified",
        body: "The public homepage and source structure were inspected. Complete sign-in, OTP delivery, production authorization and matching quality were not validated during the portfolio work. Illustrative percentages in the original interface are not portfolio performance claims.",
      },
    ],
  },
  {
    id: "cicada-2067",
    slug: "cicada-2067",
    title: "CICADA 2067",
    summary:
      "Cryptic-hunt engineering across a web narrative, encoded media, and multi-stage event puzzles.",
    category: "Interactive",
    technologies: ["Web", "Audio", "SSTV", "Ciphers"],
    tags: ["Cryptic hunt", "Puzzles", "IEEE-CS"],
    coverImage: "/media/projects/cicada.webp",
    coverAlt: "The Dead Signal cryptic-hunt website",
    links: [{ label: "Event site", href: "https://deadsignal.web.app/", kind: "event" }],
    featured: true,
    order: 4,
    date: "2026",
    status: "Event build",
    contribution: "Event organizing & puzzle engineering",
    flow: ["Narrative clue", "Media investigation", "Decoded evidence", "Next stage"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "IEEE-CS event organization, puzzle sequences and encoded-media work, with other event contributors.",
      },
      {
        id: "sequence",
        heading: "A sequence of discoveries",
        body: "CICADA 2067 connects clues across the website and supplied media. The work includes audio and image encodings, SSTV-related puzzles and multi-step decoding sequences within a science-fiction narrative.",
      },
      {
        id: "access",
        heading: "Puzzle difficulty is not access control",
        body: "Obfuscation and hidden browser content can support a hunt, but they do not protect a production system. This portfolio keeps its optional educational lab separate from real contact data and administrative authorization.",
      },
      {
        id: "scope",
        heading: "Scope",
        body: "The event website is linked as a real artifact. This case study does not claim that all event assets or organizing work were produced by one person, and it does not expose active puzzle answers.",
      },
    ],
  },
  {
    id: "prompt-pursuit",
    slug: "prompt-pursuit",
    title: "Prompt Pursuit",
    summary:
      "A prompt-engineering competition platform for timed submissions, image comparison, scoring and leaderboards.",
    category: "Web systems",
    technologies: ["Python", "FastAPI", "SQLAlchemy", "PostgreSQL / Supabase target"],
    tags: ["Competition", "Backend", "API"],
    links: [
      {
        label: "Backend snapshot",
        href: "https://github.com/diyaboss/promptp_backend",
        kind: "source",
      },
    ],
    featured: false,
    order: 5,
    date: "2026",
    status: "In development",
    contribution: "Competition design & backend work",
    flow: ["Competition round", "Prompt submission", "Scoring interface", "Leaderboard"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "Competition flow and backend development. Model evaluation and scoring research are separate team contributions.",
      },
      {
        id: "separation",
        heading: "Separate the competition from the model",
        body: "The application owns round state, submissions and result presentation. A separate model/scoring team evaluates the image-comparison approach. The backend contract should allow that implementation to change without rebuilding the competition flow.",
      },
      {
        id: "snapshot",
        heading: "Source snapshot",
        body: "The inspected personal repository describes an early mock-backed phase. Supabase/PostgreSQL is the intended deployment direction; this older snapshot is not treated as proof of the team's latest integration or completion percentage.",
      },
    ],
  },
  {
    id: "crashshield-ai",
    slug: "crashshield-ai",
    title: "CrashShield AI",
    summary:
      "Road-safety work exploring hazard and anomaly detection with computer vision and on-device deployment.",
    category: "Computer vision",
    technologies: ["Computer vision", "On-device inference"],
    tags: ["Road safety", "Detection"],
    featured: false,
    order: 6,
    date: "2026",
    status: "Project notes",
    contribution: "Computer vision & deployment · team project",
    flow: ["Camera frame", "Hazard detection", "Ride event"],
    sections: [
      {
        id: "contribution",
        heading: "My contribution",
        body: "Hazard-detection and deployment work within a team project. Detailed implementation evidence is still being prepared for publication.",
      },
      {
        id: "evidence",
        heading: "Evidence still to add",
        body: "The connected repository was empty when inspected. This entry preserves the project's stated purpose without inventing screenshots, benchmark results or a finished product. Dataset, inference configuration, contribution detail and evaluation evidence should be added with the implementation.",
      },
    ],
  },
];
