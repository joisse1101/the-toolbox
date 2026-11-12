import json
import shutil
import subprocess
import sys
from pathlib import Path

import pytest

TOOLKIT = Path(__file__).resolve().parents[1]
AGENT = TOOLKIT / "agents" / "task-applier.md"
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


REFUSED_TASKS_PATHS = [
    "C:/repo/openspec/changes/x/tasks.md",
    "C:\\repo\\openspec\\changes\\x\\tasks.md",
    "C:/data/accounts/slices/sign-in/tasks.md",
    "C:\\data\\accounts\\slices\\sign-in\\tasks.md",
]
ALLOWED_EDIT_PATHS = [
    "C:/repo/src/tasks.md",
    "C:\\repo\\src\\app.js",
    "C:/data/accounts/slices/sign-in/UC-sign-in.md",
    "C:/repo/openspec/changes/x/design.md",
]


def _edit_hook_command():
    return [
        line.strip()
        for line in _frontmatter(AGENT).splitlines()
        if line.strip().startswith("powershell")
    ][1]


def _edit_hook_result(tool_name, file_path):
    tool_call = json.dumps({"tool_name": tool_name, "tool_input": {"file_path": file_path}})
    return subprocess.run(
        _edit_hook_command(), input=tool_call, shell=True, capture_output=True, text=True, timeout=60
    )


needs_powershell = pytest.mark.skipif(
    sys.platform != "win32" or shutil.which("powershell") is None,
    reason="the hook is a PowerShell command",
)


def test_agent_hook_blocks_rm_rf():
    assert "task-applier never runs rm -rf" in _frontmatter(AGENT)


@needs_powershell
@pytest.mark.parametrize("command", BLOCKED_COMMANDS)
def test_agent_hook_exits_2_for_a_blocked_command(command):
    assert _hook_exit_code(command) == 2


@needs_powershell
@pytest.mark.parametrize("command", ALLOWED_COMMANDS)
def test_agent_hook_lets_other_commands_through(command):
    assert _hook_exit_code(command) == 0


@needs_powershell
@pytest.mark.parametrize("tool_name", ["Edit", "Write"])
@pytest.mark.parametrize("file_path", REFUSED_TASKS_PATHS)
def test_edit_hook_refuses_a_change_or_slice_tasks_file(tool_name, file_path):
    result = _edit_hook_result(tool_name, file_path)
    assert result.returncode == 2
    assert "put the result: clause in your report" in result.stderr


@needs_powershell
@pytest.mark.parametrize("file_path", ALLOWED_EDIT_PATHS)
def test_edit_hook_lets_other_files_through(file_path):
    assert _edit_hook_result("Edit", file_path).returncode == 0


TEST_RUNNER = TOOLKIT / "agents" / "test-runner.md"
OLD_AGENT_FILES = ["opsx-task-applier.md", "opsx-test-runner.md"]


def test_agent_description_names_both_apply_workflows():
    description = _frontmatter(AGENT)
    assert "of an OpenSpec change or of a slice" in description
    assert "/jois-code:apply" in description and "/opsx:apply" in description


def test_agent_follows_the_brief_for_what_a_task_satisfies():
    text = AGENT.read_text(encoding="utf-8")
    assert "Follow the brief for both" in text


@pytest.mark.parametrize("agent", [AGENT, TEST_RUNNER])
def test_agents_carry_no_slice_vocabulary_or_old_name(agent):
    text = agent.read_text(encoding="utf-8")
    for token in ["opsx-", "UC-", "AC-", "`Satisfies:`", "`Verify:`"]:
        assert token not in text, f"{agent.name} still says {token}"


def test_old_agent_files_are_gone():
    for name in OLD_AGENT_FILES:
        assert not (TOOLKIT / "agents" / name).exists()


def test_apply_command_takes_only_a_slice():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "/jois-code:apply slice <backlog>/<slice>" in text
    assert "ask for `slice <backlog>/<slice>` and do nothing else" in text
    assert "openspec" not in text.lower()
    assert "Never suggest `/opsx:archive`" in text
    allowed = next(line for line in _frontmatter(APPLY_COMMAND).splitlines() if line.startswith("allowed-tools:"))
    assert "Bash(node *jois-story-plan*read-diagrams.mjs*)" in allowed
    assert "Bash(node *)" not in allowed and "Bash(node:*)" not in allowed


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


def test_apply_command_records_the_review_for_archive_in_the_slice_form():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "**Record the review.**" in text
    for field in ("`Review:`", "`Date:`", "`Reviewed commit:`", "`Fix rounds:`", "`## Known, not fixed`"):
        assert field in text
    allowed = next(line for line in _frontmatter(APPLY_COMMAND).splitlines() if line.startswith("allowed-tools:"))
    tools = [tool.strip() for tool in allowed.split(":", 1)[1].split(", ")]
    assert "Write(**/slices/*/review.md)" in tools
    assert "Write" not in tools


def test_apply_command_has_no_deferral_or_held_back_rule():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    for gone in ("deferrable", "held-back", "held back", "One rerun", "nothing is deferred"):
        assert gone not in text


def step_ten(text):
    return text.split("10. **Commit the group.**")[1].split("11. **Take the next group.**")[0]


def test_apply_command_commits_a_finished_group_without_a_test_run():
    step = step_ten(APPLY_COMMAND.read_text(encoding="utf-8"))
    assert "Do this when all of the group's tasks are done." in step
    assert "Run no test here." in step
    assert "Dispatch `test-runner`" not in step


def test_apply_command_runs_the_test_task_itself_with_the_runner():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "**The test task.**" in text
    assert "Do not send it to `task-applier`" in text
    assert "The tests passed only when every reported command shows exit code 0" in text
    assert "dispatch `test-runner` again" in text


def test_apply_command_stops_before_the_last_group_without_the_runner():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "Before the dispatch of the last group, say it again and stop" in text



def test_no_toolkit_file_allows_rm():
    for path in TOOLKIT.rglob("*.md"):
        if ".venv" in path.parts:
            continue
        assert "Bash(rm" not in path.read_text(encoding="utf-8"), path


def test_apply_command_does_not_say_the_change_folder_is_committed_at_archive():
    text = APPLY_COMMAND.read_text(encoding="utf-8")
    assert "committed at archive" not in text
    assert "`/jois-code:archive` does not stage it either" in text
    assert "so the ticks stay local, and `/jois-code:archive` does not stage it either" in text
