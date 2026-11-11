// Copyright 2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {Commit} from '../commit';

/**
 * Tracks which walked commits each release already contains.
 *
 * Commit history arrives newest committer date first, not in graph order.
 * A branch cut before a release and merged after it keeps its older dates,
 * so its commits sort behind the release commit. Stopping at the release
 * commit drops them (googleapis/release-please#2883). Feed every walked
 * commit to `visit`; `isComplete` says when no unwalked commit can be
 * missing from a release, and `notReleasedBy` filters a walked list down to
 * what a given release does not contain.
 *
 * When any walked commit lacks `parents`, ancestry is unknown: `isComplete`
 * is always true and `notReleasedBy` returns `undefined`, so callers keep
 * the date-order behavior.
 */
export class ReleaseAncestry {
  private tracking = true;
  private readonly visited = new Set<string>();
  // Commits reachable from the walk's head that have not been walked yet.
  private readonly frontier = new Set<string>();
  // Release SHA => the release commit and every ancestor found so far.
  private readonly contained = new Map<string, Set<string>>();

  constructor(releaseShas: Iterable<string>) {
    for (const sha of releaseShas) {
      this.contained.set(sha, new Set([sha]));
    }
  }

  visit(commit: Commit): void {
    const parents = commit.parents;
    if (!parents) {
      this.tracking = false;
      return;
    }
    this.visited.add(commit.sha);
    this.frontier.delete(commit.sha);
    for (const parent of parents) {
      if (!this.visited.has(parent)) {
        this.frontier.add(parent);
      }
    }
    for (const ancestors of this.contained.values()) {
      if (ancestors.has(commit.sha)) {
        for (const parent of parents) {
          ancestors.add(parent);
        }
      }
    }
  }

  /**
   * True once every unwalked commit reachable from the head is contained
   * in every release, so walking further can find nothing unreleased.
   */
  isComplete(): boolean {
    if (!this.tracking) {
      return true;
    }
    for (const sha of this.frontier) {
      for (const ancestors of this.contained.values()) {
        if (!ancestors.has(sha)) {
          return false;
        }
      }
    }
    return true;
  }

  /**
   * The commits that the release at `releaseSha` does not contain, or
   * `undefined` when ancestry is unknown.
   */
  notReleasedBy(
    commits: Commit[],
    releaseSha: string | undefined
  ): Commit[] | undefined {
    if (!this.tracking) {
      return undefined;
    }
    const ancestors = releaseSha ? this.contained.get(releaseSha) : undefined;
    if (!ancestors) {
      return commits;
    }
    return commits.filter(commit => !ancestors.has(commit.sha));
  }
}
