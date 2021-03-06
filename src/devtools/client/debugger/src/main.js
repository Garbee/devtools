/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//

import ReactDOM from "react-dom";
import { onConnect } from "./client";
import { teardownWorkers } from "./utils/bootstrap";
import sourceQueue from "./utils/source-queue";

function unmountRoot() {
  const mount = document.querySelector("#mount .launchpad-root");
  ReactDOM.unmountComponentAtNode(mount);
}

export default {
  bootstrap: ({ targetList, devToolsClient, workers, panel }) =>
    onConnect(
      {
        tab: { clientType: "firefox" },
        targetList,
        devToolsClient,
      },
      workers,
      panel
    ),
  destroy: () => {
    unmountRoot();
    sourceQueue.clear();
    teardownWorkers();
  },
};
