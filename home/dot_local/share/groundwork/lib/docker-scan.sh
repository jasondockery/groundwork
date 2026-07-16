# shellcheck shell=bash
# Groundwork docker-scan probe — READ-ONLY candidate enumeration, shared by
# groundwork-docker-tidy (dry run, --summary, --yes) and groundwork-doctor.
#
# The ephemeral label (dev.roost.ephemeral=true) is the consent boundary, and
# this scanner honors it BY ENUMERATION: every labeled image is inspected and
# judged individually, never handed as a batch to a broad `docker image
# prune`. One scanner produces one set of facts, so what the dry run lists,
# what --summary counts, what the doctor reports, and what --yes deletes can
# never drift apart.
#
# Verdict vocabulary (exact meanings, shared by every consumer):
#   eligible    passes EVERY check right now: label verified on inspect, a
#               strict-parsed dev.roost.built older than the grace window,
#               every RepoTag inside the scratch namespace (*/scratch:*), and
#               no container (running or stopped) referencing it. Apply
#               re-checks each image immediately before deletion.
#   retained    verified, but dev.roost.built is inside the grace window.
#   protected   a fact refuses deletion: a tag outside the scratch namespace
#               (a scratch image retagged groundwork:latest keeps its label —
#               the tag check is the backstop), or a container reference.
#   unverified  the age cannot be PROVEN: jq is missing, or dev.roost.built
#               is absent or malformed. Unverified is retained and explained,
#               never "probably old". dev.roost.built is the authoritative
#               clock; .Created is diagnostic display only.
#   removed     used by apply alone, and only after docker confirms.
#   missing     the image vanished between listing and inspection.
#
# Usage:  source .../lib/docker-scan.sh
#         gw_docker_scan <max_age_hours>          all labeled images, deduped
#         gw_docker_image_verdict <id> <max_age_hours> <size>
#                                                 one image, fresh facts (the
#                                                 apply-time re-check)
# Record format (one TSV line per image; fields never contain tabs, "-" means
# empty): id, status, reason, tags (comma-joined), built label (raw),
# age_hours, created (diagnostic), size (estimated), container refs.

GW_DOCKER_EPHEMERAL_LABEL="dev.roost.ephemeral"
GW_DOCKER_BUILT_LABEL="dev.roost.built"

# Count the non-empty lines a read-only docker query prints, or say "unknown"
# when the query itself failed. Zero results and a failed query are different
# facts; the old `docker … | count | wc || echo 0` pattern corrupted the value
# under pipefail (the pipeline printed 0 AND the fallback appended another 0)
# and reported a failed daemon as a clean machine.
gw_docker_count() {
  local out
  if out="$(docker "$@" 2>/dev/null)"; then
    printf '%s\n' "$out" | sed '/^$/d' | wc -l | tr -d ' '
  else
    echo unknown
  fi
}

# Read and normalize the shared grace window (hours). Prints the value; prints
# the 72h default and returns 1 when the environment value is not an integer
# in 1-8760 (one hour to one year). Callers decide whether that is fatal
# (tidy refuses to act on a garbled policy) or a warning (the doctor reports).
gw_docker_max_age_hours() {
  local raw="${GROUNDWORK_DOCKER_TIDY_MAX_AGE_HOURS:-72}"
  # Length-gate before arithmetic so a huge digit string cannot overflow, and
  # force base 10 so a leading zero is not read as octal.
  if [[ "$raw" =~ ^[0-9]{1,4}$ ]] && ((10#$raw >= 1 && 10#$raw <= 8760)); then
    printf '%s\n' "$((10#$raw))"
    return 0
  fi
  printf '72\n'
  return 1
}

# Strict parse of the authoritative build clock. Accepts exactly the two forms
# the contract emits — RFC 3339 seconds-precision Zulu (what
# groundwork-docker-build-scratch writes) or a bare date (the documented
# short form) — and prints epoch seconds. Return codes: 1 malformed or
# absent, 2 jq unavailable (age unverifiable on this machine).
gw_docker_built_epoch() {
  local raw="$1" iso epoch
  command -v jq >/dev/null 2>&1 || return 2
  if [[ "$raw" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    iso="${raw}T00:00:00Z"
  elif [[ "$raw" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
    iso="$raw"
  else
    return 1
  fi
  # jq validates the calendar too: 2026-99-99 matches the regex shape but
  # fails fromdateiso8601.
  epoch="$(jq -rn --arg d "$iso" '$d | fromdateiso8601' 2>/dev/null)" || return 1
  [[ "$epoch" =~ ^-?[0-9]+$ ]] || return 1
  printf '%s\n' "$epoch"
}

# Snapshot every container reference (running AND stopped — docker refuses to
# delete an image behind a stopped container, so the scan must refuse too)
# into GW_DOCKER_REFS as "image_id<TAB>name<TAB>state" lines. Refresh before a
# scan and again before each apply-time re-check.
GW_DOCKER_REFS=""
gw_docker_refresh_refs() {
  local cid line
  GW_DOCKER_REFS=""
  while IFS= read -r cid; do
    [[ -n "$cid" ]] || continue
    line="$(docker container inspect \
      --format $'{{.Image}}\t{{.Name}}\t{{.State.Status}}' "$cid" 2>/dev/null)" || continue
    GW_DOCKER_REFS="${GW_DOCKER_REFS}${line}"$'\n'
  done < <(docker ps -aq --no-trunc 2>/dev/null || true)
}

# Judge one image against the full candidate policy and print its record.
# Reads GW_DOCKER_REFS; callers refresh it first.
gw_docker_image_verdict() {
  local id="$1" max_age="$2" size="${3:--}"
  local eph built created tags tag refs="" ref_id ref_name ref_state
  local tags_display="-" built_display="-" age="-" status reason epoch now
  local scratch_bad="" built_state

  if ! docker image inspect --format '{{.Id}}' "$id" >/dev/null 2>&1; then
    printf '%s\t%s\t%s\t-\t-\t-\t-\t%s\t-\n' \
      "$id" missing "no longer present (removed since it was listed)" "$size"
    return 0
  fi

  eph="$(docker image inspect --format "{{index .Config.Labels \"$GW_DOCKER_EPHEMERAL_LABEL\"}}" "$id" 2>/dev/null | head -n 1 || true)"
  built="$(docker image inspect --format "{{index .Config.Labels \"$GW_DOCKER_BUILT_LABEL\"}}" "$id" 2>/dev/null | head -n 1 || true)"
  created="$(docker image inspect --format '{{.Created}}' "$id" 2>/dev/null | head -n 1 || true)"
  tags="$(docker image inspect --format '{{range .RepoTags}}{{println .}}{{end}}' "$id" 2>/dev/null || true)"

  while IFS= read -r tag; do
    [[ -n "$tag" ]] || continue
    if [[ "$tags_display" == "-" ]]; then
      tags_display="$tag"
    else
      tags_display="$tags_display, $tag"
    fi
    # Only the scratch namespace consents to deletion. A labeled image with a
    # tag like groundwork:latest was retagged into a real name; the label
    # survived the retag, so the tag check must refuse independently.
    case "$tag" in
      */scratch:*) ;;
      *) scratch_bad="${scratch_bad:+$scratch_bad, }$tag" ;;
    esac
  done <<<"$tags"

  while IFS=$'\t' read -r ref_id ref_name ref_state; do
    [[ "$ref_id" == "$id" ]] || continue
    ref_name="${ref_name#/}"
    refs="${refs:+$refs, }$ref_name ($ref_state)"
  done <<<"$GW_DOCKER_REFS"

  [[ -n "$built" && "$built" != "<no value>" ]] || built=""
  built_display="${built:--}"

  built_state="unparsed"
  if [[ -n "$built" ]]; then
    if epoch="$(gw_docker_built_epoch "$built")"; then
      now="$(date -u +%s)"
      age=$(((now - epoch) / 3600))
      built_state="parsed"
    elif [[ $? -eq 2 ]]; then
      built_state="no-jq"
    fi
  fi

  reason=""
  if [[ "$eph" != "true" ]]; then
    status="protected"
    reason="kept: $GW_DOCKER_EPHEMERAL_LABEL=true not verified on inspect"
  elif [[ -n "$scratch_bad" || -n "$refs" ]]; then
    status="protected"
    if [[ -n "$scratch_bad" ]]; then
      reason="kept: tag outside the scratch namespace: $scratch_bad"
    fi
    if [[ -n "$refs" ]]; then
      reason="${reason:+$reason; }kept: referenced by container(s): $refs"
    fi
  elif [[ "$built_state" == "no-jq" ]]; then
    status="unverified"
    reason="retained: jq is not installed, so the $GW_DOCKER_BUILT_LABEL timestamp cannot be verified"
  elif [[ "$built_state" != "parsed" ]]; then
    status="unverified"
    if [[ -z "$built" ]]; then
      reason="retained: no $GW_DOCKER_BUILT_LABEL label, so its age is unverifiable"
    else
      reason="retained: malformed $GW_DOCKER_BUILT_LABEL label ('$built'), so its age is unverifiable"
    fi
  elif ((age < max_age)); then
    status="retained"
    reason="inside the ${max_age}h grace window (built ${age}h ago)"
  else
    status="eligible"
    reason="label verified, built ${age}h ago (past the ${max_age}h grace), every tag in the scratch namespace, no container references"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$id" "$status" "$reason" "$tags_display" "$built_display" \
    "$age" "${created:--}" "$size" "${refs:--}"
}

# Enumerate every image carrying the ephemeral label, deduplicated by full
# image ID (a multi-tag image is ONE candidate, one line per image), and print
# one verdict record each.
gw_docker_scan() {
  local max_age="$1" listing id size seen=$'\n'
  gw_docker_refresh_refs
  listing="$(docker images --no-trunc \
    --filter "label=$GW_DOCKER_EPHEMERAL_LABEL=true" \
    --format $'{{.ID}}\t{{.Size}}' 2>/dev/null || true)"
  [[ -n "$listing" ]] || return 0
  while IFS=$'\t' read -r id size; do
    [[ -n "$id" ]] || continue
    case "$seen" in
      *$'\n'"$id"$'\n'*) continue ;;
    esac
    seen="${seen}${id}"$'\n'
    gw_docker_image_verdict "$id" "$max_age" "$size"
  done <<<"$listing"
}
