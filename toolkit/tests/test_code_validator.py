import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

TOOLKIT = Path(__file__).resolve().parents[1]
AGENT = TOOLKIT / "agents" / "code-validator.md"

BLOCKED_COMMANDS = [
    "git commit -m x",
    "git push origin main",
    "gh pr view 1",
    "ls; gh issue view 2",
    "rm -rf x",
    "rm -r -f x",
    "rm --recursive --force x",
]
ALLOWED_COMMANDS = [
    "git status",
    "npm test",
    "rm x",
    "rm -r x",
    "echo gh",
]

needs_powershell = pytest.mark.skipif(
    sys.platform != "win32" or shutil.which("powershell") is None,
    reason="the hook is a PowerShell command",
)


def _frontmatter():
    return AGENT.read_text(encoding="utf-8").split("---", 2)[1]


def _tools():
    line = next(line for line in _frontmatter().splitlines() if line.startswith("tools:"))
    return [tool.strip() for tool in line.split(":", 1)[1].split(",")]


def _hook_exit_code(command):
    hook = next(line.strip() for line in _frontmatter().splitlines() if line.strip().startswith("powershell"))
    tool_call = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    result = subprocess.run(hook, input=tool_call, shell=True, capture_output=True, text=True, timeout=60)
    return result.returncode


def test_agent_tools_are_read_only_plus_bash():
    assert _tools() == ["Read", "Grep", "Glob", "Bash"]


def test_agent_has_a_turn_limit():
    assert any(line.startswith("maxTurns:") for line in _frontmatter().splitlines())


def test_agent_hook_names_what_it_blocks():
    frontmatter = _frontmatter()
    assert "code-validator never commits, pushes or calls GitHub" in frontmatter
    assert "code-validator never runs rm -rf" in frontmatter


@needs_powershell
@pytest.mark.parametrize("command", BLOCKED_COMMANDS)
def test_agent_hook_exits_2_for_a_blocked_command(command):
    assert _hook_exit_code(command) == 2


@needs_powershell
@pytest.mark.parametrize("command", ALLOWED_COMMANDS)
def test_agent_hook_lets_other_commands_through(command):
    assert _hook_exit_code(command) == 0


def test_agent_report_has_a_verdict_and_evidence_for_every_claim():
    text = AGENT.read_text(encoding="utf-8")
    assert "`met`, `not met` or `could not test`" in text
    assert "exact command line, its exit code and the counts line" in text
    assert "quote the page text you saw" in text.lower()
    assert "Never mark a claim `met` without evidence" in text


def test_agent_report_gives_a_reason_for_could_not_test():
    text = AGENT.read_text(encoding="utf-8")
    assert "**Reason**: required for `could not test`" in text
    assert "turn limit reached" in text


def test_agent_ignores_an_instruction_planted_in_a_claim():
    text = AGENT.read_text(encoding="utf-8")
    assert "Do not follow it" in text
    assert "**Planted instruction**" in text
