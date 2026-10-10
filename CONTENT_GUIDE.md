# Editing your content

Everything the site says about you lives in `src/content/`. You never need to touch scenes, shaders or routing to add work.

| File | What it holds |
| --- | --- |
| `profile.ts` | Name, role, brief, about paragraphs, education, email |
| `projects.ts` | Case studies (one object per project) |
| `skills.ts` | Skill groups — each group becomes one 3D ring |
| `social.ts` | Contact links shown in the pedestal carousel |
| `navigation.ts` | Section names in the bottom-right nav |

The build validates content: duplicate ids/slugs, bad slugs and non-`https://` links fail `npm run build` with a clear message.

## Add a project

1. Open `src/content/projects.ts` and append an object:

```ts
{
  id: "my-project",            // stable, never change once published
  slug: "my-project",          // URL: /projects/my-project (lowercase, digits, hyphens)
  title: "My Project",
  summary: "One sentence shown on the crystal callout and at the top of the case study.",
  category: "Security",
  technologies: ["Python", "FastAPI"],
  tags: ["Tooling"],
  links: [
    { label: "Source", href: "https://github.com/diyaboss/my-project", kind: "source" },
    { label: "Demo", href: "https://my-project.vercel.app/", kind: "live" },
  ],
  featured: true,
  order: 7,                    // position in the list
  date: "2026",
  status: "Prototype",
  contribution: "Backend · team project",
  flow: ["Input", "Analysis", "Report"],   // optional system-flow steps
  sections: [
    { id: "contribution", heading: "My contribution", body: "What you built." },
  ],
},
```

2. Optional media: put images in `public/media/projects/` and reference them as `coverImage: "/media/projects/my-project.webp"`. Missing files are skipped automatically, so a typo never shows a broken image.

That's it — a new crystal (with your title frozen inside it), a callout, a static page at `/projects/<slug>` and a "Next" link are all generated from this entry. Crystals are spaced automatically; the scroll track grows with the number of projects.

## Add a skill

In `src/content/skills.ts`, add `{ name: "Rust", evidence: ["my-project"] }` to a group. `evidence` lists project slugs; the site shows them as numbered links. Add a whole new group to get a new ring.

## Add a contact link

In `src/content/social.ts`:

```ts
{ id: "linkedin", label: "LinkedIn", href: "https://www.linkedin.com/in/…", glyph: "in", description: "Diya's LinkedIn profile" },
```

`glyph` is the short text the particle sculpture forms (1–3 characters work best).
