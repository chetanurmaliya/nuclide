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

import type {DevicePanelServiceApi} from '../../nuclide-device-panel/lib/types';
import type {Store} from './types';
import type {NuclideUri} from 'nuclide-commons/nuclideUri';

import {ServerConnection} from '../../nuclide-remote-connection/lib/ServerConnection';
import {getAdbServiceByNuclideUri} from '../../nuclide-remote-connection';
import {getSdbServiceByNuclideUri} from '../../nuclide-remote-connection';
import createPackage from 'nuclide-commons-atom/createPackage';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import {ConfigurePathTaskProvider} from './ConfigurePathTaskProvider';
import {createEmptyAppState, deserialize, serialize} from './redux/AppState';
import * as Reducers from './redux/Reducers';
import * as Epics from './redux/Epics';
import {applyMiddleware, createStore} from 'redux';
import {
  combineEpics,
  createEpicMiddleware,
} from 'nuclide-commons/redux-observable';
import {AndroidBridge} from './bridges/AndroidBridge';
import {TizenBridge} from './bridges/TizenBridge';

class Activation {
  _disposables: UniversalDisposable;
  _store: Store;

  constructor(rawState: ?Object) {
    const initialState = {
      ...createEmptyAppState(),
      ...deserialize(rawState),
    };

    const epics = Object.keys(Epics)
      .map(k => Epics[k])
      .filter(epic => typeof epic === 'function');

    this._store = createStore(
      Reducers.app,
      initialState,
      applyMiddleware(createEpicMiddleware(combineEpics(...epics))),
    );

    this._registerCustomDBPaths('local');
    this._disposables = new UniversalDisposable(
      ServerConnection.observeRemoteConnections().subscribe(conns =>
        conns.map(conn => {
          this._registerCustomDBPaths(conn.getUriOfRemotePath('/'));
        }),
      ),
    );
  }

  _registerCustomDBPaths(host: NuclideUri): void {
    const state = this._store.getState();
    if (state.customAdbPaths.has(host)) {
      getAdbServiceByNuclideUri(host).registerCustomPath(
        state.customAdbPaths.get(host),
      );
    }
    if (state.customSdbPaths.has(host)) {
      getSdbServiceByNuclideUri(host).registerCustomPath(
        state.customSdbPaths.get(host),
      );
    }
  }

  serialize(): Object {
    return serialize(this._store.getState());
  }

  dispose(): void {
    this._disposables.dispose();
  }

  consumeDevicePanelServiceApi(api: DevicePanelServiceApi): void {
    this._disposables.add(
      api.registerDeviceTypeTaskProvider(
        new ConfigurePathTaskProvider(new AndroidBridge(this._store)),
      ),
      api.registerDeviceTypeTaskProvider(
        new ConfigurePathTaskProvider(new TizenBridge(this._store)),
      ),
    );
  }
}

createPackage(module.exports, Activation);
