"""Install-Toolkit.ps1 runs `npm ci` for a skill that carries a package.json.

Each test builds a throwaway toolkit (a copy of `install/` plus one demo skill) and a throwaway
project, so nothing touches the real toolkit or the home folder. The demo skill has no
dependencies; its `postinstall` script writes `node_modules/ran.txt` (npm makes no folder when
there is nothing to install, so the script does), which shows that `npm ci` ran.
"""

import json
import os
import shutil
import subprocess
from pathlib import Path

import pytest

INSTALL_DIR = Path(__file__).resolve().parent.parent / "install"
POWERSHELL = shutil.which("powershell") or shutil.which("pwsh")
NPM = shutil.which("npm")

pytestmark = pytest.mark.skipif(not (POWERSHELL and NPM), reason="needs PowerShell and npm")

LOCK = {
    "name": "demo",
    "version": "1.0.0",
    "lockfileVersion": 3,
    "requires": True,
    "packages": {"": {"name": "demo", "version": "1.0.0"}},
}
MARKER_SCRIPT = (
    "node -e \"const f=require('fs');f.mkdirSync('node_modules',{recursive:true});"
    "f.writeFileSync('node_modules/ran.txt','x')\""
)


def _toolkit(tmp_path, package=None):
    toolkit = tmp_path / "toolkit"
    shutil.copytree(INSTALL_DIR, toolkit / "install")
    skill = toolkit / "skills" / "jois-demo"
    skill.mkdir(parents=True)
    (skill / "SKILL.md").write_text(
        '---\nname: jois-demo\nmetadata:\n  version: "1.0.0"\n  last_updated: "2026-11-03"\n---\nDemo\n',
        encoding="utf-8",
    )
    package = package or {"name": "demo", "version": "1.0.0", "scripts": {"postinstall": MARKER_SCRIPT}}
    (skill / "package.json").write_text(json.dumps(package), encoding="utf-8")
    (skill / "package-lock.json").write_text(json.dumps(LOCK), encoding="utf-8")
    project = tmp_path / "project"
    project.mkdir()
    return toolkit, project


def _run(toolkit, project, *flags, path=None):
    env = dict(os.environ)
    if path is not None:
        env["PATH"] = path
    return subprocess.run(
        [POWERSHELL, "-NoProfile", "-File", str(toolkit / "install" / "Install-Toolkit.ps1"),
         "-Scope", "project", "-Path", str(project), *flags],
        capture_output=True, text=True, env=env, timeout=180,
    )


def _installed(project):
    return project / ".claude" / "skills" / "jois-demo"


def test_install_runs_npm_ci_and_list_stays_up_to_date(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    result = _run(toolkit, project)
    assert result.returncode == 0, result.stdout + result.stderr
    assert (_installed(project) / "node_modules" / "ran.txt").is_file()
    listing = _run(toolkit, project, "-List").stdout
    assert "up to date" in listing and "differs" not in listing


def test_up_to_date_skill_does_not_run_npm_again(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    _run(toolkit, project)
    marker = _installed(project) / "node_modules" / "ran.txt"
    marker.unlink()
    result = _run(toolkit, project)
    assert result.returncode == 0
    assert "up to date" in result.stdout
    assert not marker.exists()


def test_no_packages_switch_skips_npm_and_prints_the_command(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    result = _run(toolkit, project, "-NoPackages")
    assert result.returncode == 0
    assert not (_installed(project) / "node_modules").exists()
    assert "run npm ci in" in result.stdout and str(_installed(project)) in result.stdout


def test_missing_npm_leaves_files_and_exits_non_zero(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    result = _run(toolkit, project, path=str(Path(POWERSHELL).parent))
    assert result.returncode == 1
    assert (_installed(project) / "SKILL.md").is_file()
    assert "npm was not found" in result.stdout and str(_installed(project)) in result.stdout


def test_failing_npm_ci_is_reported_and_exits_non_zero(tmp_path):
    package = {"name": "demo", "version": "1.0.0", "dependencies": {"left-pad": "1.3.0"}}
    toolkit, project = _toolkit(tmp_path, package)
    result = _run(toolkit, project)
    assert result.returncode == 1
    assert "FAILED" in result.stdout and "npm ci exited" in result.stdout
    assert (_installed(project) / "SKILL.md").is_file()


def test_force_replaces_the_folder_and_reinstalls(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    _run(toolkit, project)
    (toolkit / "skills" / "jois-demo" / "SKILL.md").write_text(
        '---\nname: jois-demo\nmetadata:\n  version: "1.1.0"\n  last_updated: "2026-11-04"\n---\nNew\n',
        encoding="utf-8",
    )
    stale = _installed(project) / "node_modules" / "stale.txt"
    stale.write_text("x", encoding="utf-8")
    result = _run(toolkit, project, "-Force")
    assert result.returncode == 0, result.stdout + result.stderr
    assert "overwritten" in result.stdout
    assert not stale.exists()
    assert (_installed(project) / "node_modules" / "ran.txt").is_file()


def test_uninstall_removes_the_whole_folder_with_node_modules(tmp_path):
    toolkit, project = _toolkit(tmp_path)
    _run(toolkit, project)
    result = _run(toolkit, project, "-Uninstall")
    assert result.returncode == 0
    assert not _installed(project).exists()
