# Ground rules

- See `docs/adr/adr-000-tech-stack.md` (stack), `docs/adr/adr-002-site-visualization.md` (site interactivity libraries), `docs/adr/adr-003-data-layers.md` (raw / processed / packaged principles), `data/README.md` (paths and shapes), `docs/faq/chart_points.md` (`chart_points` formula), `docs/faq/esc_final_place.md` (`esc_final_place` codes and join), `docs/faq/commands.md` (CLI commands), `CHANGELOG.md` (shipped features), `docs/RELEASE.md` (release runbook)
- Breaking API changes are acceptable.
- For the static site UI the data model must be designed first. If the user asks to implement something UI-related always check if if the data model is already designed and the samples are generated. If not, stop an ask. 
- Before starting to implement a task, check if there are missing decisions, and ask user to clarify them instead of doing the implementation.
- When designing data model prefer sorting fields alphabetically unless there is a specific reason to do otherwise.
