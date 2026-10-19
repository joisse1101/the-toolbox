## 1. Commands

- [x] 1.1 Add `.claude/commands/story/re-read.md` (frontmatter `description`, `allowed-tools: mcp__story-tools__read_context`) implementing the Re-read command requirement
- [x] 1.2 Add `.claude/commands/story/review.md` (`allowed-tools: mcp__story-tools__read_context, mcp__story-tools__check_drafts`) implementing the Review command requirement, with the fixed session scope and the grouped checklist

## 2. Docs

- [x] 2.1 Add a short note on both commands to the shape-session paragraph of `CLAUDE.md`
- [x] 2.2 Mention both commands in the `shape-stories.ps1` header comment

## 3. Check

- [ ] 3.1 Try both in a shape session: edit a proposal in the portal, run `/story:re-read`; run `/story:review` with one unwritten agreed edit and one open lexicon suggestion
