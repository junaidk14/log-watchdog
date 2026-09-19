# Issue tracker: GitHub

Issues and specs live in junaidk14/log-watchdog.
Use the gh CLI from this repository.

- Create: gh issue create --title "..." --body-file <file>
- Read: gh issue view <number> --comments
- List: gh issue list --state open
- Comment: gh issue comment <number> --body-file <file>
- Label: gh issue edit <number> --add-label "..."
- Remove label: gh issue edit <number> --remove-label "..."
- Close: gh issue close <number>

Use UTF-8 files with actual newlines for multiline bodies.
"Publish to the issue tracker" means create a GitHub issue.
"Fetch the relevant ticket" means read the issue and its comments.

PRs as a request surface: no.
