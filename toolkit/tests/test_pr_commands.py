from pathlib import Path

import pytest

TOOLKIT = Path(__file__).resolve().parents[1]
PR_COMMANDS = ["write-pr.md", "update-pr.md"]


def _text(name):
    return (TOOLKIT / "commands" / "jois-git" / name).read_text(encoding="utf-8")


def _sources_section(name):
    return _text(name).split("### Sources of a bullet", 1)[1].split("\n### Missing verification", 1)[0]


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_an_openspec_change_still_gives_its_tasks_md_results(name):
    sources = _sources_section(name)

    assert "A group whose commits touch an OpenSpec change also reads that change's `tasks.md`." in sources
    assert "Source `tasks.md N.N, result recorded`." in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_author_verification_reads_the_slice_result_files(name):
    sources = _sources_section(name)

    assert "Glob `**/slices/*/validation.md`, `**/slices/*/validation.partial.md` and `**/slices/*/review.md`" in sources
    assert "`Tested commit:` in a validation file, `Reviewed commit:` in `review.md`" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_slice_results_count_only_for_a_commit_on_this_branch(name):
    sources = _sources_section(name)

    assert "`git merge-base --is-ancestor <commit> HEAD` succeeds" in sources
    assert "`git merge-base --is-ancestor <commit> origin/<base>` fails" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_out_of_date_slice_results_give_no_bullet(name):
    sources = _sources_section(name)

    assert "lists only paths under `wiki/`" in sources
    assert "tell the user the file is out of date" in sources
    assert "write no bullet from it" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_an_unvalidated_slice_is_reported_with_its_failing_claims(name):
    sources = _sources_section(name)

    assert "| `validation.md` with `Validated: no` |" in sources
    assert "one sub-bullet per claim that is not `met`" in sources
    assert "never call a slice validated that the file does not" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_review_bullet_lists_what_was_known_and_not_fixed(name):
    sources = _sources_section(name)

    assert "| `review.md` with `Review: run` |" in sources
    assert "one sub-bullet per line under `## Known, not fixed`" in sources
    assert "| `review.md` with `Review: not run` |" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_bullets_are_tagged_with_the_slice_file_they_came_from(name):
    tags = _text(name).split("### Sources\n", 1)[1]

    for tag in ["`validation.md`", "`validation.partial.md`", "`review.md`", "`ARCHIVED.md`", "`chat`", "`user`"]:
        assert f"- {tag}" in tags


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_a_reduced_slice_gives_its_evidence_from_archived_md(name):
    sources = _sources_section(name)

    assert "glob `**/slices/*/ARCHIVED.md`" in sources
    assert "| `ARCHIVED.md` |" in sources
    assert "holds no current `validation.md` and no current `review.md`" in sources
    assert "(tested commit, run, claim counts)" in sources
    assert "(status, reviewed commit, fix rounds, checks)" in sources
    assert "Source `ARCHIVED.md`." in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_known_lines_moved_to_the_wiki_are_read_through_their_link(name):
    sources = _sources_section(name)

    assert "`### Known, not fixed` and `### Not fixed by design`" in sources
    assert "one link to a wiki page, written `See [<heading>](<path>#<anchor>)`" in sources
    assert "such as `See [Known limits](<path>#known-limits)`" in sources
    assert "read the lines under the linked heading" in sources
    assert "If the file or heading is missing, write the link as the sub-bullet and say the lines could not be read" in sources


@pytest.mark.parametrize("name", PR_COMMANDS)
def test_a_current_result_file_still_comes_before_archived_md(name):
    sources = _sources_section(name)

    assert "it comes after a current `validation.md` or `review.md`" in sources
    assert "read that file as above and take from `ARCHIVED.md` only what the folder lacks" in sources


def test_both_commands_share_the_same_result_file_section():
    assert _sources_section("write-pr.md") == _sources_section("update-pr.md")
