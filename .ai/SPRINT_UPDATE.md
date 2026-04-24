# Sprint Update Procedure

Last updated: 2026-04-24

## When to Update Memory

Run `/update` (the AI Memory System Update Agent) after any of:
- New files created or deleted
- New features merged
- Architecture or data flow changes
- New environment variables added
- Integration changes
- Feature status changes (in-progress → complete)

## Update Process

1. **Git diff analysis** — `git diff HEAD~10..HEAD --stat && git diff HEAD~10..HEAD`
2. **Gap identification** — compare diffs to each of the 8 memory files
3. **Surgical edits** — use Edit tool to update only what changed
4. **Timestamp updates** — update `meta.lastUpdated` in JSON files and `Last updated:` in .md files to today's date
5. **JSON validation** — `python3 -m json.tool .ai/ARCHITECTURE.json` etc.
6. **Line count check** — `wc -l .ai/*.md .ai/*.json` — target ~3000 lines total
7. **Commit** — invoke `/commit` command

## File Responsibilities

### ARCHITECTURE.json
Update when:
- New Cloudflare bindings added (KV, R2, D1, AI)
- New external API integrations added
- Deployment targets change
- AI routing strategy changes
- New data flows emerge

### FILES.json
Update when:
- New source files created
- Files deleted or renamed
- File purpose or exports change significantly
- Line counts change substantially (>10%)

### PATTERNS.md
Update when:
- New reusable code patterns emerge across 2+ files
- Existing patterns are refactored
- New best practices are adopted
- New API calling conventions established

### BUSINESS.json
Update when:
- New projects added to manifest
- Feature status changes (planned → in-progress → complete)
- New AI providers or models adopted
- Invoice logic changes
- Env var requirements change

### QUICK.md
Update when:
- New development commands available
- File locations change
- New API endpoints added
- New debugging techniques discovered
- New deployment procedures

### TODO.md
Update when:
- Work completes (move to Completed)
- New tasks identified
- Known issues discovered or resolved
- Priorities shift

### README.md
Update when:
- Major architectural decisions change
- New projects are tracked
- Core stack changes
- Commit history summary needs extending

## JSON Validation Commands

```bash
python3 -m json.tool /Users/dylanburkey/dev/projects/codesidekick-mothership/.ai/ARCHITECTURE.json > /dev/null && echo "OK"
python3 -m json.tool /Users/dylanburkey/dev/projects/codesidekick-mothership/.ai/FILES.json > /dev/null && echo "OK"
python3 -m json.tool /Users/dylanburkey/dev/projects/codesidekick-mothership/.ai/BUSINESS.json > /dev/null && echo "OK"
```

## Line Count Target

Total `.ai/` folder should stay near 3000 lines (+/- 300 is fine).

```bash
wc -l /Users/dylanburkey/dev/projects/codesidekick-mothership/.ai/*.md \
       /Users/dylanburkey/dev/projects/codesidekick-mothership/.ai/*.json
```

## DO NOT

- Create files outside `.ai/` for memory purposes
- Duplicate information across memory files
- Leave `meta.lastUpdated` stale
- Skip JSON validation
- Make assumptions without checking git diffs first
