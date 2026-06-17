from __future__ import annotations

import sys

import typer

_RED = "\033[31m"
_RESET = "\033[0m"


def _stderr_supports_color() -> bool:
    return sys.stderr.isatty()


def format_error_line(message: str) -> str:
    text = message if message.startswith("ERROR: ") else f"ERROR: {message}"
    if _stderr_supports_color():
        return f"{_RED}{text}{_RESET}"
    return text


def echo_cli_error(message: str) -> None:
    """Print an error line (red when stderr is a TTY). Use for single-line failures."""
    typer.echo(format_error_line(message), err=True)


def echo_cli_error_with_body(message: str) -> None:
    """Print the first line as a red ERROR; following lines unchanged (e.g. suggestions)."""
    lines = message.splitlines()
    if not lines:
        echo_cli_error("")
        return
    typer.echo(format_error_line(lines[0]), err=True)
    for line in lines[1:]:
        typer.echo(line, err=True)
