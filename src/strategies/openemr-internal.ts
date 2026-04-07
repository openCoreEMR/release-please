// Copyright 2026 OpenCoreEMR Inc.
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

import {BaseStrategy, BuildUpdatesOptions, BaseStrategyOptions} from './base';
import {Update} from '../update';
import {Changelog} from '../updaters/changelog';
import {AlwaysBumpPatch} from '../versioning-strategies/always-bump-patch';
import {Version} from '../version';
import {TagName} from '../util/tag-name';

/**
 * Strategy for opencoreemr/openemr-internal releases.
 *
 * openemr-internal does not use semver. Each upstream OpenEMR release
 * branch (e.g. rel-800) is forked into an oce-XYZ branch (e.g. oce-800)
 * and tagged as oce-XYZ-rN where N is an incrementing release counter.
 *
 * Internally, release-please's semver machinery is reused with the
 * counter stored in the patch component (Version 0.0.N). The
 * buildTagName override renders the tag as "oce-XYZ-rN" via TagName's
 * oceFormat flag, and buildReleaseName mirrors the tag name verbatim
 * so the GitHub release matches.
 *
 * Versioning is forced to AlwaysBumpPatch so feat/fix/chore commits
 * all bump the counter by one rather than the semver minor/major.
 */
export class OpenemrInternal extends BaseStrategy {
  constructor(options: BaseStrategyOptions) {
    super({
      ...options,
      versioningStrategy: options.versioningStrategy ?? new AlwaysBumpPatch(),
    });
  }

  buildTagName(version: Version, component: string | undefined): TagName {
    return new TagName(
      version,
      this.includeComponentInTag ? component : undefined,
      '-r',
      false,
      true
    );
  }

  protected buildReleaseName(
    tag: TagName,
    _component: string | undefined,
    _version: Version
  ): string {
    return tag.toString();
  }

  protected initialReleaseVersion(): Version {
    if (this.initialVersion) {
      return Version.parse(this.initialVersion);
    }
    return new Version(0, 0, 1);
  }

  protected async buildUpdates(
    options: BuildUpdatesOptions
  ): Promise<Update[]> {
    const updates: Update[] = [];
    const version = options.newVersion;

    if (!this.skipChangelog) {
      updates.push({
        path: this.addPath(this.changelogPath),
        createIfMissing: true,
        updater: new Changelog({
          version,
          changelogEntry: options.changelogEntry,
        }),
      });
    }

    return updates;
  }
}
