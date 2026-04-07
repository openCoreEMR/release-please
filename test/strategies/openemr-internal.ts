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

import {describe, it, afterEach, beforeEach} from 'mocha';
import {expect} from 'chai';
import * as sinon from 'sinon';
import {GitHub} from '../../src/github';
import {OpenemrInternal} from '../../src/strategies/openemr-internal';
import {TagName} from '../../src/util/tag-name';
import {Version} from '../../src/version';
import {assertHasUpdate, assertNoHasUpdate} from '../helpers';
import {buildMockConventionalCommit} from '../helpers';
import {Changelog} from '../../src/updaters/changelog';

const sandbox = sinon.createSandbox();

const COMMITS = [
  ...buildMockConventionalCommit('feat: add greet function'),
  ...buildMockConventionalCommit('fix: handle null input'),
  ...buildMockConventionalCommit('chore: update common templates'),
];

describe('OpenemrInternal', () => {
  let github: GitHub;
  beforeEach(async () => {
    github = await GitHub.create({
      owner: 'opencoreemr',
      repo: 'openemr-internal',
      defaultBranch: 'oce-800',
    });
  });
  afterEach(() => {
    sandbox.restore();
  });

  describe('buildTagName', () => {
    it('produces oce-XYZ-rN tags', () => {
      const strategy = new OpenemrInternal({
        targetBranch: 'oce-800',
        github,
        component: 'oce-800',
      });
      const tag = strategy.buildTagName(new Version(0, 0, 3), 'oce-800');
      expect(tag.toString()).to.eql('oce-800-r3');
      expect(tag.oceFormat).to.eql(true);
    });
    it('produces oce-810-r1 for a different rel branch', () => {
      const strategy = new OpenemrInternal({
        targetBranch: 'oce-810',
        github,
        component: 'oce-810',
      });
      const tag = strategy.buildTagName(new Version(0, 0, 1), 'oce-810');
      expect(tag.toString()).to.eql('oce-810-r1');
    });
  });

  describe('buildReleasePullRequest', () => {
    it('bumps patch on feat commits (counter increment)', async () => {
      const strategy = new OpenemrInternal({
        targetBranch: 'oce-800',
        github,
        component: 'oce-800',
      });
      const latestRelease = {
        tag: TagName.parse('oce-800-r2')!,
        sha: 'abc123',
        notes: 'some notes',
      };
      const release = await strategy.buildReleasePullRequest(
        COMMITS,
        latestRelease
      );
      // feat would normally bump minor, but openemr-internal forces patch
      expect(release!.version?.toString()).to.eql('0.0.3');
    });
    it('uses initial version 0.0.1 when no prior release', async () => {
      const strategy = new OpenemrInternal({
        targetBranch: 'oce-800',
        github,
        component: 'oce-800',
      });
      const release = await strategy.buildReleasePullRequest(COMMITS, undefined);
      expect(release!.version?.toString()).to.eql('0.0.1');
    });
  });

  describe('buildUpdates', () => {
    it('writes a changelog and nothing else by default', async () => {
      const strategy = new OpenemrInternal({
        targetBranch: 'oce-800',
        github,
        component: 'oce-800',
      });
      const release = await strategy.buildReleasePullRequest(COMMITS, undefined);
      const updates = release!.updates;
      assertHasUpdate(updates, 'CHANGELOG.md', Changelog);
      assertNoHasUpdate(updates, 'version.txt');
    });
  });
});
