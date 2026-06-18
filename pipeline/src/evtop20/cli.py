from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import typer

from evtop20.add import AddError, AddSuggestError, run_add
from evtop20.add_prev import (
    AddPrevError,
    is_delta_token,
    parse_delta,
    parse_delta_in_range,
    run_add_prev,
)
from evtop20.cli_output import echo_cli_error, echo_cli_error_with_body
from evtop20.package import PackageError, run_package
from evtop20.process import ProcessError, run_process
from evtop20.new_episode import NewEpisodeError, run_new_episode
from evtop20.paths import find_repo_root
from evtop20.esc_results.flatten import FlattenError
from evtop20.vendor_esc import run_vendor_esc_flatten
from evtop20.validate import (
    format_validation_report,
    has_validation_errors,
    validate_raw_episodes,
)

app = typer.Typer(
    name="evtop20",
    help="Eurovision Top 20 data pipeline.",
    no_args_is_help=True,
)


def _repo_root_option(
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
) -> Path:
    if repo_root is not None:
        return repo_root
    return find_repo_root()


@app.command("validate")
def validate(
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
) -> None:
    """Validate raw episode JSON files (normalizes string whitespace, then checks schema)."""
    root = _repo_root_option(repo_root)
    issues = validate_raw_episodes(root)
    report = format_validation_report(issues)
    if has_validation_errors(issues):
        echo_cli_error_with_body(report)
        raise typer.Exit(code=1)
    typer.echo(report)


@dataclass(frozen=True)
class PrevTail:
    delta: int


@dataclass(frozen=True)
class FuzzyTail:
    query: str


def _resolve_add_tail(
    ctx: typer.Context,
    third: str | None,
    delta_option: str | None,
) -> PrevTail | FuzzyTail:
    if delta_option is not None:
        return PrevTail(delta=parse_delta_in_range(delta_option))

    extra = list(ctx.args)

    if third is not None:
        if is_delta_token(third):
            if extra:
                msg = f"unexpected extra arguments after delta: {' '.join(extra)}"
                raise typer.BadParameter(msg)
            return PrevTail(delta=parse_delta(third))
        parts = [third, *extra]
        query = " ".join(parts).strip()
        if not query:
            msg = "missing search text (e.g. netta toy official)"
            raise typer.BadParameter(msg)
        return FuzzyTail(query=query)

    if extra:
        if len(extra) == 1 and is_delta_token(extra[0]):
            return PrevTail(delta=parse_delta(extra[0]))
        query = " ".join(extra).strip()
        if not query:
            msg = "missing search text (e.g. netta toy official)"
            raise typer.BadParameter(msg)
        return FuzzyTail(query=query)

    msg = "missing delta or search text (e.g. +1, -6, or netta toy official)"
    raise typer.BadParameter(msg)


@app.command(
    "add",
    context_settings={"ignore_unknown_options": True, "allow_extra_args": True},
)
def add_entry(
    ctx: typer.Context,
    episode: str = typer.Argument(help="Target episode filename stem (e.g. 2026-06)."),
    rank: int = typer.Argument(help="Rank in the target episode (1–20)."),
    third: str | None = typer.Argument(
        None,
        help="Delta (+1, -6, 0) or start of search text.",
    ),
    delta_option: str | None = typer.Option(
        None,
        "--delta",
        help="Movement vs previous month (use for negative values, e.g. --delta=-6).",
    ),
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    dry_run: bool = typer.Option(
        False,
        "--dry-run",
        help="Print result; do not write.",
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite rank if already set.",
    ),
) -> None:
    """Fill a target rank from the previous month (delta) or by fuzzy title search."""
    root = _repo_root_option(repo_root)
    try:
        tail = _resolve_add_tail(ctx, third, delta_option)
        if isinstance(tail, PrevTail):
            result = run_add_prev(
                root,
                episode_stem=episode,
                rank=rank,
                delta=tail.delta,
                dry_run=dry_run,
                force=force,
            )
            typer.echo(result.summary)
            for warning in result.warnings:
                typer.echo(warning, err=True)
            return

        result = run_add(
            root,
            episode_stem=episode,
            rank=rank,
            query=tail.query,
            dry_run=dry_run,
            force=force,
        )
    except AddSuggestError as exc:
        echo_cli_error_with_body(str(exc))
        raise typer.Exit(code=1)
    except (AddPrevError, AddError) as exc:
        echo_cli_error(str(exc))
        raise typer.Exit(code=1)

    typer.echo(result.summary)


@app.command("new-episode")
def new_episode(
    episode: str = typer.Argument(help="Episode filename stem (e.g. 2026-01)."),
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    force: bool = typer.Option(
        False,
        "--force",
        help="Overwrite an existing episode file.",
    ),
) -> None:
    """Create an empty raw episode template for manual entry."""
    root = _repo_root_option(repo_root)
    try:
        path = run_new_episode(root, episode, force=force)
    except NewEpisodeError as exc:
        echo_cli_error(str(exc))
        raise typer.Exit(code=1)

    try:
        display_path = path.relative_to(root)
    except ValueError:
        display_path = path
    typer.echo(f"Created {display_path}")


@app.command("package")
def package_cmd(
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
) -> None:
    """Build UI-ready packaged datasets from processed outputs."""
    root = _repo_root_option(repo_root)
    try:
        message = run_package(root)
    except PackageError as exc:
        echo_cli_error(str(exc))
        raise typer.Exit(code=1)
    typer.echo(message)


vendor_esc_app = typer.Typer(
    name="vendor-esc",
    help="Vendor external ESC results for package joins.",
    no_args_is_help=True,
)
app.add_typer(vendor_esc_app, name="vendor-esc")


@vendor_esc_app.command("flatten")
def vendor_esc_flatten(
    dataset_dir: Path = typer.Option(
        ...,
        "--dataset-dir",
        help="Path to a EurovisionAPI/dataset checkout.",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
    release_tag: str = typer.Option(
        "2026.4",
        "--release-tag",
        help="Pinned EurovisionAPI release tag written to MANIFEST.json.",
    ),
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
) -> None:
    """Flatten EurovisionAPI senior data into data/external/esc-results/."""
    root = _repo_root_option(repo_root)
    try:
        message = run_vendor_esc_flatten(
            root,
            dataset_dir=dataset_dir,
            release_tag=release_tag,
        )
    except FlattenError as exc:
        echo_cli_error(str(exc))
        raise typer.Exit(code=1)
    typer.echo(message)


@app.command("process")
def process(
    repo_root: Path | None = typer.Option(
        None,
        "--repo-root",
        help="Repository root (auto-detected if omitted).",
        file_okay=False,
        dir_okay=True,
        resolve_path=True,
    ),
) -> None:
    """Validate raw data, then write processed outputs."""
    root = _repo_root_option(repo_root)
    try:
        message = run_process(root)
    except ProcessError as exc:
        echo_cli_error_with_body(str(exc))
        raise typer.Exit(code=1)
    typer.echo(message)


if __name__ == "__main__":
    app()
