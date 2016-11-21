'use babel';
/* @flow */

/*
 * Copyright (c) 2015-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the license found in the LICENSE file in
 * the root directory of this source tree.
 */

import type {FileSearchResult} from './rpc-types';

import nuclideUri from '../../commons-node/nuclideUri';
import fsPromise from '../../commons-node/fsPromise';
import {getLogger} from '../../nuclide-logging';

import {PathSet} from './PathSet';
import {getPaths} from './PathSetFactory';
import PathSetUpdater from './PathSetUpdater';

const logger = getLogger();

class FileSearch {
  _originalUri: string;
  _pathSet: PathSet;

  constructor(fullUri: string, pathSet: PathSet) {
    this._originalUri = fullUri;
    this._pathSet = pathSet;
  }

  query(query: string): Promise<Array<FileSearchResult>> {
    // Attempt to relativize paths that people might e.g. copy + paste.
    let relQuery = query;
    // Remove the leading home directory qualifier.
    if (relQuery.startsWith('~/')) {
      relQuery = relQuery.substr(2);
    }
    // If a full path is pasted, make the path relative.
    if (relQuery.startsWith(nuclideUri.ensureTrailingSeparator(this._originalUri))) {
      relQuery = relQuery.substr(this._originalUri.length + 1);
    } else {
      // Also try to relativize queries that start with the dirname alone.
      const dirname = nuclideUri.dirname(this._originalUri);
      if (relQuery.startsWith(nuclideUri.ensureTrailingSeparator(dirname))) {
        relQuery = relQuery.substr(dirname.length + 1);
      }
    }

    const results = this._pathSet.match(relQuery).map(result => {
      let {matchIndexes} = result;
      if (matchIndexes != null) {
        matchIndexes = matchIndexes.map(idx => idx + this._originalUri.length + 1);
      }
      return {
        score: result.score,
        path: nuclideUri.join(this._originalUri, result.value),
        matchIndexes: matchIndexes || [],
      };
    });

    return Promise.resolve(results);
  }
}

const fileSearchCache = {};

export async function fileSearchForDirectory(
  directory: string,
  pathSetUpdater: ?PathSetUpdater,
  ignoredNames?: Array<string> = [],
): Promise<FileSearch> {
  let fileSearch = fileSearchCache[directory];
  if (fileSearch) {
    return fileSearch;
  }

  const realpath = await fsPromise.realpath(directory);
  const paths = await getPaths(realpath);
  const pathSet = new PathSet(paths, ignoredNames || []);

  const thisPathSetUpdater = pathSetUpdater || getPathSetUpdater();
  try {
    await thisPathSetUpdater.startUpdatingPathSet(pathSet, realpath);
  } catch (e) {
    logger.warn(`Could not update path sets for ${realpath}. Searches may be stale`, e);
    // TODO(hansonw): Fall back to manual refresh or node watches
  }

  fileSearch = new FileSearch(directory, pathSet);
  fileSearchCache[directory] = fileSearch;
  return fileSearch;
}

let pathSetUpdater;

function getPathSetUpdater() {
  if (!pathSetUpdater) {
    pathSetUpdater = new PathSetUpdater();
  }
  return pathSetUpdater;
}

// The return values of the following functions must be JSON-serializable so they
// can be sent across a process boundary.

export async function initFileSearchForDirectory(
  directory: string,
  ignoredNames: Array<string>,
): Promise<void> {
  await fileSearchForDirectory(directory, null, ignoredNames);
}

export async function doSearch(
  directory: string,
  query: string,
): Promise<Array<FileSearchResult>> {
  const fileSearch = await fileSearchForDirectory(directory);
  return fileSearch.query(query);
}
