import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

TOOLKIT = Path(__file__).resolve().parents[1]
AGENT = TOOLKIT / "agents" / "opsx-task-applier.md"
APPLY_COMMAND = TOOLKIT / "commands" / "jois-code" / "apply.md"

BLOCKED_COMMANDS = [
    "rm -rf x",
    "rm -fr x",
    "rm -Rf x",
    "rm -r -f x",
    "rm -f -r x",
    "rm --recursive --force x",
    "rm --recursive -f x",
    "rm -r --force x",
    "ls x; rm -r -f x",
    'rm -rf "a b"',
    'rm "a b" -rf',
    "git commit -m x",
]
ALLOWED_COMMANDS = [
    "git status",
    "rm x",
    "rm -r x",
    "rm --recursive x",
    "rm -f x",
    "ls -rf",
    "echo rm; ls -f -r",
]


def _frontmatter(path):
    text = path.read_text(encoding="utf-8")
    return text.split("---", 2)[1]


def _bash_hook_command():
    return next(
        line.strip()
        for line in _frontmatter(AGENT).splitlines()
        if line.strip().startswith("powershell")
    )


def _hook_exit_code(command):
    tool_call = json.dumps({"tool_name": "Bash", "tool_input": {"command": command}})
    result = subprocess.run(
        _bash_hook_command(), input=tool_call, shell=True, capture_output=True, text=True, timeout=60
    )
    return result.returncode


needs_powershell = pytest.mark.skipif(
    sys.platform != "win32" or shutil.which("powershell") is None,
    reason="the hook is a PowerShell command",
)


def test_agent_hook_blocks_rm_rf():
    assert "opsx-task-applier never runs rm -rf" in _frontmatter(AGENT)


@needs_powershell
@pytest.mark.parametrize("command", BLOCKED_COMMANDS)
def test_agent_hook_exits_2_for_a_blocked_command(command):
    assert _hook_exit_code(command) == 2


@needs_powershell
@pytest.mark.parametrize("command", ALLOWED_COMMANDS)
def test_agent_hook_lets_other_commands_through(command):
    assert _hook_exit_code(command) == 0


def test_agent_hook_keeps_the_git_and_gh_block():
    frontmatter = _frontmatter(AGENT)
    assert "never commits, pushes or calls GitHub" in frontmatter


def test_apply_command_allows_monitor():
    allowed = next(
        line for line in _frontmatter(APPLY_COMMAND).splitlines() if line.startswith("allowed-tools:")
    )
    assert "Monitor" in [tool.strip() for tool in allowed.split(":", 1)[1].split(",")]


def test_no_toolkit_file_allows_rm():
    for path in TOOLKIT.rglob("*.md"):
        if ".venv" in path.parts:
            continue
        assert "Bash(rm" not in path.read_text(encoding="utf-8"), path
