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


def test_agent_report_carries_failures_part_and_evidence_rule():
    text = AGENT.read_text(encoding="utf-8")
    assert "**Failures**" in text
    assert "not caused by this group" in text
    assert "the same failure on `main`" in text
    assert "a fix brief names the failure as the task" in text.lower()


def test_apply_command_allows_monitor():
    allowed = next(
        line for line in _frontmatter(APPLY_COMMAND).splitlines() if line.startswith("allowed-tools:")
    )
    assert "Monitor" in [tool.strip() for tool in allowed.split(":", 1)[1].split(",")]


def test_apply_command_names_the_fix_loop_limits():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "A second round ends with a failure still unexplained" in text
    assert "The report ends in `blocked: <question>`" in text
    assert "the same command and the same output line" in text
    assert "Never take the next group while a failure of the current group is unexplained" in text


def test_apply_command_has_the_deferral_rule():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "A **deferrable failure**" in text
    assert "A deferrable failure does not run the fix loop" in text


def test_apply_command_requires_a_pending_task_checked_against_tasks_md():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "still pending in a later group" in text
    assert "Check the named task against `tasks.md` yourself" in text
    assert "with no task named is not deferrable" in text


def test_apply_command_commits_held_back_changes_when_green():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "commit all held-back changes by explicit path, cut by concern" in text
    assert "Never commit while any command is red" in text


def test_apply_command_defers_nothing_after_the_last_group():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert text.count("After the last group nothing is deferred") == 2
    assert "run the fix loop over the whole change" in text


def test_no_toolkit_file_allows_rm():
    for path in TOOLKIT.rglob("*.md"):
        if ".venv" in path.parts:
            continue
        assert "Bash(rm" not in path.read_text(encoding="utf-8"), path
