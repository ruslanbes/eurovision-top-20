# evtop20 pipeline

See [`docs/faq/commands.md`](../docs/faq/commands.md) for full CLI reference.

```sh
cd pipeline
uv sync --all-groups
uv run evtop20 validate
uv run evtop20 process
uv run evtop20 package
uv run pytest
```
