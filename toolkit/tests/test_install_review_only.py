"""`/jois-story:review` must work in a project that holds only the review skill.

The test installs `jois-story-review` and the `jois-story` commands from the real toolkit into a throwaway
project, then runs the two scripts the command can use from the installed folder, on the committed sample
data. Nothing touches the home folder or the real planner data.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

TOOLKIT = Path(__file__).resolve().parent.parent
SAMPLE_DATA = TOOLKIT.parent / "planner" / "test" / "sample-data"
POWERSHELL = shutil.which("powershell") or shutil.which("pwsh")
NODE = shutil.which("node")

pytestmark = pytest.mark.skipif(not (POWERSHELL and NODE), reason="needs PowerShell and node")


def _install(project, *flags):
    return subprocess.run(
        [POWERSHELL, "-NoProfile", "-File", str(TOOLKIT / "install" / "Install-Toolkit.ps1"),
         "-Scope", "project", "-Path", str(project), *flags],
        capture_output=True, text=True, timeout=180,
    )


@pytest.fixture()
def project(tmp_path):
    project = tmp_path / "project"
    project.mkdir()
    for flags in (("-Skill", "jois-story-review"), ("-Command", "jois-story")):
        done = _install(project, *flags)
        assert done.returncode == 0, done.stdout + done.stderr
    config = tmp_path / "planner.config.yaml"
    config.write_text(f"dataDir: {json.dumps(str(SAMPLE_DATA))}\n", encoding="utf-8")
    return project, config


def _node(config, script, *args, stdin=None):
    env = dict(os.environ, PLANNER_CONFIG=str(config))
    return subprocess.run([NODE, str(script), *args], capture_output=True, text=True, env=env, input=stdin, timeout=60)


def test_only_the_review_skill_and_the_commands_are_installed(project):
    root, _ = project
    skills = sorted(p.name for p in (root / ".claude" / "skills").iterdir())
    assert skills == ["jois-story-review"]
    commands = sorted(p.name for p in (root / ".claude" / "commands" / "jois-story").iterdir())
    assert commands == ["propose.md", "re-read.md", "review.md", "verify.md"]


def test_the_review_command_names_a_skill_for_each_script_and_does_not_need_propose():
    text = (TOOLKIT / "commands" / "jois-story" / "review.md").read_text(encoding="utf-8")
    assert "Bash(node *read-backlog.mjs*)" in text
    for script in ("read-story-context.mjs", "read-backlog.mjs", "write-review.mjs"):
        assert f"`{script}`:" in text, script
    assert "`write-proposal.mjs`, `write-lexicon.mjs` and `suggest-lexicon.mjs`: `jois-story-propose` only" in text
    assert "If it is not installed, say so and stop" not in text
    assert "`read-backlog.mjs`: `jois-story-review`" in text


def test_the_installed_review_skill_holds_the_scripts_the_command_falls_back_on(project):
    root, config = project
    skill = root / ".claude" / "skills" / "jois-story-review"
    menu = _node(config, skill / "read-backlog.mjs", "sample")
    assert menu.returncode == 0, menu.stderr
    assert "Sections of sample" in menu.stdout
    check = _node(config, skill / "write-review.mjs", "sample", "--append", "--check", stdin="[]")
    assert check.returncode == 0, check.stdout + check.stderr
