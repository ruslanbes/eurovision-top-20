from __future__ import annotations

import pytest

from evtop20.cli_output import format_error_line


def test_format_error_line_adds_prefix() -> None:
    assert format_error_line("something failed") == "ERROR: something failed"


def test_format_error_line_avoids_double_prefix() -> None:
    assert format_error_line("ERROR: already") == "ERROR: already"


def test_format_error_line_wraps_red_ansi_when_tty(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr("evtop20.cli_output._stderr_supports_color", lambda: True)
    line = format_error_line("something failed")
    assert line.startswith("\033[31mERROR: something failed\033[0m")
