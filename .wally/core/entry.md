# SOP task routing

First read `.wally/core/scope.md` to classify the current request. Handle consultation, read-only analysis, unrelated conversation and lightweight documentation directly; an existing or missing branch task does not activate SOP. Use the routing below only for development requests or explicit requests to start/resume SOP.

Match the current Git branch against the Branch field in `.wally/plans/*/00-overview.md`. Read only discovery metadata until the task is identified; do not load other tasks.

- Unversioned historical task: read `.wally/compat/v1/CODEBUDDY.md`, or the snapshotted AGENTS.md/CLAUDE.md. Resolve old review/commit/docs/template/Clarify references against this snapshot while executing tools in the actual repository. Never mix current rules into an old contract. A missing snapshot blocks recovery; do not migrate implicitly.
- Versioned task: read workflow.md under the task's bound SOP Rules path, then its `profile.md`, `_rules/`, and current phase. Implement follows this task's `_rules/rules/` snapshot and does not reread `.wally/rules/` changed afterward. Load gates.md, interaction.md, and relevant project extensions from the same version. Resolve `./` profile links relative to the task. Never substitute the current project profile or another version's template for a task snapshot. Missing bound files are errors, not permission to fall back to the latest version.
- No task: read `.wally/profiles/project.md`. Before starting this SOP, ask whether to cut a new task branch and wait for the answer. Do not bind the task just because the checkout is already a non-default branch. After the user chooses (create and switch, or explicitly stay on the current branch when it is not main/master/HEAD), run `python3 .wally/scripts/create_task.py YYYY-MM-DD_title --branch <chosen-branch>`. The script does not switch branches, run tests, or commit. If this request already names the task branch, follow that choice.

Existing repository instructions and user authorization remain in force. Replaced legacy SOP sections remain available to historical tasks through compat/v1. Resolve substantive conflicts with custom project workflows explicitly.
