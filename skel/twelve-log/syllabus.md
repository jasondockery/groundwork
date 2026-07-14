# Groundwork Twelve — syllabus (machine-readable)

Source of truth for schedulers (human or agent). 12 stages; each has 5 core
sessions, a build, and a gate check. Progression is gate-passed, not
calendar-based. Full session detail lives on the docs page:
https://jasondockery.github.io/groundwork/groundwork-twelve.html

Session slots: drill 20m (spaced repeat of an earlier skill: ~2 days, ~1 week,
~3 weeks after first learned), new 25m, do 10m, log 5m.
Every drill names the skill it repeats, e.g. `drill: S11 (sessions/windows/panes)`.
The code is for schedulers; the name is for you — mid-course you should never
have to page back through earlier sessions to find out what today's drill is.
Agent phases: stages 1-3 explainer, 4-6 reviewer, 7-9 bounded pair, 10-12 delegate.
Paces: steady ~1h/day (stage/week), committed 2-4h/day (stage per 3-4 days),
immersed 8-12h/day (stage per 1.5-2 days; two core sessions/day maximum,
extra hours go to drills, games, build, and exploration).

## Stage 1 — Keyboard, terminal, and your log (reading: getting-started)
- S1: pwd/ls/cd/mkdir/touch; create log repo (git init ritual)
- S2: line editing keys; walk-the-tree drill | drill: S1 (pwd/ls/cd/mkdir/touch) commands
- S3: mv/cp/rm -i; deliberate mistake + recreate | drill: S2 (line editing keys) | game: bashcrawl
- S4: history Ctrl+R; man/--help; survival kit | drill: S3 (mv/cp/rm -i)
- S5: tmux first contact: split, move, detach, attach | drill: S4 (history Ctrl+R)
- Build: repeatable workspace + workspace.md
- Gate: navigate/create/move/delete; Ctrl+R recall; tmux split+detach+attach; daily commits
- Deeper: bashcrawl full clear; Bandit 0-5; workspace from memory; command journal

## Stage 2 — The daily drivers (reading: shell)
- S6: eza (ll/lt), bat; map a cloned repo | drill: S5 (tmux first contact: split, move, detach,…)
- S7: rg smart-case, -t, rgf | drill: S3 (mv/cp/rm -i)
- S8: fd; zoxide z | drill: S7 (rg smart-case, -t, rgf)
- S9: fzf Ctrl+T / Alt+C; find-search-read loop | drill: S8 (fd)
- S10: atuin history; build cheatsheet.md from real history | drill: S9 (fzf Ctrl+T / Alt+C)
- Build: agent-written scavenger hunt (hunt.md) OR clmystery case notes
- Gate: find file/string in unknown repo; z between projects; history resurrection
- Deeper: Bandit 6-12; both build flavors; speed-run hunt; map an admired repo

## Stage 3 — tmux and the machine (reading: tmux, macos, keyboard)
- S11: sessions/windows/panes full model | drill: S10 (atuin history)
- S12: detach persistence; sesh switcher | drill: S9 (fzf Ctrl+T / Alt+C)
- S13: copy mode + scrollback search | drill: S11 (sessions/windows/panes full model)
- S14: desktop layer: app switch, Raycast snaps (or WM equivalents) | drill: S12 (detach persistence)
- S15: consolidation; keymap.md from memory | drill: shortcut reps
- Build: workspace-as-code script or sesh entry
- Gate: cold start to workspace in one command; no-mouse app movement; detach mid-work
- Deeper: annotate tmux.conf; 3 sesh entries; no-mouse day; keymap new-game+

## Stage 4 — Git for real (reading: git) [phase: reviewer]
- S16: status/diff/add -p; honest messages; explain the git init ritual from S1 | drill: stage-3 build + S13 (copy mode + scrollback search)
- S17: branches: create/switch/merge | drill: S16 (status/diff/add -p) | game: Learn Git Branching
- S18: log/show/lazygit; history questions | drill: S17 (branches: create/switch/merge)
- S19: restore/revert/reset; break 3 ways, recover 3 ways | drill: S18 (log/show/lazygit)
- S20: first examiner session; gate check | drill: S19 (restore/revert/reset) | game: git-game
- Build: 8+ atomic commits incl. documented mistake + recovery
- Gate: stage half a file; explain HEAD; three undo kinds; branch+merge cold
- Deeper: LGB main sequence; git-game complete; Oh My Git!; reflog rescue scenario

## Stage 5 — The editor (reading: neovim; or your editor's equivalents)
- S21: vimtutor movement; pure motion practice | drill: S16 (status/diff/add -p)
- S22: verbs: ciw/dd/yy/u | drill: S21 (vimtutor movement) | game: Vim Adventures
- S23: search//, substitute, splits | drill: S22 (verbs: ciw/dd/yy/u)
- S24: LazyVim layer: Space menu, fuzzy open | drill: S23 (search//, substitute, splits)
- S25: editor+tmux one grid (Alt-hjkl); gate check | drill: motion+verb kata
- Build: keyboard-only repo refactor, atomic commits
- Gate: five edits no arrows/mouse; fuzzy-open anything; pane movement automatic
- Deeper: vimtutor complete; second repo refactor; one macro; half-keystroke new-game+

## Stage 6 — Pipes, scripts, publishing (reading: command-line, git remotes)
- S26: pipes: wc/sort/uniq/head on the log | drill: S25 (editor+tmux one grid (Alt-hjkl))
- S27: first script + shellcheck | drill: S26 (pipes: wc/sort/uniq/head on the log)
- S28: variables/loops/if; harden workspace opener | drill: S19 (restore/revert/reset)
- S29: gh: push repo, README | drill: S27-28 (first script + shellcheck + variables/loops/if)
- S30: PR flow: branch/push/pr/delta/merge; gate | drill: S17 (branches: create/switch/merge)
- Build: a real CLI tool, shellcheck-clean, landed by PR
- Gate: pipeline from scratch; write+lint script; PR without docs
- Deeper: Bandit 13-20; second tool or flags+help; shellcheck something wild

## Stage 7 — Programming by hand (python via uv) [phase: bounded pair]
- S31: REPL, variables, types | drill: S30 (PR flow: branch/push/pr/delta/merge)
- S32: if/for — the wall; five loop exercises | drill: S31 (REPL, variables, types)
- S33: the wall again; lists/dicts; tracebacks bottom-up | drill: S32 (if/for — the wall) blank-file
- S34: functions; extract logstats.py | drill: S32-33 (if/for — the wall + the wall again) kata
- S35: pytest red->green by hand; gate | drill: S34 (functions)
- Build: log analyzer with tests, by hand; agent reviews after
- Gate: loop/dict/function from blank file; failing test to green; read a traceback
- Deeper: Exercism python batch; rebuild logstats blind; teach-back in log

## Stage 8 — Data: tables and documents (reading: data)
- S36: files in/out; logstats reads real log.md | drill: S35 (pytest red->green by hand)
- S37: JSON + jq; export log.json, query 3 ways | drill: S26 (pipes: wc/sort/uniq/head on the log)
- S38: sqlite3: CREATE/INSERT/SELECT/WHERE/GROUP BY | drill: S37 (JSON + jq) | SQLBolt 1-6
- S39: UPDATE/DELETE with SELECT twin; JOIN intro; break rule on a copy | drill: S38 (sqlite3: CREATE/INSERT/SELECT/WHERE/GROUP BY)
- S40: tables vs documents; access-pattern thinking (DynamoDB-style); gate | drill: SQL+jq
- Build: log.md -> parser -> log.db -> report.py, tested; backup first
- Gate: table+query from memory; SELECT-before-write unprompted; shapes in 2 sentences
- Deeper: SQLBolt complete; two-table domain model + JOINs; JSON re-model; explore a real .db

## Stage 9 — The web: HTTP and a real app
- S41: localhost/ports; curl + jq an API | drill: S38 (sqlite3: CREATE/INSERT/SELECT/WHERE/GROUP BY)
- S42: HTTP from python; status codes; store to db | drill: S39 (UPDATE/DELETE with SELECT twin)
- S43: smallest local server; serve one endpoint from db | drill: S33 (the wall again)
- S44: minimal HTML page over the data | drill: S43 (smallest local server)
- S45: read one file of a real codebase; 5 sentences; gate | drill: S34 (functions)
- Build: local app (web or TUI) on log.db + one external fetch
- Gate: explain request/response; fetch-store-serve one datum; orient in unknown code
- Deeper: second source+endpoint; failure injection; diagram a real app's request path

## Stage 10 — Directing agents on narrow work (reading: editors-ai)
- S46: the loop as conscious cycle; reject a plan | drill: S43 (smallest local server)
- S47: red test by you, green by agent | drill: S35 (pytest red->green by hand)
- S48: visual targets vs prose, same task | drill: S46 (the loop as conscious cycle)
- S49: budget: /context /usage; pollute+restart experiment | drill: S47 (red test by you, green by agent)
- S50: risk-naming reviews; gate | drill: S48 (visual targets vs prose, same task)
- Build: agent-assisted feature + verification.md
- Gate: full loop no skips; red test an agent can run with; smell polluted context
- Deeper: two-prompt A/B; parallel agents taste; reread stage-1 log

## Stage 11 — Repo scale: specs, delegation, verification (reading: agents, new-project) [phase: delegate]
- S51: AGENTS.md for your app; cold-session test | drill: S50 (risk-naming reviews)
- S52: plan-first delegation; verify plan vs reality | drill: S49 (budget: /context /usage)
- S53: security pass; agent attacks own work, you verify | drill: S39 (UPDATE/DELETE with SELECT twin)
- S54: clone unfamiliar repo; write spec+checklist only | drill: S45 (read one file of a real codebase)
- S55: /rewind, revert, session abandonment; start knowledge base; gate | drill: S19 (restore/revert/reset)
- Build: the unfamiliar-repo task, delegated + fully verified
- Gate: AGENTS.md works cold; catch plan divergence; safety habits fire unprompted
- Deeper: second foreign repo; AGENTS.md for it; second adversarial round

## Stage 12 — Capstone
- S56: spec: goals, invariants, storage shape, done-proof | drill: examiner's pick
- S57-59: build slices: direct, verify, honest log | drill: weakest skill, 5m
- S60: harden: tests, security, README, backup; final gate
- Build: ship + the explanation write-up (what/how verified/agent vs you/differently)
- Gate: capstone shipped with verification story a stranger could follow
- Deeper: stretch goals; rebuild stage-6 tool in half the time; letter to Day-1 you
