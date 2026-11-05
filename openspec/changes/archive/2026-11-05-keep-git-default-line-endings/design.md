# Design

Keep git's Windows default (CRLF working files, LF in the repository) and fix the one place that mixes endings, the skill sync script, by reading every source as LF.

## Context

The index holds LF for every tracked file. A Windows checkout with `core.autocrlf=true` has CRLF working files, except the two fixture folders that `.gitattributes` pins to LF. `sync-skill-logic.mjs` reads files with `fs.readFileSync(file, 'utf8')` and writes `// GENERATED. ...\n` or `<!-- GENERATED. ... -->\n\n` in front of the body, so a CRLF body gives a file that mixes LF and CRLF.

Git does not convert a file that has a lone LF when `text=auto` is in effect, so such a copy is committed with its carriage returns and shows as a change. The measurement is in proposal.md and under the decisions below. `planner/test/skill-sync.test.mjs` already compares lines through its own `readLf` helper, so the drift test passes in a CRLF checkout; a new test is needed to catch the script mixing or mis-setting endings.

## Goals / Non-Goals

**Goals:**
- The script gives each copy the line ending of its checkout, never a mix.
- Running the script in a CRLF checkout leaves `git status` clean.
- Each user's `core.autocrlf` stays theirs to choose.

**Non-Goals:**
- Forcing LF or CRLF on checkouts with `.gitattributes` or `.editorconfig`.
- A guard test for line endings.
- Changing the CSV writer's CRLF output.
- Setting any user's `core.autocrlf` or writing LF into a CRLF checkout.
- Changing any user's git settings.

## Decisions

### The script writes its source's line ending

The script reads each source as LF, builds the copy with `\n`, and changes every `\n` to `\r\n` when that source had CRLF. A copy then has one line ending throughout and the same line ending as its checkout, which is what git expects of a file in that checkout, so git converts it to the index's LF on add and reports no change.

This was measured in a CRLF checkout. With the first fix the script wrote pure LF copies. Their content equalled the index (`git diff` empty, `git hash-object` equal), yet `git status` listed 63 of them as modified, because their stored size no longer matched and git did not clear it. Rewriting one such file as CRLF made it drop off the list. Writing pure LF everywhere was rejected for that reason. Skipping files that already match was rejected because it adds a compare step for a problem that writing the right ending avoids. A machine-wide `core.autocrlf=input` was rejected because the user keeps CRLF working files.

### `.gitattributes` is unchanged

The two fixture pins stay because tests match fixture text with `\n`. A blanket `eol=lf` rule was rejected: it would override each user's setting to cure a problem that only the script causes, and the measurement shows the rest of the repo behaves in a CRLF checkout.

### The test runs the script on CRLF and LF sources

It copies `scripts/`, `logic/` and `guidelines/` into a temp folder twice, once as LF and once rewritten as CRLF, and runs the copied script on each. It asserts that every line of every CRLF-run output ends in CRLF with no lone LF, that each CRLF-run output equals the LF-run output once CRLF is read as LF, and that the LF-run outputs have no `\r`. It fails on a script that mixes endings.

### One local re-checkout

This worktree was converted to LF by an earlier attempt. One rewrite of the working files from the index, on a clean tree, makes it CRLF again under the user's setting. It changes no commit.

## Risks / Trade-offs

The re-checkout rewrites most working files, so uncommitted work would be lost. It runs only on a clean tree, after the earlier groups are committed.

A machine with `core.autocrlf=input` or `false` has LF files, and the script's output is the same there, so nothing changes for it.
