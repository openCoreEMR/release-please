// Copyright 2021 Google LLC
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

import {Version} from '../version';

const TAG_PATTERN =
  /^((?<component>.*)(?<separator>[^a-zA-Z0-9]))?(?<v>v)?(?<version>\d+\.\d+\.\d+.*)$/;
// Matches openemr-internal style tags: <component>-r<patch>, e.g. "oce-800-r3".
// Only consulted as a fallback when TAG_PATTERN fails (i.e. no semver
// substring), so existing semver-tag parsing is byte-identical.
const OCE_TAG_PATTERN = /^(?<component>.+)-r(?<rnum>\d+)$/;
const DEFAULT_SEPARATOR = '-';

export class TagName {
  component?: string;
  version: Version;
  separator: string;
  includeV: boolean;
  // When true, render as "${component}-r${version.patch}" (ignoring
  // includeV/separator). Used by the openemr-internal strategy so the
  // running release counter lives in version.patch but tags read as rN.
  oceFormat: boolean;

  constructor(
    version: Version,
    component?: string,
    separator: string = DEFAULT_SEPARATOR,
    includeV = true,
    oceFormat = false
  ) {
    this.version = version;
    this.component = component;
    this.separator = separator;
    this.includeV = includeV;
    this.oceFormat = oceFormat;
  }

  static parse(tagName: string): TagName | undefined {
    const match = tagName.match(TAG_PATTERN);
    if (match?.groups) {
      return new TagName(
        Version.parse(match.groups.version),
        match.groups.component,
        match.groups.separator,
        !!match.groups.v
      );
    }
    const oceMatch = tagName.match(OCE_TAG_PATTERN);
    if (oceMatch?.groups) {
      const rnum = Number(oceMatch.groups.rnum);
      return new TagName(
        new Version(0, 0, rnum),
        oceMatch.groups.component,
        '-r',
        false,
        true
      );
    }
    return;
  }

  toString(): string {
    if (this.oceFormat && this.component) {
      return `${this.component}-r${this.version.patch}`;
    }
    if (this.component) {
      return `${this.component}${this.separator}${
        this.includeV ? 'v' : ''
      }${this.version.toString()}`;
    }
    return `${this.includeV ? 'v' : ''}${this.version.toString()}`;
  }
}
