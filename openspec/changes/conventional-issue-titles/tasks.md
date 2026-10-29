## 1. Command

- [x] 1.1 In `toolkit/commands/jois-git/write-issue.md` step 5, replace the plain-title sentence with the `type(scope): subject` rule: the eleven types, defaults `fix` (bug), `feat` (feature) and `chore` (task), another type when it fits, optional scope never invented, lowercase imperative subject with no trailing period
- [x] 1.2 In step 7, search the key terms of the subject and summary, not the type or scope
- [x] 1.3 Keep the step 9 rule that the title has no quotes or `$`
- [x] 1.4 Bump `metadata.version` to 1.1.0 and set `last_updated`

## 2. Docs

- [x] 2.1 Mention the conventional title in the `/jois-git:write-issue` entry of `toolkit/README.md` (one clause)

## 3. Verify

- [x] 3.1 Run `cd toolkit; python check_toolkit.py; python -m pytest`
- [x] 3.2 Run `openspec validate conventional-issue-titles` and confirm the command file, the delta spec and the checker agree
