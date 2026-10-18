# Move from deprecated Groundwork

The original `groundwork` is deprecated for machine setup. Its learning curriculum remains available here. Keep the old checkout and your local configuration until the replacement has passed your own acceptance checks.

## Choose your platform

| Current environment | Maintained repository | Installation boundary |
| --- | --- | --- |
| macOS | [groundwork-mac](https://github.com/jasondockery/groundwork-mac) | Native macOS |
| Non-Omarchy Linux | [groundwork-linux](https://github.com/jasondockery/groundwork-linux) | Supported Linux environment |
| Windows with WSL2 | [groundwork-windows](https://github.com/jasondockery/groundwork-windows) | Inside the same WSL2 distribution, not PowerShell or Git Bash |
| Omarchy on Apple Silicon | [groundwork-omarchy-mac-arm64](https://github.com/jasondockery/groundwork-omarchy-mac-arm64) | A working Omarchy installation on ARM64 |

[groundwork-core](https://github.com/jasondockery/groundwork-core) supplies shared guidance and configuration; do not install it directly. Linux and WSL2 use their own entry points, which prepare a separate `groundwork-mac` checkout as the shared chezmoi engine.

The replacement repositories are public. Follow the destination's HTTPS clone instructions; a GitHub account or SSH key is not required to read them. Private forks still require their owner's access setup.

If you cloned a private `groundwork-*` repository before its public launch on October 18, 2026, clone the public repository into a new directory. The public repositories start with clean histories, so do not force-pull or merge the previous history into them. Keep your old checkout, local edits, and saved answers until acceptance passes, then use the source-selection steps below. For Omarchy, inspect any differences and follow its repository's installer instructions instead of the chezmoi steps.

## Migrate an existing macOS, Linux, or WSL2 installation

1. Run `chezmoi source-path` to locate the actual current source. Inspect its Git status and preserve any uncommitted edits. Keep that checkout and its remote unchanged. Make a private backup of your chezmoi configuration directory, stored profile answers, and local overrides outside both repositories. Keep SSH keys, provider credentials, and application data on the machine.
2. Clone the appropriate entry point into a new directory. On macOS, clone `groundwork-mac` without running its bootstrap for this migration. On Linux or WSL2, inspect the entry point's `bootstrap.sh`, then use `bash bootstrap.sh --prepare-only` to prepare the engine without applying configuration.
3. Preview using your existing chezmoi answers. Set `new_engine` to the engine's absolute path:

   ```bash
   new_engine="$HOME/code/groundwork-mac"
   chezmoi --source "$new_engine" diff
   ```

   Inspect the engine's `home/run_*` scripts too: a file diff cannot preview every package or OS change. Confirm `reset_existing_configs` is false unless you deliberately want the documented reset. Do not run `chezmoi init --prompt`, copy the old `home/` tree over the new one, or force through conflicts.
4. After reviewing those changes, apply explicitly with `chezmoi --source "$new_engine" apply`. If it fails, stop and retain the error. Do not run `update-all` against the old source during repair.
5. Open a fresh terminal. Check shell startup, Git identity and SSH access, local overrides, the selected multiplexer, Omarchy-aligned shortcuts, T3 Code Nightly, Herdr, and a small authenticated provider task. Follow the destination's Tailscale guide and test the remote connections you need in both directions. Do not run `groundwork-configure` during this temporary-source acceptance: it uses the saved source, which still points to the old checkout.
6. Once acceptance passes, use `chezmoi edit-config` to change only the root `sourceDir` to the new engine. Preserve stored data and unrelated fields. Confirm `chezmoi source-path` and `chezmoi diff` now use that engine before running `update-all` again. After that confirmation, existing tmux users can choose Both through `groundwork-configure` to retain tmux while trying Herdr.

The detailed recovery and ownership procedure lives in the [shared migration guide](https://github.com/jasondockery/groundwork-core/blob/main/docs/migrating-from-groundwork.md). Linux and WSL2 also have platform-specific migration instructions in their entry-point repositories.

If acceptance fails, retain both checkouts and restore your previous source selection from the private backup. Review the old source's diff before reapplying. Changing `sourceDir` does not undo packages or OS defaults already changed; use the applicable Groundwork restore and OS recovery instructions for those effects.

## Start on Omarchy

There were no supported installations of original Groundwork on Omarchy to migrate. Start from a working Omarchy desktop and follow the maintained ARM64 repository's first-run instructions. Do not run the original Mac bootstrap or apply its chezmoi source on Omarchy. The old `omarchy-groundwork` repository is superseded too.

## Keep history and curriculum separate

Keep this original checkout for lessons or recovery until you no longer need it. Do not merge its Git history into a replacement repository or rename its remote to bypass migration. Fresh histories in the maintained repositories are intentional. Later retirement of this original repository is a separate decision.
