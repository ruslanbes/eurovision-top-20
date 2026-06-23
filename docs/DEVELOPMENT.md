# Development

## Ground rules

- Breaking API changes are acceptable.
- Don't care about backwards compatibility.
- For the static site UI desing the the data model first. Before implementing anything UI-related always check if the data model is already designed and the samples are generated. 
- Before starting to implement a task, check if there are missing decisions, clarify them first instead of doing the implementation.
- When designing data model prefer sorting fields alphabetically unless there is a specific reason to do otherwise.
- When cutting a version or cleaning shipped work, follow `docs/RELEASE.md` (changelog promotion, backlog + task-file cleanup).

## Reference docs

- `docs/adr/adr-000-tech-stack.md` (tech stack)
- `docs/adr/adr-002-site-visualization.md` (site interactivity libraries)
- `docs/adr/adr-003-data-layers.md` (raw / processed / packaged principles)
- `data/README.md` (paths and shapes)
- `docs/faq/chart_points.md` (`chart_points` formula)
- `docs/faq/esc_final_place.md` (`esc_final_place` codes and join)
- `docs/faq/commands.md` (CLI commands)
- `CHANGELOG.md` (shipped features)
- `docs/RELEASE.md` (release runbook)
