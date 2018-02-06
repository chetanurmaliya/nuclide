/**
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 *
 * @flow
 * @format
 */

import type {NuclideUri} from 'nuclide-commons/nuclideUri';
import type {TokenizedText} from 'nuclide-commons/tokenized-text';

export type RequestLocationsResult = Array<{
  uri: NuclideUri,
  range: atom$Range,
}>;

export type CqueryProjectWithCompilationDb = {
  hasCompilationDb: true,
  compilationDbDir: NuclideUri,
  flagsFile: NuclideUri,
  projectRoot: NuclideUri,
};
export type CqueryProjectWithoutCompilationDb = {
  hasCompilationDb: false,
  defaultFlags: ?Array<string>,
  projectRoot: NuclideUri,
};

export type CqueryProject =
  | CqueryProjectWithCompilationDb
  | CqueryProjectWithoutCompilationDb;

export type CqueryProjectKey = string;

export type SimpleToken = {
  text: string,
  isBreak: boolean,
};

export type TokenizedSymbol = {
  ancestors: string[],
  tokenizedText: TokenizedText,
};
