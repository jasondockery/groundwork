rendered="$1"
tool_bin="$2"
shell_home="$3"
fixture="$4"
output_dir="$5"

export HOME="$shell_home"
export TERM=xterm-256color
# A rendered interactive shell file contains deliberately conditional startup
# probes. Source it without errexit, then fail closed while exercising the
# developer-facing commands themselves.
set +e
source "$rendered"
setopt pipefail
export PATH="$tool_bin:$PATH"
cd "$fixture" || { print -u2 'fixture directory unavailable'; exit 1; }

# Aliases are expanded when zsh parses a command, so evaluate these two only
# after the rendered startup file has defined them.
eval 'rgh --files' | sort >"$output_dir/rgh-surface" || { print -u2 'rgh surface failed'; exit 1; }
eval 'fdh --type f .' | sed 's#^\./##' | sort >"$output_dir/fdh-surface" || { print -u2 'fdh surface failed'; exit 1; }
lt >"$output_dir/lt-surface" || { print -u2 'lt surface failed'; exit 1; }
lt src >"$output_dir/lt-src-surface" || { print -u2 'lt src surface failed'; exit 1; }
ltt >"$output_dir/ltt-surface" || { print -u2 'ltt surface failed'; exit 1; }
rgf example >"$output_dir/rgf-surface" || { print -u2 'rgf surface failed'; exit 1; }
