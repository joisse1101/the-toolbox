import check_toolkit
import pytest

HIDDEN = "disable-model-invocation: true"
VERSION = 'metadata:\n  version: "1.0.0"\n  last_updated: "2026-10-14"'


def _write(root, relative, text=""):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _problems(root):
    return check_toolkit.check_toolkit(root)


def _toolkit_tree(root):
    _write(root, "rules/jois-code-core-principles.md", _code_scoped())
    _write(root, "rules/jois-code-architecture-boundaries.md", _code_scoped())
    _write(root, "rules/jois-code-quality.md", _code_scoped())
    _write(root, "rules/jois-code-java.md", f'---\n{VERSION}\npaths:\n  - "**/*.java"\n---\nJava\n')


def _scoped(extension, padding=0):
    return f'---\n{VERSION}\npaths:\n  - "**/*.{extension}"\n---\n' + "x" * padding


def _code_scoped(without=(), extra=()):
    globs = [e for e in check_toolkit.CODE_EXTENSIONS if e not in without] + list(extra)
    paths = "".join(f'  - "**/*.{e}"\n' for e in globs)
    return f"---\n{VERSION}\npaths:\n{paths}---\n"


def test_toolkit_tree_passes(tmp_path):
    _toolkit_tree(tmp_path)
    assert _problems(tmp_path) == []


def test_always_on_rule_needs_paths(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-architecture-boundaries.md", "no frontmatter")
    problems = _problems(tmp_path)
    assert any("jois-code-architecture-boundaries.md" in p and "needs `paths:`" in p for p in problems)


def test_large_rules_have_no_size_problem(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-core-principles.md", _code_scoped() + "x" * 20000)
    _write(tmp_path, "rules/jois-code-java.md", _scoped("java", 20000))
    _write(tmp_path, "rules/jois-git-commit-hygiene.md", f"---\n{VERSION}\n---\n" + "x" * 20000)
    assert _problems(tmp_path) == []


def test_core_rule_paths_must_be_source_code(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-core-principles.md", _code_scoped(extra=("json",)))
    assert "rules/jois-code-core-principles.md: glob '**/*.json' is not a source-code file type" in _problems(
        tmp_path
    )


def test_missing_code_scoped_rule(tmp_path):
    _toolkit_tree(tmp_path)
    (tmp_path / "rules/jois-code-core-principles.md").unlink()
    assert "rules/jois-code-core-principles.md: required code-scoped rule is missing" in _problems(
        tmp_path
    )


def test_missing_quality_rule(tmp_path):
    _toolkit_tree(tmp_path)
    (tmp_path / "rules/jois-code-quality.md").unlink()
    assert "rules/jois-code-quality.md: required code-scoped rule is missing" in _problems(tmp_path)


def test_quality_rule_needs_paths(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-quality.md", f"---\n{VERSION}\n---\nno paths\n")
    assert "rules/jois-code-quality.md: core rule needs `paths:` frontmatter" in _problems(tmp_path)


def test_quality_rule_paths_must_be_source_code(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-quality.md", _code_scoped(extra=("yaml",)))
    assert "rules/jois-code-quality.md: glob '**/*.yaml' is not a source-code file type" in _problems(tmp_path)


def test_code_scoped_rule_missing_a_type_is_named(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-quality.md", _code_scoped(without=("html",)))
    assert "rules/jois-code-quality.md: `paths:` is missing the source-code file type 'html'" in _problems(
        tmp_path
    )


def test_code_scoped_rules_cover_web_and_other_languages():
    for extension in ("html", "css", "go", "sql"):
        assert extension in check_toolkit.CODE_EXTENSIONS


def test_code_scoped_rules_may_share_extensions_with_technology_rules(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-code-python.md", _scoped("py"))
    assert _problems(tmp_path) == []


def test_scoped_rule_needs_paths_and_unique_extensions(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/noscope.md", f"---\n{VERSION}\n---\nno paths\n")
    _write(tmp_path, "rules/other.md", _scoped("java"))
    problems = _problems(tmp_path)
    assert "rules/noscope.md: technology rule needs `paths:` frontmatter" in problems
    assert "rules/other.md: extension 'java' is also scoped by jois-code-java.md" in problems


@pytest.mark.parametrize("name", check_toolkit.UNSCOPED_RULES)
def test_unscoped_rule_is_accepted_without_paths(tmp_path, name):
    _toolkit_tree(tmp_path)
    _write(tmp_path, f"rules/{name}", f"---\n{VERSION}\n---\n# Rule\n")
    assert _problems(tmp_path) == []


@pytest.mark.parametrize("name", check_toolkit.UNSCOPED_RULES)
def test_unscoped_rule_must_not_have_paths(tmp_path, name):
    _toolkit_tree(tmp_path)
    _write(tmp_path, f"rules/{name}", _scoped("py"))
    problems = _problems(tmp_path)
    assert f"rules/{name}: unscoped rule must not have `paths:` frontmatter" in problems


def test_markdown_scoped_rule_passes_the_technology_check(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/jois-comms-documents.md", _scoped("md"))
    assert _problems(tmp_path) == []


def _item(version='"1.0.0"', last_updated='"2026-10-14"', extra=""):
    lines = ["---"]
    if version is not None or last_updated is not None:
        lines.append("metadata:")
        if version is not None:
            lines.append(f"  version: {version}")
        if last_updated is not None:
            lines.append(f"  last_updated: {last_updated}")
    lines += [extra, "---", "Body", ""] if extra else ["---", "Body", ""]
    return "\n".join(lines)


def test_missing_and_malformed_versions_are_named(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/a.md", _item(None, None, 'paths:\n  - "**/*.toml"'))
    _write(tmp_path, "rules/b.md", _item('"v2"', '"2026-10-14"', 'paths:\n  - "**/*.yml"'))
    _write(tmp_path, "rules/c.md", _item('"1.0"', '"2026-10-14"', 'paths:\n  - "**/*.md"'))
    _write(tmp_path, "rules/d.md", _item('"1.0.0"', '"2026-13-40"', 'paths:\n  - "**/*.css"'))
    _write(tmp_path, "rules/e.md", _item('"1.0.0"', None, 'paths:\n  - "**/*.html"'))
    problems = _problems(tmp_path)
    assert "rules/a.md: missing `metadata.version` (semver such as \"1.0.0\")" in problems
    assert any("rules/a.md: missing `metadata.last_updated`" in p for p in problems)
    assert any("rules/b.md: metadata.version 'v2' is not MAJOR.MINOR.PATCH" in p for p in problems)
    assert any("rules/c.md: metadata.version '1.0' is not MAJOR.MINOR.PATCH" in p for p in problems)
    assert any("rules/d.md: metadata.last_updated '2026-13-40' is not a date" in p for p in problems)
    assert any("rules/e.md: missing `metadata.last_updated`" in p for p in problems)


def test_valid_metadata_passes_with_unquoted_values(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/a.md", _item("2.10.3", "2026-10-14", 'paths:\n  - "**/*.toml"'))
    assert _problems(tmp_path) == []


def test_top_level_version_is_rejected(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "rules/a.md", '---\nversion: 1.0.0\npaths:\n  - "**/*.toml"\n---\n')
    problems = _problems(tmp_path)
    assert any(
        p.startswith("rules/a.md: `version:` belongs under `metadata:`") for p in problems
    )


def test_version_is_required_on_skills_agents_and_jois_commands(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "skills/other/SKILL.md", "---\nname: other\n---\n")
    _write(tmp_path, "agents/code-reviewer.md", "---\nname: code-reviewer\n---\n")
    _write(tmp_path, "commands/jois-git/apply.md", "no frontmatter\n")
    _write(tmp_path, "commands/jois-init/opsx.md", f"---\n{HIDDEN}\n---\nbody\n")
    problems = _problems(tmp_path)
    for rel in (
        "skills/other/SKILL.md",
        "agents/code-reviewer.md",
        "commands/jois-git/apply.md",
        "commands/jois-init/opsx.md",
    ):
        assert any(p.startswith(f"{rel}: missing `metadata.version`") for p in problems)


def test_commands_must_be_hidden_from_the_session_listing(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "commands/jois-init/opsx.md", f"---\nname: a\n{HIDDEN}\n{VERSION}\n---\nbody\n")
    _write(tmp_path, "commands/jois-init/sync.md", "---\nname: s\n---\nbody\n")
    _write(
        tmp_path,
        "commands/jois-git/deep/stage.md",
        "---\nname: st\ndisable-model-invocation: false\n---\n",
    )
    problems = _problems(tmp_path)
    assert any(p.startswith("commands/jois-init/sync.md: missing `disable-model-invocation") for p in problems)
    assert any(p.startswith("commands/jois-git/deep/stage.md: missing `disable-model-invocation") for p in problems)
    assert not any(p.startswith("commands/jois-init/opsx.md") for p in problems)


def test_jois_commands_with_a_version_pass(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "commands/jois-git/unversioned.md", f"---\n{HIDDEN}\n---\nbody\n")
    _write(tmp_path, "commands/jois-git/stage.md", f"---\n{HIDDEN}\n{VERSION}\n---\nbody\n")
    problems = _problems(tmp_path)
    assert any(p.startswith("commands/jois-git/unversioned.md: missing `metadata.version`") for p in problems)
    assert not any("jois-git/stage.md" in p for p in problems)


def _pr_command(body):
    return (
        f"---\n{HIDDEN}\n{VERSION}\n---\n# Steps\nown steps\n\n"
        f"## PR body template\n{body}\n\n## Author Verification\nrules\n"
    )


def test_shared_pr_sections_must_match_between_write_and_update_pr(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "commands/jois-git/write-pr.md", _pr_command("same"))
    _write(tmp_path, "commands/jois-git/update-pr.md", _pr_command("changed"))
    problems = _problems(tmp_path)
    assert any(
        "PR body template" in p and "write-pr.md" in p and "update-pr.md" in p for p in problems
    )
    assert not any("Author Verification" in p for p in problems)


def test_identical_shared_pr_sections_pass(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "commands/jois-git/write-pr.md", _pr_command("same").replace("own steps", "a"))
    _write(tmp_path, "commands/jois-git/update-pr.md", _pr_command("same").replace("own steps", "b"))
    assert _problems(tmp_path) == []


def test_shared_pr_check_is_skipped_when_a_command_is_absent(tmp_path):
    _toolkit_tree(tmp_path)
    _write(tmp_path, "commands/jois-git/write-pr.md", _pr_command("same"))
    assert _problems(tmp_path) == []
