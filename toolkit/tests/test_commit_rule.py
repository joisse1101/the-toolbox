from pathlib import Path

TOOLKIT = Path(__file__).resolve().parents[1]
RULE = TOOLKIT / "rules" / "jois-git-commit-hygiene.md"
OPSX = TOOLKIT / "commands" / "jois-init" / "opsx.md"


def _section(text, header):
    body = text.split(f"## {header}\n", 1)[1]
    return body.split("\n## ", 1)[0]


def test_rule_names_a_push_as_needing_the_word():
    push = _section(RULE.read_text(encoding="utf-8"), "Push")
    assert "`git push` needs the user's confirmation word, in every flow" in push


def test_rule_apply_clause_is_general_and_never_pushes():
    text = RULE.read_text(encoding="utf-8")
    assert "## One exception" not in text
    clause = _section(text, "Apply flows")
    assert "never pushes" in clause
    assert "/jois-code:apply" not in clause
    assert "opsx:apply" not in clause


def test_apply_guidance_commits_and_does_not_stop():
    text = OPSX.read_text(encoding="utf-8")
    apply_block = text.split("### `operations.apply.guidance`", 1)[1].split("### ", 1)[0]
    assert "Commit a finished concern without asking for a confirmation word" in apply_block
    assert "Never push" in apply_block
    assert "end the turn" not in apply_block
    assert "name a confirmation word" not in apply_block


def test_archive_guidance_still_stops():
    text = OPSX.read_text(encoding="utf-8")
    archive_block = text.split("### `operations.archive.guidance`", 1)[1].split("### ", 1)[0]
    assert "name a confirmation word, and end the turn" in archive_block
