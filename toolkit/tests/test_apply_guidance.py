"""The apply guidance that /jois-init:opsx writes, and this repository's copy of it."""
import re
from pathlib import Path

TOOLKIT = Path(__file__).resolve().parents[1]
OPSX_COMMAND = TOOLKIT / "commands" / "jois-init" / "opsx.md"
CONFIG = TOOLKIT.parent / "openspec" / "config.yaml"
BEGIN = "# jois-init:opsx begin (managed by"
END = "# jois-init:opsx end"


def _apply_entries(text):
    """The guidance lines between the first pair of markers (the apply block)."""
    text = text.replace("\r\n", "\n")
    start = text.index(BEGIN)
    body = text[text.index("\n", start) + 1 : text.index(END, start)]
    return [line.strip() for line in body.splitlines() if line.strip()]


def test_block_is_one_line_per_entry():
    entries = _apply_entries(OPSX_COMMAND.read_text(encoding="utf-8"))
    assert len(entries) >= 5
    assert all(re.fullmatch(r'- ".*"', entry) for entry in entries)


def test_block_names_both_agents_and_the_commit_conditions():
    block = "\n".join(_apply_entries(OPSX_COMMAND.read_text(encoding="utf-8")))
    assert "task-applier" in block and "test-runner" in block
    assert "a branch other than main or master" in block
    assert "Never push" in block
    assert "exit code 0" in block
    assert "Install-Toolkit.ps1" in block


def test_repository_config_holds_the_same_block():
    command = _apply_entries(OPSX_COMMAND.read_text(encoding="utf-8"))
    config = _apply_entries(CONFIG.read_text(encoding="utf-8"))
    assert config == command


def test_config_keeps_rules_and_archive_guidance():
    text = CONFIG.read_text(encoding="utf-8")
    assert "\nrules:\n" in text.replace("\r\n", "\n")
    assert "Follow the jois-git-commit-hygiene rule for the archive commit" in text
