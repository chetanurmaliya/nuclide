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

import type DebuggerModel from './DebuggerModel';
import UniversalDisposable from 'nuclide-commons/UniversalDisposable';
import * as React from 'react';
import TruncatedButton from 'nuclide-commons-ui/TruncatedButton';
import {DebuggerSteppingComponent} from './DebuggerSteppingComponent';
import type {DebuggerModeType} from './types';
import {DebuggerMode} from './constants';
import DebuggerControllerView from './DebuggerControllerView';
import {goToLocation} from 'nuclide-commons-atom/go-to-location';

const DEVICE_PANEL_URL = 'atom://nuclide/devices';

type Props = {
  model: DebuggerModel,
};

export class DebuggerControlsView extends React.PureComponent<
  Props,
  {
    mode: DebuggerModeType,
  },
> {
  _disposables: UniversalDisposable;

  constructor(props: Props) {
    super(props);

    this._disposables = new UniversalDisposable();
    this.state = {
      mode: props.model.getDebuggerMode(),
    };
  }

  componentDidMount(): void {
    const {model} = this.props;
    this._disposables.add(
      model.onChange(() => {
        this.setState({
          mode: model.getDebuggerMode(),
        });
      }),
    );
  }

  componentWillUnmount(): void {
    this._dispose();
  }

  _dispose(): void {
    this._disposables.dispose();
  }

  render(): React.Node {
    const {model} = this.props;
    const actions = model.getActions();
    const {mode} = this.state;
    const debuggerStoppedNotice =
      mode !== DebuggerMode.STOPPED ? null : (
        <div className="nuclide-debugger-pane-content">
          <div className="nuclide-debugger-state-notice">
            <span>The debugger is not attached.</span>
            <div className="padded">
              <TruncatedButton
                onClick={() =>
                  atom.commands.dispatch(
                    atom.views.getView(atom.workspace),
                    'nuclide-debugger:show-attach-dialog',
                  )
                }
                icon="nuclicon-debugger"
                label="Attach debugger..."
              />
              <TruncatedButton
                onClick={() =>
                  atom.commands.dispatch(
                    atom.views.getView(atom.workspace),
                    'nuclide-debugger:show-launch-dialog',
                  )
                }
                icon="nuclicon-debugger"
                label="Launch debugger..."
              />
              <TruncatedButton
                onClick={() => goToLocation(DEVICE_PANEL_URL)}
                icon="device-mobile"
                label="Manage devices..."
              />
            </div>
          </div>
        </div>
      );

    const targetInfo = model.getDebugProcessInfo();
    const targetDescription =
      targetInfo == null
        ? null
        : targetInfo.getDebuggerProps().targetDescription();

    const debugeeRunningNotice =
      mode !== DebuggerMode.RUNNING ? null : (
        <div className="nuclide-debugger-pane-content">
          <div className="nuclide-debugger-state-notice">
            The debug target is currently running.
          </div>
          {targetDescription == null ? null : (
            <div className="nuclide-debugger-target-description">
              {targetDescription}
            </div>
          )}
        </div>
      );

    return (
      <div className="nuclide-debugger-container-new">
        <div className="nuclide-debugger-section-header">
          <DebuggerControllerView model={model} />
        </div>
        <div className="nuclide-debugger-section-header nuclide-debugger-controls-section">
          <DebuggerSteppingComponent actions={actions} model={model} />
        </div>
        {debugeeRunningNotice}
        {debuggerStoppedNotice}
      </div>
    );
  }

  _stopDebugging = (): void => {
    const {model} = this.props;
    model.getActions().stopDebugging();
  };
}
