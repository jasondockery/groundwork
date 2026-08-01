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
#               exactly one RepoTag inside the scratch namespace (*/scratch:*), and
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
#         gw_docker_legacy_validation_images <max_age_hours>
#                                                   old groundwork:* proof tags
#                                                 one image, fresh facts (the
#                                                 apply-time re-check)
# Record format (one TSV line per image; fields never contain tabs, "-" means
# empty): id, status, reason, tags (comma-joined), built label (raw),
# age_hours, created (diagnostic), size (estimated), container refs.

GW_DOCKER_EPHEMERAL_LABEL="dev.roost.ephemeral"
GW_DOCKER_BUILT_LABEL="dev.roost.built"
# This is caller-selected only after the managed library is sourced. Ignore an
# inherited value so a repository environment cannot redirect JSON parsing.
GW_DOCKER_JQ=""

gw_docker_canonical_executable() {
  local path="$1" directory target hops=0 seen=$'\n'
  [[ "$path" == /* && -x "$path" && ! -d "$path" ]] || return 1
  while [[ -L "$path" ]]; do
    case "$seen" in
      *$'\n'"$path"$'\n'*) return 1 ;;
    esac
    seen="${seen}${path}"$'\n'
    hops=$((hops + 1))
    ((hops <= 40)) || return 1
    directory="${path%/*}"
    directory="$(cd -P "$directory" 2>/dev/null && pwd)" || return 1
    target="$(/usr/bin/readlink "$path" 2>/dev/null)" || return 1
    if [[ "$target" == /* ]]; then
      path="$target"
    else
      path="$directory/$target"
    fi
  done
  directory="${path%/*}"
  directory="$(cd -P "$directory" 2>/dev/null && pwd)" || return 1
  path="$directory/${path##*/}"
  [[ -x "$path" && ! -d "$path" ]] || return 1
  printf '%s\n' "$path"
}

# Acting Docker maintenance must not select a repository-controlled binary
# merely because a project prepended it to PATH. Refuse the first PATH result
# unless both its visible and canonical locations are platform-owned.
gw_docker_resolve_trusted_executable() {
  local name="$1" candidate resolved
  candidate="$(type -P "$name" 2>/dev/null)" || return 1
  case "$candidate" in
    /bin/* | /usr/bin/* | /usr/local/* | /opt/homebrew/* | \
      /home/linuxbrew/.linuxbrew/* | /Applications/Docker.app/Contents/Resources/bin/*) ;;
    *) return 1 ;;
  esac
  resolved="$(gw_docker_canonical_executable "$candidate")" || return 1
  case "$resolved" in
    /bin/* | /usr/bin/* | /usr/local/* | /opt/homebrew/* | \
      /home/linuxbrew/.linuxbrew/* | /Applications/Docker.app/Contents/Resources/bin/*) ;;
    *) return 1 ;;
  esac
  [[ "${resolved##*/}" == "$name" ]] || return 1
  printf '%s\n' "$resolved"
}

gw_docker_jq_executable() {
  if [[ -n "$GW_DOCKER_JQ" ]]; then
    [[ -x "$GW_DOCKER_JQ" ]] || return 1
    printf '%s\n' "$GW_DOCKER_JQ"
  else
    type -P jq 2>/dev/null
  fi
}

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
  local raw="$1" iso epoch jq_executable
  jq_executable="$(gw_docker_jq_executable)" || return 2
  if [[ "$raw" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}$ ]]; then
    iso="${raw}T00:00:00Z"
  elif [[ "$raw" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}Z$ ]]; then
    iso="$raw"
  else
    return 1
  fi
  # jq validates the calendar too: 2026-99-99 matches the regex shape but
  # fails fromdateiso8601.
  # shellcheck disable=SC2016 # $d is jq syntax, not a shell expansion.
  epoch="$("$jq_executable" -rn --arg d "$iso" '$d | fromdateiso8601' 2>/dev/null)" || return 1
  [[ "$epoch" =~ ^-?[0-9]+$ ]] || return 1
  printf '%s\n' "$epoch"
}

# Snapshot every container reference (running AND stopped — docker refuses to
# delete an image behind a stopped container, so the scan must refuse too)
# into GW_DOCKER_REFS as "image_id<TAB>name<TAB>state" lines. Refresh before a
# scan and again before each apply-time re-check.
GW_DOCKER_REFS=""
gw_docker_refresh_refs() {
  local cid line listing query_status=0
  GW_DOCKER_REFS=""
  listing="$(docker ps -aq --no-trunc 2>/dev/null)" || query_status=$?
  [[ "$query_status" -eq 0 ]] || return "$query_status"
  while IFS= read -r cid; do
    [[ -n "$cid" ]] || continue
    query_status=0
    line="$(docker container inspect \
      --format $'{{.Image}}\t{{.Name}}\t{{.State.Status}}' "$cid" 2>/dev/null)" \
      || query_status=$?
    [[ "$query_status" -eq 0 ]] || return "$query_status"
    [[ "$line" == *$'\t'*$'\t'* ]] || return 1
    GW_DOCKER_REFS="${GW_DOCKER_REFS}${line}"$'\n'
  done <<<"$listing"
  return 0
}

# After an inspect failure, distinguish an image that left the labeled
# candidate set from an observation failure. A successful relist without this
# ID proves the tidy no longer has authority to act on it; a failed relist or
# an ID still present means the scan is incomplete.
gw_docker_labeled_image_absent() {
  local wanted="$1" listing listed_id query_status=0
  listing="$(docker images --no-trunc \
    --filter "label=$GW_DOCKER_EPHEMERAL_LABEL=true" \
    --format '{{.ID}}' 2>/dev/null)" || query_status=$?
  [[ "$query_status" -eq 0 ]] || return "$query_status"
  while IFS= read -r listed_id; do
    [[ "$listed_id" == "$wanted" ]] && return 1
  done <<<"$listing"
  return 0
}

# Judge one image against the full candidate policy and print its record.
# Reads GW_DOCKER_REFS; callers refresh it first.
gw_docker_image_verdict() {
  local id="$1" max_age="$2" size="${3:--}"
  local payload observed_id eph built created tags tag refs="" ref_id ref_name ref_state
  local tags_display="-" built_display="-" age="-" status reason epoch now
  local scratch_bad="" built_state jq_executable tag_count=0 inspect_status=0 absence_status=0

  payload="$(docker image inspect "$id" 2>/dev/null)" || inspect_status=$?
  if [[ "$inspect_status" -ne 0 ]]; then
    case "$inspect_status" in
      124 | 125 | 129 | 130 | 143) return "$inspect_status" ;;
    esac
    gw_docker_labeled_image_absent "$id" || absence_status=$?
    if [[ "$absence_status" -eq 0 ]]; then
      printf '%s\t%s\t%s\t-\t-\t-\t-\t%s\t-\n' \
        "$id" missing "no longer in the labeled candidate set" "$size"
      return 0
    fi
    return "$absence_status"
  fi

  # One Docker observation is the authority for every deletion fact. jq then
  # validates the complete response; a missing/mistyped RepoTags field or any
  # other incomplete fact fails the whole verdict instead of turning absence
  # of evidence into deletion consent.
  if ! jq_executable="$(gw_docker_jq_executable)"; then
    printf '%s\t%s\t%s\t-\t-\t-\t-\t%s\t%s\n' \
      "$id" unverified "retained: jq is not installed, so the complete image inspection cannot be verified" "$size" "${refs:--}"
    return 0
  fi
  observed_id="$(printf '%s' "$payload" | "$jq_executable" -er \
    'if length == 1 and (.[0].Id | type) == "string" and (.[0].Id | length) > 0 then .[0].Id else error("invalid Id") end' \
    2>/dev/null)" || return 1
  [[ "$observed_id" == "$id" ]] || return 1
  eph="$(printf '%s' "$payload" | "$jq_executable" -er \
    'if (.[0].Config.Labels // null) == null then "" elif (.[0].Config.Labels | type) == "object" then (.[0].Config.Labels["dev.roost.ephemeral"] // "") else error("invalid Labels") end' \
    2>/dev/null)" || return 1
  built="$(printf '%s' "$payload" | "$jq_executable" -er \
    'if (.[0].Config.Labels // null) == null then "" elif (.[0].Config.Labels | type) == "object" then (.[0].Config.Labels["dev.roost.built"] // "") else error("invalid Labels") end' \
    2>/dev/null)" || return 1
  created="$(printf '%s' "$payload" | "$jq_executable" -er \
    'if (.[0].Created | type) == "string" and (.[0].Created | length) > 0 then .[0].Created else error("invalid Created") end' \
    2>/dev/null)" || return 1
  tags="$(printf '%s' "$payload" | "$jq_executable" -er \
    'if (.[0] | has("RepoTags")) and (.[0].RepoTags | type) == "array" and all(.[0].RepoTags[]; type == "string") then (.[0].RepoTags | join("\n")) else error("invalid RepoTags") end' \
    2>/dev/null)" || return 1

  while IFS= read -r tag; do
    [[ -n "$tag" ]] || continue
    tag_count=$((tag_count + 1))
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
  elif [[ "$tags_display" == "-" ]]; then
    status="protected"
    reason="kept: no scratch-namespace tag was present"
  elif [[ -n "$scratch_bad" || -n "$refs" || "$tag_count" -gt 1 ]]; then
    status="protected"
    if [[ -n "$scratch_bad" ]]; then
      reason="kept: tag outside the scratch namespace: $scratch_bad"
    fi
    if [[ -n "$refs" ]]; then
      reason="${reason:+$reason; }kept: referenced by container(s): $refs"
    fi
    if [[ "$tag_count" -gt 1 ]]; then
      reason="${reason:+$reason; }kept: multiple scratch tags require owner or creating-session cleanup"
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
    reason="label verified, built ${age}h ago (past the ${max_age}h grace), exactly one scratch-namespace tag, no container references"
  fi

  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
    "$id" "$status" "$reason" "$tags_display" "$built_display" \
    "$age" "${created:--}" "$size" "${refs:--}"
}

# Enumerate every image carrying the ephemeral label, deduplicated by full
# image ID (a multi-tag image is ONE candidate, one line per image), and print
# one verdict record each.
gw_docker_scan() {
  local max_age="$1" listing id size verdict seen=$'\n' query_status=0
  gw_docker_refresh_refs || return $?
  listing="$(docker images --no-trunc \
    --filter "label=$GW_DOCKER_EPHEMERAL_LABEL=true" \
    --format $'{{.ID}}\t{{.Size}}' 2>/dev/null)" || query_status=$?
  [[ "$query_status" -eq 0 ]] || return "$query_status"
  [[ -n "$listing" ]] || return 0
  while IFS=$'\t' read -r id size; do
    [[ -n "$id" ]] || continue
    case "$seen" in
      *$'\n'"$id"$'\n'*) continue ;;
    esac
    seen="${seen}${id}"$'\n'
    verdict="$(gw_docker_image_verdict "$id" "$max_age" "$size")" || return $?
    printf '%s\n' "$verdict"
  done <<<"$listing"
}

# Report old, unlabeled Groundwork tags whose names identify a validation
# build that bypassed the scratch contract. This is intentionally read-only
# and narrower than "all groundwork tags": groundwork:latest is a documented
# runnable image and must never be guessed disposable. Output is one
# tab-separated record per tag: tag, age hours, size, image ID.
gw_docker_legacy_validation_images() {
  local max_age="$1" listing id repository tag size payload observed_id eph created epoch now age jq_executable
  local seen=$'\n'
  jq_executable="$(gw_docker_jq_executable)" || return 1
  local query_status=0
  listing="$(docker images --no-trunc \
    --format $'{{.ID}}\t{{.Repository}}\t{{.Tag}}\t{{.Size}}' 2>/dev/null)" \
    || query_status=$?
  [[ "$query_status" -eq 0 ]] || return "$query_status"
  while IFS=$'\t' read -r id repository tag size; do
    [[ -n "$id" && "$repository" == "groundwork" ]] || continue
    case "$tag" in
      test | test-* | *-test | *-test-* | \
        review | review-* | *-review | *-review-* | \
        verify | verify-* | *-verify | *-verify-* | \
        spike | spike-* | *-spike | *-spike-*) ;;
      *) continue ;;
    esac
    case "$seen" in
      *$'\n'"$repository:$tag"$'\n'*) continue ;;
    esac
    seen="${seen}${repository}:${tag}"$'\n'

    # Identity, label consent, and age come from one complete Docker
    # observation. An inspect or parse failure makes the entire report unknown
    # rather than silently guessing that a candidate is unlabeled.
    payload="$(docker image inspect "$id" 2>/dev/null)" || return $?
    # Extract independently from the same captured payload. A TSV record is
    # not safe here: Bash collapses adjacent tab IFS whitespace, and the
    # unlabeled image this report seeks has an intentionally empty middle
    # field.
    # shellcheck disable=SC2016 # jq program, not shell interpolation.
    observed_id="$(printf '%s' "$payload" | "$jq_executable" -er '
      if length != 1 then error("wanted one image") else .[0].Id end
      | if type == "string" and length > 0 then . else error("invalid Id") end
    ' 2>/dev/null)" || return 1
    # shellcheck disable=SC2016 # jq program, not shell interpolation.
    eph="$(printf '%s' "$payload" | "$jq_executable" -er '
      if length != 1 then error("wanted one image") else .[0] end
      | (.Config.Labels // {})
      | if type != "object" then error("invalid Labels")
        else (.["dev.roost.ephemeral"] // "") end
      | if type == "string" then . else error("invalid ephemeral label") end
    ' 2>/dev/null)" || return 1
    # shellcheck disable=SC2016 # jq program, not shell interpolation.
    created="$(printf '%s' "$payload" | "$jq_executable" -er '
      if length != 1 then error("wanted one image") else .[0].Created end
      | if type == "string" and length > 0 then . else error("invalid Created") end
    ' 2>/dev/null)" || return 1
    [[ "$observed_id" == "$id" ]] || return 1
    [[ "$eph" != "true" ]] || continue
    created="${created%Z}"
    created="${created%%.*}Z"
    if epoch="$(gw_docker_built_epoch "$created")"; then
      now="$(date -u +%s)"
      age=$(((now - epoch) / 3600))
      ((age >= max_age)) || continue
      printf '%s\t%s\t%s\t%s\n' "$repository:$tag" "$age" "$size" "$id"
    fi
  done <<<"$listing"
  return 0
}
