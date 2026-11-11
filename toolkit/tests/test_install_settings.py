"""Install-Toolkit.ps1 sets CLAUDE_CODE_SUBAGENT_MODEL in Claude Code's settings.json.

Each test builds a throwaway toolkit (a copy of `install/` plus one demo rule), a throwaway project
and a throwaway home folder, so nothing touches the real toolkit or the real settings file.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

INSTALL_DIR = Path(__file__).resolve().parent.parent / "install"
POWERSHELL = shutil.which("powershell") or shutil.which("pwsh")

pytestmark = pytest.mark.skipif(not POWERSHELL, reason="needs PowerShell")

KEY = "CLAUDE_CODE_SUBAGENT_MODEL"
FORCE_KEY = "CLAUDE_CODE_SUBAGENT_MODEL_FORCE"
RICH_SETTINGS = {
    "model": "opus",
    "permissions": {"allow": ["Bash(git status:*)", "Read(*)"], "deny": []},
    "hooks": {"PreToolUse": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "echo hi"}]}]},
    "env": {"OTHER": "1"},
}


def _toolkit(tmp_path):
    toolkit = tmp_path / "toolkit"
    shutil.copytree(INSTALL_DIR, toolkit / "install")
    rules = toolkit / "rules"
    rules.mkdir()
    (rules / "jois-demo.md").write_text(
        '---\nmetadata:\n  version: "1.0.0"\n  last_updated: "2026-11-11"\n---\nDemo\n', encoding="utf-8"
    )
    project = tmp_path / "project"
    project.mkdir()
    home = tmp_path / "home"
    home.mkdir()
    return toolkit, project, home


def _run(toolkit, project, home, *flags, scope="project", stdin=""):
    env = dict(os.environ, USERPROFILE=str(home), HOME=str(home))
    args = [POWERSHELL, "-NoProfile", "-File", str(toolkit / "install" / "Install-Toolkit.ps1"), "-Scope", scope]
    if scope == "project":
        args += ["-Path", str(project)]
    return subprocess.run(
        [*args, *flags], input=stdin, capture_output=True, text=True, env=env, timeout=120
    )


def _settings_file(project):
    return project / ".claude" / "settings.json"


def _write_settings(project, data):
    path = _settings_file(project)
    path.parent.mkdir(parents=True, exist_ok=True)
    text = data if isinstance(data, str) else json.dumps(data, indent=2)
    path.write_text(text, encoding="utf-8")
    return path


def _read_settings(project):
    return json.loads(_settings_file(project).read_text(encoding="utf-8"))


def _backups(project):
    return sorted(_settings_file(project).parent.glob("settings.json.bak-*"))


def test_settings_file_missing_is_created_with_the_key(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    result = _run(toolkit, project, home)
    assert result.returncode == 0, result.stdout + result.stderr
    assert _read_settings(project) == {"env": {KEY: "sonnet"}}
    assert _backups(project) == []


def test_global_scope_resolves_to_the_home_settings_file(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    result = _run(toolkit, project, home, scope="global")
    assert result.returncode == 0, result.stdout + result.stderr
    written = json.loads((home / ".claude" / "settings.json").read_text(encoding="utf-8"))
    assert written == {"env": {KEY: "sonnet"}}
    assert not _settings_file(project).exists()


def test_other_keys_are_kept_including_nested_arrays_and_objects(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, RICH_SETTINGS)
    result = _run(toolkit, project, home)
    assert result.returncode == 0, result.stdout + result.stderr
    expected = json.loads(json.dumps(RICH_SETTINGS))
    expected["env"][KEY] = "sonnet"
    assert _read_settings(project) == expected


def test_empty_settings_file_gets_the_key(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, "")
    result = _run(toolkit, project, home)
    assert result.returncode == 0, result.stdout + result.stderr
    assert _read_settings(project) == {"env": {KEY: "sonnet"}}


def test_settings_without_env_object_gets_one(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, {"model": "opus"})
    _run(toolkit, project, home)
    assert _read_settings(project) == {"model": "opus", "env": {KEY: "sonnet"}}


def test_value_already_sonnet_is_reported_and_not_written(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, {"env": {KEY: "sonnet"}})
    before = path.read_bytes()
    result = _run(toolkit, project, home)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "up to date  settings" in result.stdout
    assert path.read_bytes() == before
    assert _backups(project) == []


def test_named_item_never_reads_or_changes_settings(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, "{ not json")
    before = path.read_bytes()
    result = _run(toolkit, project, home, "-Rule", "jois-demo.md")
    assert result.returncode == 0, result.stdout + result.stderr
    assert path.read_bytes() == before
    assert "settings" not in result.stdout


def test_force_variable_is_never_written(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, {"env": {KEY: "opus"}})
    _run(toolkit, project, home, "-SubagentModel", "Overwrite")
    assert FORCE_KEY not in _read_settings(project)["env"]
    assert FORCE_KEY not in _run(toolkit, project, home).stdout


def test_backup_is_saved_before_an_existing_file_changes(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, RICH_SETTINGS)
    before = path.read_bytes()
    _run(toolkit, project, home)
    backups = _backups(project)
    assert len(backups) == 1
    assert backups[0].read_bytes() == before


def test_invalid_json_is_left_unchanged_and_exits_non_zero(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, '{ "env": ')
    before = path.read_bytes()
    result = _run(toolkit, project, home)
    assert result.returncode != 0
    assert str(path) in result.stdout
    assert path.read_bytes() == before
    assert _backups(project) == []


def test_interactive_overwrite_replaces_the_value_and_states_both_effects(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, {"env": {KEY: "opus"}})
    result = _run(toolkit, project, home, stdin="o\n")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "'opus'" in result.stdout
    assert "Overwrite:" in result.stdout and "Skip:" in result.stdout
    assert _read_settings(project)["env"][KEY] == "sonnet"


def test_interactive_skip_keeps_the_value(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, {"env": {KEY: "opus"}})
    before = path.read_bytes()
    result = _run(toolkit, project, home, stdin="s\n")
    assert result.returncode == 0, result.stdout + result.stderr
    assert path.read_bytes() == before


def test_unattended_run_skips_with_a_warning_and_exits_zero(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, {"env": {KEY: "opus"}})
    before = path.read_bytes()
    result = _run(toolkit, project, home, stdin="")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "WARNING" in result.stdout and "opus" in result.stdout and "-SubagentModel Overwrite" in result.stdout
    assert path.read_bytes() == before


@pytest.mark.parametrize("choice, expected", [("Overwrite", "sonnet"), ("Skip", "opus")])
def test_subagent_model_parameter_applies_without_asking(tmp_path, choice, expected):
    toolkit, project, home = _toolkit(tmp_path)
    _write_settings(project, {"env": {KEY: "opus"}})
    result = _run(toolkit, project, home, "-SubagentModel", choice)
    assert result.returncode == 0, result.stdout + result.stderr
    assert "Read-Host" not in result.stdout + result.stderr
    assert _read_settings(project)["env"][KEY] == expected


def test_no_settings_switch_never_reads_or_changes_the_file(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, "{ not json")
    before = path.read_bytes()
    result = _run(toolkit, project, home, "-NoSettings")
    assert result.returncode == 0, result.stdout + result.stderr
    assert path.read_bytes() == before


@pytest.mark.parametrize(
    "settings, state",
    [(None, "missing"), ({"env": {KEY: "sonnet"}}, "up to date"), ({"env": {KEY: "opus"}}, "differs")],
)
def test_list_prints_the_keys_state_without_changing_any_file(tmp_path, settings, state):
    toolkit, project, home = _toolkit(tmp_path)
    before = None
    if settings is not None:
        before = _write_settings(project, settings).read_bytes()
    result = _run(toolkit, project, home, "-List")
    assert result.returncode == 0, result.stdout + result.stderr
    line = next(line for line in result.stdout.splitlines() if KEY in line)
    assert state in line
    if before is None:
        assert not _settings_file(project).exists()
    else:
        assert _settings_file(project).read_bytes() == before


def test_uninstall_leaves_settings_unchanged_and_names_the_key(tmp_path):
    toolkit, project, home = _toolkit(tmp_path)
    path = _write_settings(project, {"env": {KEY: "sonnet"}})
    before = path.read_bytes()
    result = _run(toolkit, project, home, "-Uninstall")
    assert result.returncode == 0, result.stdout + result.stderr
    assert path.read_bytes() == before
    assert KEY in result.stdout and "by hand" in result.stdout
