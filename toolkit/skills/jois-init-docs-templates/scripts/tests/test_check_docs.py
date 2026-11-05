# jois-init:docs begin
import subprocess
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import check_docs  # noqa: E402

DEEP = "wiki/architecture/billing/refunds.md"
LIFECYCLE = "wiki/architecture/orders/lifecycle.md"
INVOICES = "wiki/architecture/billing/invoices.md"


def _file(root, relative, text="# Title\n"):
    path = root / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    return path


def _links(*pages):
    return "".join(f"- [{page}]({page})\n" for page in pages)


def _nav(root, home, sidebar):
    """Write `Home.md` and `_Sidebar.md` by hand, each linking the given pages (relative to `wiki/`)."""
    _file(root, "wiki/Home.md", "# Home\n\n" + _links(*home))
    _file(root, "wiki/_Sidebar.md", "# Contents\n\n" + _links(*sidebar))


def _tree(root):
    """A minimal passing repo: a page two folders deep, its code file, hand-written navigation."""
    _file(root, DEEP, "# Refunds\n\nSee [states](../orders/lifecycle.md#states).\nCode: `src/billing/refund.py`.\n")
    _file(root, "wiki/architecture/orders/lifecycle.md", "# Order lifecycle\n")
    _file(root, "src/billing/refund.py", "")
    _file(root, "CLAUDE.md", "# Project\n")
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")  # not alphabetical
    _nav(root, pages, pages)
    return root


def _problems(root):
    return check_docs.check_docs(root)


def test_minimal_tree_passes(tmp_path, capsys):
    _tree(tmp_path)
    assert _problems(tmp_path) == []
    assert check_docs.main(["--root", str(tmp_path)]) == 0
    assert "docs check passed" in capsys.readouterr().out


def test_broken_link_two_folders_deep_names_page_line_and_link(tmp_path, capsys):
    _tree(tmp_path)
    _file(tmp_path, DEEP, "# Refunds\n\nSee [gone](../orders/missing.md).\n")
    assert check_docs.main(["--root", str(tmp_path)]) == 1
    assert f"{DEEP}:3: broken link '../orders/missing.md'" in capsys.readouterr().out


def test_missing_code_path_in_a_nested_page(tmp_path):
    _tree(tmp_path)
    (tmp_path / "src/billing/refund.py").unlink()
    assert f"{DEEP}:4: path 'src/billing/refund.py' does not exist" in _problems(tmp_path)


def test_git_ignored_path_and_ignore_marker_are_exempt(tmp_path):
    _tree(tmp_path)
    (tmp_path / "src/billing/refund.py").unlink()
    subprocess.run(["git", "init", "-q", str(tmp_path)], check=True)
    _file(tmp_path, ".gitignore", "src/billing/\n")
    assert _problems(tmp_path) == []
    (tmp_path / ".gitignore").unlink()
    _file(tmp_path, DEEP, "# Refunds\n\nSee [s](../orders/lifecycle.md). `src/billing/refund.py` <!-- docs-check: ignore -->\n")
    assert _problems(tmp_path) == []


def test_paths_inside_code_fences_are_not_checked(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, DEEP, "# Refunds\n\n```\n`src/none/there.py`\n```\n")
    assert _problems(tmp_path) == []


def test_orphan_nested_page_is_reported(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, INVOICES)
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")
    _nav(tmp_path, pages, pages + ("architecture/billing/invoices.md",))
    assert _problems(tmp_path) == [
        "wiki/architecture/billing/invoices.md:1: orphan page, not linked from Home.md"
    ]


def test_root_claude_md_over_budget(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, "CLAUDE.md", "line\n" * (check_docs.ROOT_CLAUDE_LIMIT + 1))
    assert any(p.startswith("CLAUDE.md:") and "over the 200-line limit" in p for p in _problems(tmp_path))


def test_nested_claude_md_over_budget_and_within_budget(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, "src/CLAUDE.md", "line\n" * check_docs.NESTED_CLAUDE_LIMIT)
    assert _problems(tmp_path) == []
    _file(tmp_path, "src/CLAUDE.md", "line\n" * (check_docs.NESTED_CLAUDE_LIMIT + 1))
    assert any(p.startswith("src/CLAUDE.md:") and "over the 100-line limit" in p for p in _problems(tmp_path))


def test_page_linked_twice_from_the_sidebar_names_page_and_sidebar(tmp_path):
    _tree(tmp_path)
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")
    _nav(tmp_path, pages, pages + ("architecture/orders/lifecycle.md",))
    assert _problems(tmp_path) == [
        "wiki/_Sidebar.md:5: page 'architecture/orders/lifecycle.md' is linked more than once"
    ]


def test_page_missing_from_the_sidebar_is_reported_once(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, INVOICES)
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")
    _nav(tmp_path, pages + ("architecture/billing/invoices.md",), pages)
    assert _problems(tmp_path) == [
        "wiki/architecture/billing/invoices.md:1: page not linked from _Sidebar.md"
    ]


def test_broken_sidebar_link_names_sidebar_line_and_link_once(tmp_path):
    _tree(tmp_path)
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")
    _nav(tmp_path, pages, pages + ("architecture/gone.md",))
    assert _problems(tmp_path) == ["wiki/_Sidebar.md:5: broken link 'architecture/gone.md'"]


def test_sidebar_linking_home_fails_naming_the_sidebar(tmp_path):
    _tree(tmp_path)
    pages = ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md")
    _nav(tmp_path, pages, ("Home.md",) + pages)
    problems = _problems(tmp_path)
    assert len(problems) == 1 and problems[0].startswith("wiki/_Sidebar.md:3:") and "Home.md" in problems[0]


def test_sidebar_in_reading_order_passes(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, INVOICES)
    home = ("architecture/billing/invoices.md", "architecture/billing/refunds.md", "architecture/orders/lifecycle.md")
    _nav(tmp_path, home, ("architecture/orders/lifecycle.md", "architecture/billing/refunds.md", "architecture/billing/invoices.md"))
    assert _problems(tmp_path) == []


def test_missing_sidebar_is_reported(tmp_path):
    _tree(tmp_path)
    (tmp_path / "wiki/_Sidebar.md").unlink()
    assert "wiki/_Sidebar.md:1: sidebar not found" in _problems(tmp_path)


def test_nested_claude_md_link_to_a_missing_wiki_page_names_file_and_line(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, "src/CLAUDE.md", "# Src\n\nSee [gone](../wiki/Missing.md).\n")
    assert _problems(tmp_path) == ["src/CLAUDE.md:3: broken wiki link '../wiki/Missing.md'"]


def test_claude_md_links_to_existing_wiki_page_and_outside_wiki_pass(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, "src/CLAUDE.md", "# Src\n\n[a](../wiki/Home.md#top) [b](../README.md) [c](https://x.dev/wiki/y.md)\n")
    assert _problems(tmp_path) == []


def test_image_file_is_not_published(tmp_path):
    _tree(tmp_path)
    (tmp_path / "wiki/architecture/billing/flow.png").write_bytes(b"\x89PNG")
    assert "wiki/architecture/billing/flow.png:1: not published, only .md files reach the wiki" in _problems(tmp_path)


def test_flat_name_collision_is_reported(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, "wiki/a-b.md")
    _file(tmp_path, "wiki/a/b.md")
    problems = _problems(tmp_path)
    assert len(problems) == 1 and "a-b.md" in problems[0] and "a/b.md" in problems[0]


WORKFLOW = ".github/workflows/wiki-publish.yml"
TEMPLATE_DIR = Path(__file__).resolve().parents[2]
TEMPLATE_WORKFLOW = TEMPLATE_DIR / "workflows" / "wiki-publish.yml"

# Installed in a project, the scripts sit in the project's own scripts/ folder, so the
# template's workflows/, wiki/ and routing files are not beside them. Those tests then skip.
needs_template_folder = pytest.mark.skipif(
    not (TEMPLATE_DIR / "workflows").is_dir(),
    reason="runs only inside the template folder, which holds workflows/, wiki/ and the routing block",
)


@needs_template_folder
def test_shipped_workflow_template_passes(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, WORKFLOW, TEMPLATE_WORKFLOW.read_text(encoding="utf-8"))
    assert _problems(tmp_path) == []


def test_plain_rsync_workflow_fails_naming_the_file(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, WORKFLOW, "jobs:\n  publish:\n    steps:\n      - run: rsync -a wiki/ out/\n")
    problems = _problems(tmp_path)
    assert len(problems) == 1
    assert problems[0].startswith(f"{WORKFLOW}:1:") and "unrewritten" in problems[0]


def test_builder_named_only_in_a_comment_fails(tmp_path):
    _tree(tmp_path)
    _file(tmp_path, WORKFLOW, "# run python scripts/build_wiki.py --out dir\njobs: {}\n")
    assert any(p.startswith(f"{WORKFLOW}:") for p in _problems(tmp_path))


def test_absent_workflow_passes(tmp_path):
    _tree(tmp_path)
    assert not (tmp_path / WORKFLOW).exists()
    assert _problems(tmp_path) == []


STARTER_WIKI = TEMPLATE_DIR / "wiki"
STARTER_ROUTING = TEMPLATE_DIR / "claude-md-routing.md"


def _copy_starter(root):
    for name in ("Home.md", "_Sidebar.md"):
        _file(root, f"wiki/{name}", (STARTER_WIKI / name).read_text(encoding="utf-8"))


@needs_template_folder
def test_starter_wiki_passes_the_checker_in_an_empty_tree(tmp_path, capsys):
    _copy_starter(tmp_path)
    assert _problems(tmp_path) == []
    assert check_docs.main(["--root", str(tmp_path)]) == 0
    assert "docs check passed" in capsys.readouterr().out


@needs_template_folder
def test_starter_routing_block_links_only_pages_the_starter_holds(tmp_path):
    _copy_starter(tmp_path)
    _file(tmp_path, "CLAUDE.md", STARTER_ROUTING.read_text(encoding="utf-8"))
    assert check_docs.check_claude_wiki_links(tmp_path, check_docs.claude_files(tmp_path)) == []
    assert _problems(tmp_path) == []


def test_missing_wiki_folder_fails(tmp_path, capsys):
    assert check_docs.main(["--root", str(tmp_path)]) == 1
    assert "folder not found" in capsys.readouterr().out
# jois-init:docs end
