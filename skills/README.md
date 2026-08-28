# Project Skills

This directory stores the project-relevant Codex skills selected for the Next Video application. These local copies keep their instructions, references, assets, and licenses with the project.

## Included skills

| Skill | Purpose | Original source |
| --- | --- | --- |
| `frontend-design` | Intentional UI direction, typography, layout, interaction, and non-generic product design | https://github.com/anthropics/skills/tree/main/skills/frontend-design |
| `grill-me` | Structured questioning when important product or implementation decisions remain unclear | https://github.com/mattpocock/skills/tree/main/skills/productivity/grill-me |
| `hallmark` | Anti-template design discipline, structural variety, responsive rules, and visual quality checks | https://github.com/nutlope/hallmark |
| `security-best-practices` | JavaScript/TypeScript and Next.js security review guidance | https://github.com/openai/skills/tree/main/skills/.curated/security-best-practices |
| `yeet` | Stage, commit, push, and open a GitHub pull request when explicitly requested | https://github.com/openai/skills/tree/main/skills/.curated/yeet |

## Usage notes

- Each skill keeps its own `SKILL.md` entry point.
- Preserve references, assets, agent metadata, and licenses.
- A project-local copy is an inventory and portable source; an environment may still require the skill to be installed or explicitly read from this path.
- Use skills only when their trigger conditions match the task.
- Use `yeet` only when explicitly asked to stage, commit, push, and open a pull request.
- Use `security-best-practices` when secure implementation or a security review is requested.
- Environment-owned system skills are not copied unless the project depends on a customized version.

## Adding a future skill

1. Add the complete folder under `skills/<skill-name>/`.
2. Confirm it contains a valid `SKILL.md`.
3. Preserve its license and supporting files.
4. Add it to the table above.
5. Record its original source and intended project use.
6. Never place API keys, tokens, credentials, or private configuration inside a skill folder.
