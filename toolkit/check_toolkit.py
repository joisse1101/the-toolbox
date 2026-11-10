"""Checks that the toolkit's rules, skills, agents and commands still follow its own standards.

Standalone: plain standard library, run `python check_toolkit.py` from this folder (or pass
`--root <toolkit folder>`). Exits 1 and prints one `file:line: message` per problem, else prints a
one-line pass.

Checks:
  1. code-scoped rules: present and scoped to source-code file types
  2. unscoped and technology rules: `paths:` frontmatter, one rule per file extension
  3. `metadata.version` and `metadata.last_updated` on every skill, rule, agent and jois-git, jois-init, jois-code, jois-docs or jois-story command
  4. every slash command carries `disable-model-invocation: true`, except those in
     MODEL_STARTABLE_COMMANDS
  5. the PR body template and Author Verification sections of write-pr and update-pr match
  6. every agent declares `tools` (an omitted list inherits every tool)
  7. a skill may hold scripts, `lib/`, `references/` and a `package.json`; a `package.json` needs a
     `package-lock.json` beside it, and no script imports a file outside its skill folder
  8. every script in the jois-init-docs-templates folder has a test file
"""

from __future__ import annotations

import argparse
import datetime
import re
import sys
from pathlib import Path

# Load whenever source code is touched; they apply to every code type, so they may share extensions.
CODE_SCOPED_RULES = (
    "jois-code-core-principles.md",
    "jois-code-architecture-boundaries.md",
    "jois-code-quality.md",
)
SHARED_PR_SECTIONS = ("PR body template", "Author Verification")
# `/jois-code:review` starts validate through the Skill tool, and `/jois-code:apply` starts review the
# same way. The Skill tool refuses a command with `disable-model-invocation: true`. Validate keeps
# its own confirmation before it runs a foreign PR, and review never edits, commits or pushes.
MODEL_STARTABLE_COMMANDS = ("commands/jois-code/validate.md", "commands/jois-code/review.md")
# Load in every session on purpose: a commit can contain no code (images, deletions, docs),
# verification (a push, a deploy, a request for data) touches no code file either, and replies
# happen without touching a file. Installs (`pip`, `npm -g`) touch no code file either, and the
# rule that keeps Claude's own files and reads inside the repo applies before any code file is read.
UNSCOPED_RULES = (
    "jois-git-commit-hygiene.md",
    "jois-test-mock-data.md",
    "jois-comms-replies.md",
    "jois-env-local-installs.md",
    "jois-env-stay-in-repo.md",
)
# The source-code file types the three code-scoped rules load for. Each of them declares exactly
# this set, one `**/*.<ext>` glob per type, so they load together. Config and data extensions
# (json, yaml, md) are out. To cover another language, add it here and to all three rules.
CODE_EXTENSIONS = (
    "py", "java", "ts", "tsx", "js", "jsx", "ps1", "sh", "bat",
    "html", "css", "scss", "vue", "svelte",
    "go", "rs", "cs", "kt", "rb", "php", "c", "h", "cpp", "swift", "sql",
)

# The scripts `/jois-init:docs` ships; each needs a test file in the `tests` folder beside it.
TEMPLATE_SCRIPTS = Path("skills") / "jois-init-docs-templates" / "scripts"

# `metadata.version` in frontmatter: a semantic version, bumped by hand with `last_updated`.
SEMVER_RE = re.compile(r"\d+\.\d+\.\d+")


def _rule_paths(text: str) -> list[str] | None:
    """The globs in a rule's `paths:` frontmatter, or None if it has none."""
    match = re.match(r"---\r?\n(.*?)\r?\n---", text, re.DOTALL)
    if not match:
        return None
    block = re.search(r"^paths:[ \t]*\r?\n((?:[ \t]+-[ \t]*.+\r?\n?)+)", match.group(1) + "\n", re.MULTILINE)
    if not block:
        return None
    return [g.strip().strip("\"'") for g in re.findall(r"-[ \t]*(.+)", block.group(1))]


def _check_code_scoped_rules(rules: Path) -> list[str]:
    problems = []
    for name in CODE_SCOPED_RULES:
        path = rules / name
        if not path.is_file():
            problems.append(f"rules/{name}: required code-scoped rule is missing")
            continue
        globs = _rule_paths(path.read_text(encoding="utf-8"))
        if not globs:
            problems.append(f"rules/{name}: core rule needs `paths:` frontmatter")
            continue
        for glob in globs:
            if glob.rsplit(".", 1)[-1] not in CODE_EXTENSIONS:
                problems.append(f"rules/{name}: glob '{glob}' is not a source-code file type")
        declared = {glob.rsplit(".", 1)[-1] for glob in globs}
        for extension in CODE_EXTENSIONS:
            if extension not in declared:
                problems.append(f"rules/{name}: `paths:` is missing the source-code file type '{extension}'")
    return problems


def _check_unscoped_rules(rules: Path) -> list[str]:
    problems = []
    for name in UNSCOPED_RULES:
        path = rules / name
        if not path.is_file():
            continue
        rel = f"rules/{name}"
        if _rule_paths(path.read_text(encoding="utf-8")):
            problems.append(f"{rel}: unscoped rule must not have `paths:` frontmatter")
    return problems


def _check_scoped_rules(rules: Path) -> list[str]:
    problems = []
    seen: dict[str, str] = {}
    for path in sorted(rules.glob("*.md")):
        if path.name in CODE_SCOPED_RULES or path.name in UNSCOPED_RULES:
            continue
        rel = f"rules/{path.name}"
        globs = _rule_paths(path.read_text(encoding="utf-8"))
        if not globs:
            problems.append(f"{rel}: technology rule needs `paths:` frontmatter")
        for glob in globs or []:
            ext = glob.rsplit(".", 1)[-1]
            if ext in seen and seen[ext] != path.name:
                problems.append(f"{rel}: extension '{ext}' is also scoped by {seen[ext]}")
            seen.setdefault(ext, path.name)
    return problems


def _frontmatter(text: str) -> str | None:
    match = re.match(r"---\r?\n(.*?)\r?\n---", text, re.DOTALL)
    return match.group(1) if match else None


def _metadata(frontmatter: str) -> dict[str, str]:
    """The string keys of a frontmatter `metadata:` map (flat, as the Agent Skills format keeps it)."""
    block = re.search(r"^metadata:[ \t]*\r?\n((?:[ \t]+\S.*\r?\n?)+)", frontmatter + "\n", re.MULTILINE)
    if not block:
        return {}
    pairs = re.findall(r"^[ \t]+([\w-]+):[ \t]*(.*?)[ \t]*$", block.group(1), re.MULTILINE)
    return {key: value.strip("\"'") for key, value in pairs}


def _is_date(value: str) -> bool:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        return False
    try:
        datetime.date.fromisoformat(value)
    except ValueError:
        return False
    return True


def _versioned_items(toolkit: Path) -> list[Path]:
    return sorted(
        [
            *toolkit.glob("rules/*.md"),
            *toolkit.glob("skills/*/SKILL.md"),
            *toolkit.glob("agents/*.md"),
            *toolkit.glob("commands/jois-git/*.md"),
            *toolkit.glob("commands/jois-init/*.md"),
            *toolkit.glob("commands/jois-code/*.md"),
            *toolkit.glob("commands/jois-docs/*.md"),
            *toolkit.glob("commands/jois-story/*.md"),
        ]
    )


def _version_problems(rel: str, text: str) -> list[str]:
    frontmatter = _frontmatter(text) or ""
    if re.search(r"^version:", frontmatter, re.MULTILINE):
        return [f"{rel}: `version:` belongs under `metadata:`, not at the top level of the frontmatter"]
    metadata = _metadata(frontmatter)
    problems = []
    version = metadata.get("version")
    if version is None:
        problems.append(f"{rel}: missing `metadata.version` (semver such as \"1.0.0\")")
    elif not SEMVER_RE.fullmatch(version):
        problems.append(f"{rel}: metadata.version '{version}' is not MAJOR.MINOR.PATCH")
    updated = metadata.get("last_updated")
    if updated is None:
        problems.append(f"{rel}: missing `metadata.last_updated` (a date such as 2026-10-14)")
    elif not _is_date(updated):
        problems.append(f"{rel}: metadata.last_updated '{updated}' is not a date like 2026-10-14")
    return problems


def _check_commands_hidden(root: Path) -> list[str]:
    """Every slash command must stay out of the session listing (user-only invocation).

    The commands in MODEL_STARTABLE_COMMANDS are the exception: another command starts them through
    the Skill tool, which refuses a command that carries the flag.
    """
    problems = []
    for path in sorted((root / "commands").glob("**/*.md")):
        if _rel(root, path) in MODEL_STARTABLE_COMMANDS:
            continue
        frontmatter = _frontmatter(path.read_text(encoding="utf-8")) or ""
        if not re.search(r"^disable-model-invocation:[ 	]*true[ 	]*$", frontmatter, re.MULTILINE):
            problems.append(f"{_rel(root, path)}: missing `disable-model-invocation: true` in the frontmatter")
    return problems


def _check_versions(root: Path) -> list[str]:
    problems = []
    for path in _versioned_items(root):
        problems += _version_problems(_rel(root, path), path.read_text(encoding="utf-8"))
    return problems


def _check_agents_have_tools(root: Path) -> list[str]:
    """An agent without a `tools` field inherits every tool, so each one must list its own."""
    problems = []
    for path in sorted((root / "agents").glob("*.md")):
        frontmatter = _frontmatter(path.read_text(encoding="utf-8")) or ""
        if not re.search(r"^tools:[ \t]*\S", frontmatter, re.MULTILINE):
            problems.append(f"{_rel(root, path)}: missing `tools` in the frontmatter (an omitted list inherits every tool)")
    return problems


# Script files a skill may carry, and the import forms that name a file by path.
SCRIPT_SUFFIXES = (".mjs", ".js", ".cjs")
IMPORT_SPECIFIER_RE = re.compile(
    r"""(?:\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*)["']([^"']+)["']"""
)


def _skill_script_files(skill: Path) -> list[Path]:
    return sorted(
        path
        for path in skill.rglob("*")
        if path.is_file() and path.suffix in SCRIPT_SUFFIXES and "node_modules" not in path.parts
    )


def _check_skill_packages(root: Path) -> list[str]:
    """A skill with a `package.json` ships its lock file, so the installer's `npm ci` can run."""
    problems = []
    for package in sorted((root / "skills").glob("*/package.json")):
        if not (package.parent / "package-lock.json").is_file():
            problems.append(f"{_rel(root, package)}: `package.json` needs a `package-lock.json` beside it (the installer runs `npm ci`)")
    return problems


def _check_skill_imports(root: Path) -> list[str]:
    """A skill runs from its own installed folder, so a script may not import a file outside it."""
    problems = []
    for skill in sorted(p for p in (root / "skills").glob("*") if p.is_dir()):
        for script in _skill_script_files(skill):
            text = script.read_text(encoding="utf-8")
            for number, line in enumerate(text.splitlines(), start=1):
                for specifier in IMPORT_SPECIFIER_RE.findall(line):
                    if not specifier.startswith("."):
                        continue
                    target = (script.parent / specifier).resolve()
                    if not target.is_relative_to(skill.resolve()):
                        problems.append(
                            f"{_rel(root, script)}:{number}: imports '{specifier}', which is outside the skill folder {_rel(root, skill)}"
                        )
    return problems


def _h2_section(text: str, title: str) -> str | None:
    """The text under `## title` up to the next `## ` heading outside a code fence, or None."""
    body: list[str] = []
    found = in_fence = False
    for line in text.splitlines():
        if line.startswith("```"):
            in_fence = not in_fence
        elif line.startswith("## ") and not in_fence:
            if found:
                break
            found = line[3:].strip() == title
            continue
        if found:
            body.append(line)
    return "\n".join(body).strip() if found else None


def _check_shared_pr_sections(root: Path) -> list[str]:
    """write-pr and update-pr each carry the PR body rules; they must not drift apart."""
    commands = root / "commands" / "jois-git"
    write, update = commands / "write-pr.md", commands / "update-pr.md"
    if not (write.is_file() and update.is_file()):
        return []
    write_text, update_text = write.read_text(encoding="utf-8"), update.read_text(encoding="utf-8")
    return [
        f"{_rel(root, write)} and {_rel(root, update)}: section '{title}' differs; keep it identical in both"
        for title in SHARED_PR_SECTIONS
        if _h2_section(write_text, title) != _h2_section(update_text, title)
    ]


def _check_template_scripts_tested(root: Path) -> list[str]:
    """Every script the docs command ships needs `scripts/tests/test_<script>.py` beside it."""
    scripts = root / TEMPLATE_SCRIPTS
    problems = []
    for script in sorted(scripts.glob("*.py")):
        test = scripts / "tests" / f"test_{script.name}"
        if not test.is_file():
            problems.append(f"{_rel(root, script)}: no test file at {_rel(root, test)}")
    return problems


def check_toolkit(root: Path) -> list[str]:
    rules = root / "rules"
    if not rules.is_dir():
        return []
    return (
        _check_code_scoped_rules(rules)
        + _check_unscoped_rules(rules)
        + _check_scoped_rules(rules)
        + _check_versions(root)
        + _check_commands_hidden(root)
        + _check_shared_pr_sections(root)
        + _check_agents_have_tools(root)
        + _check_skill_packages(root)
        + _check_skill_imports(root)
        + _check_template_scripts_tested(root)
    )


def _rel(root: Path, path: Path) -> str:
    return path.resolve().relative_to(root.resolve()).as_posix()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Check the toolkit against its own standards.")
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parent,
        help="the toolkit folder (default: this script's folder)",
    )
    root = parser.parse_args(argv).root.resolve()
    problems = check_toolkit(root)
    if problems:
        print("\n".join(problems))
        print(f"\ntoolkit check failed: {len(problems)} problem(s)")
        return 1
    print("toolkit check passed")
    return 0


if __name__ == "__main__":
    sys.exit(main())
