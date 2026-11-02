from pathlib import Path

TOOLKIT = Path(__file__).resolve().parents[1]
AGENT = TOOLKIT / "agents" / "opsx-task-applier.md"
APPLY_COMMAND = TOOLKIT / "commands" / "jois-code" / "apply.md"


def _frontmatter(path):
    text = path.read_text(encoding="utf-8")
    return text.split("---", 2)[1]


def test_agent_hook_blocks_rm_rf():
    frontmatter = _frontmatter(AGENT)
    assert "opsx-task-applier never runs rm -rf" in frontmatter
    assert "\\brm\\s+-" in frontmatter


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
