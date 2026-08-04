"""Groundwork CI receipt schema, provenance, and atomic I/O helpers."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import os
import pathlib
import re
import selectors
import stat
import subprocess
import sys
import tempfile
import time
from typing import Any, Iterable


SCHEMA = "groundwork.ci-receipt"
SCHEMA_VERSION = 1
RESULTS = {"passed", "failed", "cancelled", "skipped"}
RECEIPT_KINDS = {"validation-suite", "ci-job", "ci-gate", "deployment"}
CACHE_STATES = {"warm", "cold", "not-applicable", "unavailable", "mixed"}
FINGERPRINT_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
COMMIT_SHA_RE = re.compile(r"^[0-9a-f]{40}$")
SOURCE_IDENTITY_SCOPE = "HEAD, Git index, and Git-visible working-tree content"
FORBIDDEN_VERIFICATION_ARTIFACTS = ("node_modules", ".pnpm-store")
DEFAULT_FINGERPRINT_PATH_LIMIT = 20_000
DEFAULT_FINGERPRINT_CONTENT_BYTE_LIMIT = 512 * 1024 * 1024
DEFAULT_FINGERPRINT_GIT_OUTPUT_BYTE_LIMIT = 128 * 1024 * 1024
HASH_CHUNK_BYTES = 1024 * 1024
GIT_COMMAND_TIMEOUT_SECONDS = 15
SOURCE_PARENT_INITIAL_MATCH_FIELDS = (
    "baseHead",
    "identityScope",
    "ignoredArtifactState",
    "fingerprintInput",
    "workingTree",
    "treeFingerprint",
)


class ReceiptError(ValueError):
    """Raised when a receipt or its input violates the public contract."""


def validate_text(value: str, label: str, *, allow_empty: bool = False) -> str:
    if not isinstance(value, str):
        raise ReceiptError(f"{label} must be text")
    if not value and not allow_empty:
        raise ReceiptError(f"{label} must not be empty")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ReceiptError(f"{label} contains a control character")
    return value


def parse_nonnegative_integer(value: str, label: str) -> int:
    if not isinstance(value, str) or not re.fullmatch(r"[0-9]+", value):
        raise ReceiptError(f"{label} must be a nonnegative integer")
    return int(value)


def iso_time(epoch: int) -> str:
    return dt.datetime.fromtimestamp(epoch, dt.timezone.utc).isoformat().replace("+00:00", "Z")


def parse_iso_time(value: Any, label: str) -> dt.datetime:
    if not isinstance(value, str):
        raise ReceiptError(f"{label} must be an RFC3339 timestamp")
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as error:
        raise ReceiptError(f"{label} must be an RFC3339 timestamp") from error
    if parsed.tzinfo is None:
        raise ReceiptError(f"{label} must include a timezone")
    return parsed


def _git(repo: pathlib.Path, *arguments: str) -> bytes:
    return subprocess.run(
        ["git", "-C", str(repo), *arguments],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
        timeout=GIT_COMMAND_TIMEOUT_SECONDS,
    ).stdout


def _kill_and_reap(process: subprocess.Popen[bytes]) -> None:
    if process.poll() is None:
        process.kill()
    try:
        process.wait(timeout=2)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


def _bounded_stdout_chunks(
    process: subprocess.Popen[bytes],
    *,
    label: str,
) -> Iterable[bytes]:
    if process.stdout is None:
        _kill_and_reap(process)
        raise ReceiptError(f"could not stream {label}")
    descriptor = process.stdout.fileno()
    os.set_blocking(descriptor, False)
    selector = selectors.DefaultSelector()
    selector.register(descriptor, selectors.EVENT_READ)
    deadline = time.monotonic() + GIT_COMMAND_TIMEOUT_SECONDS
    completed = False
    try:
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise ReceiptError(
                    f"Git operation timed out after {GIT_COMMAND_TIMEOUT_SECONDS}s while reading {label}"
                )
            if not selector.select(remaining):
                raise ReceiptError(
                    f"Git operation timed out after {GIT_COMMAND_TIMEOUT_SECONDS}s while reading {label}"
                )
            chunk = os.read(descriptor, HASH_CHUNK_BYTES)
            if not chunk:
                break
            yield chunk
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise ReceiptError(
                f"Git operation timed out after {GIT_COMMAND_TIMEOUT_SECONDS}s while finishing {label}"
            )
        try:
            returncode = process.wait(timeout=remaining)
        except subprocess.TimeoutExpired as error:
            raise ReceiptError(
                f"Git operation timed out after {GIT_COMMAND_TIMEOUT_SECONDS}s while finishing {label}"
            ) from error
        if returncode != 0:
            raise ReceiptError(f"could not fingerprint {label}")
        completed = True
    finally:
        selector.close()
        process.stdout.close()
        if not completed:
            _kill_and_reap(process)


def _frame(digest: "hashlib._Hash", label: bytes, value: bytes) -> None:
    digest.update(len(label).to_bytes(8, "big"))
    digest.update(label)
    digest.update(len(value).to_bytes(8, "big"))
    digest.update(value)


def _git_stream_hash(
    repo: pathlib.Path,
    arguments: list[str],
    *,
    budget: "_FingerprintBudget",
    label: str,
) -> tuple[bytes, int]:
    process = subprocess.Popen(
        ["git", "-C", str(repo), *arguments],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    output_digest = hashlib.sha256()
    output_bytes = 0
    for chunk in _bounded_stdout_chunks(process, label=label):
        output_bytes += len(chunk)
        budget.add_git_output(len(chunk), label)
        output_digest.update(chunk)
    return output_digest.digest(), output_bytes


def _git_nul_paths(
    repo: pathlib.Path,
    arguments: list[str],
    *,
    budget: "_FingerprintBudget",
    label: str,
) -> Iterable[bytes]:
    process = subprocess.Popen(
        ["git", "-C", str(repo), *arguments],
        stdout=subprocess.PIPE,
        stderr=subprocess.DEVNULL,
    )
    pending = b""
    for chunk in _bounded_stdout_chunks(process, label=label):
        budget.add_git_output(len(chunk), label)
        pending += chunk
        fields = pending.split(b"\0")
        pending = fields.pop()
        for field in fields:
            if field:
                yield field
    if pending:
        raise ReceiptError(f"{label} did not end with a NUL path separator")


class _FingerprintBudget:
    def __init__(
        self,
        *,
        path_limit: int,
        content_byte_limit: int,
        git_output_byte_limit: int,
    ) -> None:
        if path_limit <= 0 or content_byte_limit <= 0 or git_output_byte_limit <= 0:
            raise ReceiptError("fingerprint path, content-byte, and Git-output budgets must be positive")
        self.path_limit = path_limit
        self.content_byte_limit = content_byte_limit
        self.git_output_byte_limit = git_output_byte_limit
        self.paths = 0
        self.content_bytes = 0
        self.git_output_bytes = 0

    def add_path(self, raw_path: bytes) -> None:
        self.paths += 1
        if self.paths > self.path_limit:
            raise ReceiptError(
                f"Git-visible fingerprint input exceeded the {self.path_limit}-path budget"
            )
        if len(raw_path) > 4096:
            raise ReceiptError("Git-visible fingerprint input contains a path longer than 4096 bytes")

    def add_content(self, size: int, display_path: str) -> None:
        if size < 0 or self.content_bytes + size > self.content_byte_limit:
            raise ReceiptError(
                f"Git-visible fingerprint content exceeded the {self.content_byte_limit}-byte budget at {display_path!r}"
            )
        self.content_bytes += size

    def add_git_output(self, size: int, label: str) -> None:
        if size < 0 or self.git_output_bytes + size > self.git_output_byte_limit:
            raise ReceiptError(
                f"Git fingerprint output exceeded the {self.git_output_byte_limit}-byte budget while reading {label}"
            )
        self.git_output_bytes += size


def _hash_file(path: pathlib.Path, expected: os.stat_result) -> tuple[bytes, int]:
    digest = hashlib.sha256()
    total = 0
    try:
        with path.open("rb", buffering=0) as source:
            opened = os.fstat(source.fileno())
            if (opened.st_dev, opened.st_ino, opened.st_mode, opened.st_size) != (
                expected.st_dev,
                expected.st_ino,
                expected.st_mode,
                expected.st_size,
            ):
                raise ReceiptError(f"fingerprinted file changed before it could be read: {path}")
            while True:
                chunk = source.read(HASH_CHUNK_BYTES)
                if not chunk:
                    break
                digest.update(chunk)
                total += len(chunk)
                if total > expected.st_size:
                    raise ReceiptError(f"fingerprinted file grew while it was read: {path}")
            finished = os.fstat(source.fileno())
    except OSError as error:
        raise ReceiptError(f"could not fingerprint file {path}: {error}") from error
    if total != expected.st_size or (
        finished.st_dev,
        finished.st_ino,
        finished.st_mode,
        finished.st_size,
        finished.st_mtime_ns,
    ) != (
        opened.st_dev,
        opened.st_ino,
        opened.st_mode,
        opened.st_size,
        opened.st_mtime_ns,
    ):
        raise ReceiptError(f"fingerprinted file changed while it was read: {path}")
    return digest.digest(), total


def _hash_path_state(
    digest: "hashlib._Hash",
    repo: pathlib.Path,
    raw_path: bytes,
    *,
    state_label: bytes,
    budget: _FingerprintBudget,
) -> None:
    budget.add_path(raw_path)
    relative = pathlib.PurePosixPath(os.fsdecode(raw_path))
    if relative.is_absolute() or ".." in relative.parts:
        raise ReceiptError(f"Git returned an unsafe fingerprint path: {relative}")
    path = repo.joinpath(*relative.parts)
    _frame(digest, state_label + b"-path", raw_path)
    try:
        metadata = path.lstat()
    except FileNotFoundError:
        _frame(digest, state_label + b"-kind", b"missing")
        return
    except OSError as error:
        raise ReceiptError(f"could not inspect Git-visible path {str(relative)!r}: {error}") from error
    _frame(digest, state_label + b"-mode", f"{metadata.st_mode:o}".encode())
    if stat.S_ISLNK(metadata.st_mode):
        try:
            target = os.fsencode(os.readlink(path))
            finished = path.lstat()
        except OSError as error:
            raise ReceiptError(f"could not fingerprint symlink {str(relative)!r}: {error}") from error
        if (metadata.st_dev, metadata.st_ino, metadata.st_mode, metadata.st_mtime_ns) != (
            finished.st_dev,
            finished.st_ino,
            finished.st_mode,
            finished.st_mtime_ns,
        ):
            raise ReceiptError(f"fingerprinted symlink changed while it was read: {relative}")
        budget.add_content(len(target), str(relative))
        _frame(digest, state_label + b"-symlink", target)
    elif stat.S_ISREG(metadata.st_mode):
        budget.add_content(metadata.st_size, str(relative))
        content_digest, content_size = _hash_file(path, metadata)
        _frame(
            digest,
            state_label + b"-file",
            content_size.to_bytes(8, "big") + content_digest,
        )
    else:
        raise ReceiptError(
            f"unsupported Git-visible path type for exact fingerprinting: {str(relative)!r}"
        )


def tree_snapshot(
    repo: pathlib.Path,
    *,
    path_limit: int = DEFAULT_FINGERPRINT_PATH_LIMIT,
    content_byte_limit: int = DEFAULT_FINGERPRINT_CONTENT_BYTE_LIMIT,
    git_output_byte_limit: int = DEFAULT_FINGERPRINT_GIT_OUTPUT_BYTE_LIMIT,
) -> dict[str, Any]:
    repo = repo.resolve()
    forbidden_present = [
        artifact
        for artifact in FORBIDDEN_VERIFICATION_ARTIFACTS
        if os.path.lexists(repo / artifact)
    ]
    if forbidden_present:
        raise ReceiptError(
            "forbidden verification artifacts are present: " + ", ".join(forbidden_present)
        )
    try:
        base_head = _git(repo, "rev-parse", "--verify", "HEAD^{commit}").decode().strip()
    except subprocess.TimeoutExpired as error:
        raise ReceiptError(
            f"Git operation timed out after {GIT_COMMAND_TIMEOUT_SECONDS}s "
            "while resolving HEAD for exact source identity"
        ) from error
    except (
        OSError,
        subprocess.CalledProcessError,
        UnicodeDecodeError,
    ) as error:
        raise ReceiptError("could not resolve HEAD for exact source identity") from error
    if not COMMIT_SHA_RE.fullmatch(base_head):
        raise ReceiptError("resolved HEAD is not a complete 40-hex commit ID")

    digest = hashlib.sha256()
    _frame(digest, b"base-head", base_head.encode())
    budget = _FingerprintBudget(
        path_limit=path_limit,
        content_byte_limit=content_byte_limit,
        git_output_byte_limit=git_output_byte_limit,
    )
    index_digest, index_bytes = _git_stream_hash(
        repo,
        ["ls-files", "--stage", "-z"],
        budget=budget,
        label="Git index",
    )
    _frame(digest, b"git-index", index_bytes.to_bytes(8, "big") + index_digest)
    staged_count = 0
    for raw_path in _git_nul_paths(
        repo,
        ["diff", "--cached", "--name-only", "-z", "--no-ext-diff", "--"],
        budget=budget,
        label="staged path list",
    ):
        budget.add_path(raw_path)
        staged_count += 1
    unstaged_count = 0
    for raw_path in _git_nul_paths(
        repo,
        ["diff", "--name-only", "-z", "--no-ext-diff", "--"],
        budget=budget,
        label="unstaged path list",
    ):
        _hash_path_state(digest, repo, raw_path, state_label=b"unstaged", budget=budget)
        unstaged_count += 1
    untracked_count = 0
    for raw_path in _git_nul_paths(
        repo,
        ["ls-files", "--others", "--exclude-standard", "-z"],
        budget=budget,
        label="untracked path list",
    ):
        _hash_path_state(digest, repo, raw_path, state_label=b"untracked", budget=budget)
        untracked_count += 1

    return {
        "baseHead": base_head,
        "treeFingerprint": f"sha256:{digest.hexdigest()}",
        "identityScope": SOURCE_IDENTITY_SCOPE,
        "ignoredArtifactState": {
            "policy": "forbidden",
            "checkedPaths": list(FORBIDDEN_VERIFICATION_ARTIFACTS),
            "presentPaths": [],
        },
        "fingerprintInput": {
            "pathCount": budget.paths,
            "contentBytes": budget.content_bytes,
            "gitOutputBytes": budget.git_output_bytes,
            "pathLimit": path_limit,
            "contentByteLimit": content_byte_limit,
            "gitOutputByteLimit": git_output_byte_limit,
        },
        "workingTree": {
            "staged": staged_count > 0,
            "stagedPathCount": staged_count,
            "unstaged": unstaged_count > 0,
            "unstagedPathCount": unstaged_count,
            "untrackedPathCount": untracked_count,
        },
    }


def repository_name(repo: pathlib.Path) -> str:
    configured = os.environ.get("GITHUB_REPOSITORY", "")
    if configured:
        return validate_text(configured, "repository")
    try:
        remote = _git(repo, "config", "--get", "remote.origin.url").decode().strip()
    except (OSError, subprocess.CalledProcessError, UnicodeDecodeError):
        remote = ""
    remote = remote.removesuffix(".git")
    for prefix in ("git@github.com:", "https://github.com/"):
        if remote.startswith(prefix):
            remote = remote[len(prefix) :]
    return remote if "/" in remote else f"local/{repo.name}"


def _optional_environment_integer(name: str) -> int | None:
    value = os.environ.get(name, "")
    if not value:
        return None
    if not re.fullmatch(r"[1-9][0-9]*", value):
        raise ReceiptError(f"{name} must be a positive integer")
    return int(value)


def common_envelope(
    *,
    repo: pathlib.Path,
    receipt_kind: str,
    result: str,
    started_epoch: int,
    finished_epoch: int,
    platform_os: str,
    platform_image: str,
    platform_arch: str,
    source_before: dict[str, Any] | None = None,
    source_after: dict[str, Any] | None = None,
    tree_observation_complete: bool = True,
) -> dict[str, Any]:
    if receipt_kind not in RECEIPT_KINDS:
        raise ReceiptError(f"unsupported receipt kind: {receipt_kind}")
    if result not in RESULTS:
        raise ReceiptError(f"unsupported result: {result}")
    if started_epoch <= 0 or finished_epoch < started_epoch:
        raise ReceiptError("receipt timing bounds are invalid")
    for label, value in (
        ("platform OS", platform_os),
        ("platform image", platform_image),
        ("platform architecture", platform_arch),
    ):
        validate_text(value, label)

    before = source_before or tree_snapshot(repo)
    # A final snapshot was either taken or it was not. Substituting `before` for
    # a missing one used to emit treeChangedDuringValidation: false — a claim
    # that the tree was observed at the end and had not moved, when nothing was
    # observed at all. An unobserved final tree is unknown (null), never
    # "unchanged": the caller's completeness flag cannot manufacture evidence.
    observation_complete = tree_observation_complete and source_after is not None
    after = source_after if observation_complete else None
    tree_changed = (
        before["treeFingerprint"] != after["treeFingerprint"]
        if observation_complete
        else None
    )
    working_tree = before["workingTree"]
    clean = not (
        working_tree["staged"]
        or working_tree["unstaged"]
        or working_tree["untrackedPathCount"]
    )
    github_sha = os.environ.get("GITHUB_SHA")
    tested_sha = github_sha or (before["baseHead"] if clean else None)
    head_sha = os.environ.get("GROUNDWORK_HEAD_SHA") or github_sha

    envelope = {
        "schema": SCHEMA,
        "schemaVersion": SCHEMA_VERSION,
        "receiptKind": receipt_kind,
        "repository": repository_name(repo),
        "workflow": validate_text(os.environ.get("GITHUB_WORKFLOW", "local"), "workflow"),
        "job": validate_text(os.environ.get("GITHUB_JOB", "local"), "job"),
        "runId": _optional_environment_integer("GITHUB_RUN_ID"),
        "runAttempt": _optional_environment_integer("GITHUB_RUN_ATTEMPT"),
        "event": os.environ.get("GITHUB_EVENT_NAME") or None,
        "ref": os.environ.get("GITHUB_REF") or None,
        "testedSha": tested_sha,
        "headSha": head_sha,
        "platform": {
            "os": platform_os,
            "image": platform_image,
            "arch": platform_arch,
        },
        "source": {
            **before,
            "treeFingerprintAfter": after["treeFingerprint"] if after is not None else None,
            "treeChangedDuringValidation": tree_changed,
        },
        "startedAt": iso_time(started_epoch),
        "finishedAt": iso_time(finished_epoch),
        "result": result,
    }
    for optional_label in ("event", "ref", "testedSha", "headSha"):
        value = envelope[optional_label]
        if value is not None:
            validate_text(value, optional_label)
    for sha_label in ("testedSha", "headSha"):
        value = envelope[sha_label]
        if value is not None and not COMMIT_SHA_RE.fullmatch(value):
            raise ReceiptError(f"{sha_label} must be a complete 40-hex commit ID")
    return envelope


def _require_mapping(value: Any, label: str) -> dict[str, Any]:
    if not isinstance(value, dict):
        raise ReceiptError(f"{label} must be an object")
    return value


def _require_integer(value: Any, label: str, *, nullable: bool = False) -> int | None:
    if value is None and nullable:
        return None
    if not isinstance(value, int) or isinstance(value, bool) or value < 0:
        raise ReceiptError(f"{label} must be a nonnegative integer")
    return value


def _validate_phase(phase: Any, label: str, *, structured_skip: bool = False) -> None:
    phase = _require_mapping(phase, label)
    validate_text(phase.get("name"), f"{label}.name")
    _require_integer(phase.get("durationSeconds"), f"{label}.durationSeconds")
    if phase.get("result") not in RESULTS:
        raise ReceiptError(f"{label}.result is invalid")
    reason = phase.get("reason")
    if phase.get("result") == "skipped":
        validate_text(reason, f"{label}.reason")
        if structured_skip:
            skip_code = validate_text(phase.get("skipCode"), f"{label}.skipCode")
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", skip_code):
                raise ReceiptError(f"{label}.skipCode is invalid")
    elif reason is not None:
        validate_text(reason, f"{label}.reason")
    if structured_skip and phase.get("result") != "skipped" and "skipCode" in phase:
        raise ReceiptError(f"{label}.skipCode is only valid for a skipped check")


def _validate_commands(value: Any, label: str, *, required: set[str] | None = None) -> None:
    commands = _require_mapping(value, label)
    if required is not None:
        if set(commands) != required:
            expected = ", ".join(sorted(required))
            raise ReceiptError(f"{label} must contain exactly: {expected}")
    elif not commands:
        raise ReceiptError(f"{label} must contain at least one typed command")
    for command_kind, command in commands.items():
        if command_kind not in {"localEquivalent", "rerun", "inspect"}:
            raise ReceiptError(f"unexpected command kind: {command_kind}")
        validate_text(command, f"{label}.{command_kind}")


def validate_receipt(payload: Any, *, expected_kind: str | None = None) -> dict[str, Any]:
    receipt = _require_mapping(payload, "receipt")
    if receipt.get("schema") != SCHEMA or receipt.get("schemaVersion") != SCHEMA_VERSION:
        raise ReceiptError("unsupported receipt schema")
    kind = receipt.get("receiptKind")
    if kind not in RECEIPT_KINDS or (expected_kind and kind != expected_kind):
        raise ReceiptError(f"unexpected receipt kind: {kind!r}")
    for label in ("repository", "workflow", "job"):
        validate_text(receipt.get(label), label)
    for label in ("runId", "runAttempt"):
        value = receipt.get(label)
        if value is not None and (not isinstance(value, int) or isinstance(value, bool) or value <= 0):
            raise ReceiptError(f"{label} must be a positive integer or null")
    for label in ("event", "ref", "testedSha", "headSha"):
        value = receipt.get(label)
        if value is not None:
            validate_text(value, label)
    for label in ("testedSha", "headSha"):
        value = receipt.get(label)
        if value is not None and not COMMIT_SHA_RE.fullmatch(value):
            raise ReceiptError(f"{label} must be a complete 40-hex commit ID")
    platform = _require_mapping(receipt.get("platform"), "platform")
    for label in ("os", "image", "arch"):
        validate_text(platform.get(label), f"platform.{label}")
    source = _require_mapping(receipt.get("source"), "source")
    base_head = validate_text(source.get("baseHead"), "source.baseHead")
    if not COMMIT_SHA_RE.fullmatch(base_head):
        raise ReceiptError("source.baseHead must be a complete 40-hex commit ID")
    if source.get("identityScope") != SOURCE_IDENTITY_SCOPE:
        raise ReceiptError("source.identityScope is invalid")
    ignored_artifacts = _require_mapping(
        source.get("ignoredArtifactState"),
        "source.ignoredArtifactState",
    )
    if ignored_artifacts != {
        "policy": "forbidden",
        "checkedPaths": list(FORBIDDEN_VERIFICATION_ARTIFACTS),
        "presentPaths": [],
    }:
        raise ReceiptError("source.ignoredArtifactState is invalid")
    fingerprint_input = _require_mapping(source.get("fingerprintInput"), "source.fingerprintInput")
    for label in (
        "pathCount",
        "contentBytes",
        "gitOutputBytes",
        "pathLimit",
        "contentByteLimit",
        "gitOutputByteLimit",
    ):
        _require_integer(fingerprint_input.get(label), f"source.fingerprintInput.{label}")
    if fingerprint_input["pathLimit"] <= 0 or fingerprint_input["contentByteLimit"] <= 0:
        raise ReceiptError("source fingerprint budgets must be positive")
    if fingerprint_input["gitOutputByteLimit"] <= 0:
        raise ReceiptError("source Git-output fingerprint budget must be positive")
    if fingerprint_input["pathCount"] > fingerprint_input["pathLimit"]:
        raise ReceiptError("source fingerprint path count exceeds its budget")
    if fingerprint_input["contentBytes"] > fingerprint_input["contentByteLimit"]:
        raise ReceiptError("source fingerprint content bytes exceed their budget")
    if fingerprint_input["gitOutputBytes"] > fingerprint_input["gitOutputByteLimit"]:
        raise ReceiptError("source fingerprint Git output bytes exceed their budget")
    tree_fingerprint = source.get("treeFingerprint")
    if not isinstance(tree_fingerprint, str) or not FINGERPRINT_RE.fullmatch(tree_fingerprint):
        raise ReceiptError("source.treeFingerprint is invalid")
    tree_fingerprint_after = source.get("treeFingerprintAfter")
    tree_changed = source.get("treeChangedDuringValidation")
    if tree_fingerprint_after is not None and (
        not isinstance(tree_fingerprint_after, str)
        or not FINGERPRINT_RE.fullmatch(tree_fingerprint_after)
    ):
        raise ReceiptError("source.treeFingerprintAfter is invalid")
    if tree_changed is not None and not isinstance(tree_changed, bool):
        raise ReceiptError("source.treeChangedDuringValidation must be boolean or null")
    if tree_changed is None:
        if tree_fingerprint_after is not None and tree_fingerprint_after != tree_fingerprint:
            raise ReceiptError("an incomplete tree observation cannot claim a different final fingerprint")
    elif tree_fingerprint_after is None:
        raise ReceiptError("a complete tree observation requires a final fingerprint")
    elif tree_changed != (tree_fingerprint != tree_fingerprint_after):
        raise ReceiptError("source tree-change state disagrees with its fingerprints")
    working_tree = _require_mapping(source.get("workingTree"), "source.workingTree")
    for label in ("staged", "unstaged"):
        if not isinstance(working_tree.get(label), bool):
            raise ReceiptError(f"source.workingTree.{label} must be boolean")
    for label in ("stagedPathCount", "unstagedPathCount", "untrackedPathCount"):
        _require_integer(working_tree.get(label), f"source.workingTree.{label}")
    for state, count in (("staged", "stagedPathCount"), ("unstaged", "unstagedPathCount")):
        if working_tree[state] != (working_tree[count] > 0):
            raise ReceiptError(f"source.workingTree.{state} and {count} disagree")
    started = parse_iso_time(receipt.get("startedAt"), "startedAt")
    finished = parse_iso_time(receipt.get("finishedAt"), "finishedAt")
    if finished < started:
        raise ReceiptError("finishedAt precedes startedAt")
    if receipt.get("result") not in RESULTS:
        raise ReceiptError("receipt result is invalid")
    body = _require_mapping(receipt.get("body"), "body")
    if body.get("cacheState") not in CACHE_STATES:
        raise ReceiptError("body.cacheState is invalid")

    if kind == "validation-suite":
        for label in ("suite", "scope", "proofType"):
            validate_text(body.get(label), f"body.{label}")
        for label in ("suiteDurationSeconds", "passedCount", "skippedCount", "failedCount", "checkCount"):
            _require_integer(body.get(label), f"body.{label}")
        budget = _require_integer(body.get("suiteBudgetSeconds"), "body.suiteBudgetSeconds", nullable=True)
        hard_deadline = _require_integer(
            body.get("hardDeadlineSeconds"),
            "body.hardDeadlineSeconds",
            nullable=True,
        )
        if hard_deadline is None or hard_deadline <= 0:
            raise ReceiptError("validation must record a positive hard deadline")
        expected_budget_state = "not-set" if budget is None else (
            "within" if body["suiteDurationSeconds"] <= budget else "exceeded"
        )
        if body.get("suiteBudgetState") != expected_budget_state:
            raise ReceiptError("body.suiteBudgetState is inconsistent")
        checks = body.get("checks")
        if not isinstance(checks, list):
            raise ReceiptError("body.checks must be an array")
        names: set[str] = set()
        counts = {"passed": 0, "skipped": 0, "failed": 0}
        for index, check in enumerate(checks):
            _validate_phase(check, f"body.checks[{index}]", structured_skip=True)
            if check["result"] not in counts:
                raise ReceiptError(f"body.checks[{index}].result must be passed, skipped, or failed")
            name = check["name"]
            if name in names:
                raise ReceiptError(f"duplicate validation check: {name}")
            names.add(name)
            counts[check["result"]] += 1
        if body["checkCount"] != len(checks):
            raise ReceiptError("body.checkCount is inconsistent")
        for result_name in counts:
            if body[f"{result_name}Count"] != counts[result_name]:
                raise ReceiptError(f"body.{result_name}Count is inconsistent")
        if receipt["result"] == "passed" and counts["failed"]:
            raise ReceiptError("a passed validation suite contains failed checks")
        if receipt["result"] == "failed" and not counts["failed"]:
            raise ReceiptError("a failed validation suite contains no failed check")
        _validate_commands(body.get("commands"), "body.commands")
    elif kind in {"ci-job", "deployment"}:
        for label in ("scope", "proofType"):
            validate_text(body.get(label), f"body.{label}")
        duration = _require_integer(body.get("jobDurationSeconds"), "body.jobDurationSeconds")
        budget = _require_integer(body.get("jobBudgetSeconds"), "body.jobBudgetSeconds", nullable=True)
        workflow_safety_timeout = _require_integer(
            body.get("workflowSafetyTimeoutSeconds"),
            "body.workflowSafetyTimeoutSeconds",
            nullable=True,
        )
        if workflow_safety_timeout is not None and workflow_safety_timeout <= 0:
            raise ReceiptError("body.workflowSafetyTimeoutSeconds must be positive when present")
        expected_budget_state = "not-set" if budget is None else (
            "within" if duration <= budget else "exceeded"
        )
        if body.get("jobBudgetState") != expected_budget_state:
            raise ReceiptError("body.jobBudgetState is inconsistent")
        phases = body.get("phases")
        if not isinstance(phases, list):
            raise ReceiptError("body.phases must be an array")
        names: set[str] = set()
        for index, phase in enumerate(phases):
            _validate_phase(phase, f"body.phases[{index}]")
            if phase["name"] in names:
                raise ReceiptError(f"duplicate phase: {phase['name']}")
            names.add(phase["name"])
        facts = _require_mapping(body.get("facts"), "body.facts")
        for label, value in facts.items():
            validate_text(label, "fact label")
            validate_text(value, f"fact {label}")
        if receipt["result"] == "passed" and any(phase["result"] != "passed" for phase in phases):
            raise ReceiptError("a passed job contains a phase that did not pass")
        _validate_commands(body.get("commands"), "body.commands")
        details = body.get("validationDetails", [])
        if not isinstance(details, list):
            raise ReceiptError("body.validationDetails must be an array")
        for detail in details:
            validated_detail = validate_receipt(detail, expected_kind="validation-suite")
            detail_source = validated_detail["source"]
            if any(
                detail_source.get(field) != source.get(field)
                for field in SOURCE_PARENT_INITIAL_MATCH_FIELDS
            ):
                raise ReceiptError("validation detail initial source identity does not match its parent job")
            detail_final = detail_source.get("treeFingerprintAfter")
            if detail_final is not None and (
                detail_final != source.get("treeFingerprintAfter")
                or detail_source.get("treeChangedDuringValidation")
                != source.get("treeChangedDuringValidation")
            ):
                raise ReceiptError("validation detail final source identity does not match its parent job")
            if receipt["result"] == "passed" and detail_final is None:
                raise ReceiptError("a passed job contains validation detail without a final source observation")
            if receipt["result"] == "passed" and (
                validated_detail["result"] != "passed"
                or validated_detail["body"]["failedCount"] != 0
            ):
                raise ReceiptError("a passed job contains validation detail that did not pass")
    else:
        lanes = body.get("lanes")
        errors = body.get("errors")
        if not isinstance(lanes, list) or not isinstance(errors, list):
            raise ReceiptError("gate lanes and errors must be arrays")
        for label in ("scope", "proofType"):
            validate_text(body.get(label), f"body.{label}")
        _require_integer(
            body.get("requiredLaneSpanSeconds"),
            "body.requiredLaneSpanSeconds",
            nullable=True,
        )
        observed = _require_integer(
            body.get("observedWorkflowSpanAfterFirstLaneStartedSeconds"),
            "body.observedWorkflowSpanAfterFirstLaneStartedSeconds",
            nullable=True,
        )
        workflow_budget = _require_integer(body.get("workflowBudgetSeconds"), "body.workflowBudgetSeconds")
        expected_state = "unknown" if observed is None else (
            "within" if observed <= workflow_budget else "exceeded"
        )
        if body.get("workflowBudgetState") != expected_state:
            raise ReceiptError("body.workflowBudgetState is inconsistent")
        lane_jobs: set[str] = set()
        for index, lane in enumerate(lanes):
            lane = _require_mapping(lane, f"body.lanes[{index}]")
            for label in ("job", "label", "proof"):
                validate_text(lane.get(label), f"body.lanes[{index}].{label}")
            if lane.get("result") not in RESULTS:
                raise ReceiptError(f"body.lanes[{index}].result is invalid")
            if lane["job"] in lane_jobs:
                raise ReceiptError(f"duplicate gate lane: {lane['job']}")
            lane_jobs.add(lane["job"])
            _require_integer(lane.get("durationSeconds"), f"body.lanes[{index}].durationSeconds", nullable=True)
            _require_integer(lane.get("budgetSeconds"), f"body.lanes[{index}].budgetSeconds", nullable=True)
            lane_workflow_safety_timeout = _require_integer(
                lane.get("workflowSafetyTimeoutSeconds"),
                f"body.lanes[{index}].workflowSafetyTimeoutSeconds",
                nullable=True,
            )
            if lane_workflow_safety_timeout is not None and lane_workflow_safety_timeout <= 0:
                raise ReceiptError(
                    f"body.lanes[{index}].workflowSafetyTimeoutSeconds must be positive when present"
                )
            _require_integer(
                lane.get("suiteDurationSeconds"),
                f"body.lanes[{index}].suiteDurationSeconds",
                nullable=True,
            )
            _require_integer(
                lane.get("suiteTargetSeconds"),
                f"body.lanes[{index}].suiteTargetSeconds",
                nullable=True,
            )
            suite_budget_state = lane.get("suiteBudgetState")
            if suite_budget_state not in {None, "within", "exceeded"}:
                raise ReceiptError(f"body.lanes[{index}].suiteBudgetState is invalid")
        for error in errors:
            validate_text(error, "gate error")
        if bool(errors) != (receipt["result"] == "failed"):
            raise ReceiptError("gate result and errors disagree")
        _validate_commands(body.get("commands"), "body.commands", required={"inspect"})
    return receipt


def atomic_write_json(path: pathlib.Path, payload: dict[str, Any]) -> None:
    validate_receipt(payload)
    if not path.parent.is_dir():
        raise ReceiptError(f"output parent does not exist: {path.parent}")
    temporary: pathlib.Path | None = None
    try:
        descriptor, name = tempfile.mkstemp(prefix=f".{path.name}.tmp.", dir=path.parent)
        temporary = pathlib.Path(name)
        with os.fdopen(descriptor, "w", encoding="utf-8") as output:
            json.dump(payload, output, indent=2)
            output.write("\n")
            output.flush()
            os.fsync(output.fileno())
        os.replace(temporary, path)
        temporary = None
    finally:
        if temporary is not None:
            try:
                temporary.unlink()
            except FileNotFoundError:
                pass


def append_summary(path: pathlib.Path | None, content: str) -> None:
    if path is None:
        return
    try:
        with path.open("a", encoding="utf-8") as summary:
            summary.write(content)
            if not content.endswith("\n"):
                summary.write("\n")
    except OSError as error:
        print(f"Groundwork warning: receipt written, but summary rendering failed: {error}", file=sys.stderr)


def escape_table(value: str) -> str:
    return value.replace("|", "\\|")


def inline_code(value: str) -> str:
    # A backslash does NOT escape a backtick inside a Markdown code span, so
    # "\\`" left the span open and the rest of the row rendered as prose. The
    # spec's actual rule is that a span is delimited by a longer backtick run
    # than any run it contains, with padding spaces when it starts or ends with
    # one. validate_text already rejects control characters, so the value cannot
    # also break the row with a newline.
    longest = 0
    run = 0
    for character in value:
        run = run + 1 if character == "`" else 0
        longest = max(longest, run)
    fence = "`" * (longest + 1)
    # CommonMark strips one leading AND one trailing space when both are present,
    # so a value that already carries its own edge whitespace needs padding too —
    # otherwise the rendered value silently loses it.
    edges = (value[:1], value[-1:])
    padding = " " if any(edge in ("`", " ") for edge in edges) else ""
    return f"{fence}{padding}{value}{padding}{fence}"


def seconds_label(value: int | None) -> str:
    if value is None:
        return "—"
    minutes, seconds = divmod(value, 60)
    return f"{minutes}m {seconds:02d}s" if minutes else f"{seconds}s"


def unique_labels(rows: Iterable[list[str]], label: str) -> None:
    seen: set[str] = set()
    for row in rows:
        if row[0] in seen:
            raise ReceiptError(f"duplicate {label}: {row[0]}")
        seen.add(row[0])
