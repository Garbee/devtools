/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//

/**
 * Redux actions for the sources state
 * @module actions/sources
 */

import { getSourceFromId, getSourceWithContent } from "../../reducers/sources";
import { tabExists } from "../../reducers/tabs";
import { setSymbols } from "./symbols";
import { setInScopeLines } from "../ast";
import { closeActiveSearch, updateActiveFileSearch } from "../ui";
import { addTab, closeTab } from "../tabs";
import { loadSourceText } from "./loadSourceText";
import { setBreakableLines } from ".";

import { prefs } from "../../utils/prefs";
import { isMinified } from "../../utils/source";
import { createLocation } from "../../utils/location";
import { paused } from "../pause/paused";

import { ThreadFront } from "protocol/thread";

import {
  getSource,
  getSourceByURL,
  getActiveSearch,
  getSelectedSource,
  getThreadExecutionPoint,
} from "../../selectors";

export const setSelectedLocation = (cx, source, location) => ({
  type: "SET_SELECTED_LOCATION",
  cx,
  source,
  location,
});

export const setPendingSelectedLocation = (cx, url, options) => ({
  type: "SET_PENDING_SELECTED_LOCATION",
  cx,
  url,
  line: options ? options.line : null,
  column: options ? options.column : null,
});

export const clearSelectedLocation = cx => ({
  type: "CLEAR_SELECTED_LOCATION",
  cx,
});

/**
 * Deterministically select a source that has a given URL. This will
 * work regardless of the connection status or if the source exists
 * yet.
 *
 * This exists mostly for external things to interact with the
 * debugger.
 *
 * @memberof actions/sources
 * @static
 */
export function selectSourceURL(cx, url, options) {
  return async ({ dispatch, getState }) => {
    const source = getSourceByURL(getState(), url);
    if (!source) {
      return dispatch(setPendingSelectedLocation(cx, url, options));
    }

    const sourceId = source.id;
    const location = createLocation({ ...options, sourceId });
    return dispatch(selectLocation(cx, location));
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectSource(cx, sourceId, options = {}) {
  return async ({ dispatch }) => {
    const location = createLocation({ ...options, sourceId });
    return dispatch(selectSpecificLocation(cx, location));
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectLocation(cx, location, { keepContext = true } = {}) {
  return async ({ dispatch, getState, client }) => {
    const currentSource = getSelectedSource(getState());

    if (!client) {
      // No connection, do nothing. This happens when the debugger is
      // shut down too fast and it tries to display a default source.
      return;
    }

    let source = getSource(getState(), location.sourceId);
    if (!source) {
      // If there is no source we deselect the current selected source
      return dispatch(clearSelectedLocation(cx));
    }

    const activeSearch = getActiveSearch(getState());
    if (activeSearch && activeSearch !== "file") {
      dispatch(closeActiveSearch());
    }

    if (tabExists(getState(), source.id)) {
      dispatch(addTab(source));
    }

    dispatch(setSelectedLocation(cx, source, location));

    await dispatch(loadSourceText({ source }));
    await dispatch(setBreakableLines(cx, source.id));

    const loadedSource = getSource(getState(), source.id);

    if (!loadedSource) {
      // If there was a navigation while we were loading the loadedSource
      return;
    }

    const sourceWithContent = getSourceWithContent(getState(), source.id);

    dispatch(setSymbols({ cx, source: loadedSource }));
    dispatch(setInScopeLines(cx));

    // If a new source is selected update the file search results
    const newSource = getSelectedSource(getState());
    if (currentSource && currentSource !== newSource) {
      dispatch(updateActiveFileSearch(cx));
    }
  };
}

/**
 * @memberof actions/sources
 * @static
 */
export function selectSpecificLocation(cx, location) {
  return selectLocation(cx, location, { keepContext: false });
}

// The RRP protocol values include both generated and original information about
// a paused frame and its scope contents. The ThreadFront is responsible for
// determining which one to use. When changing between a generated and original
// source for a frame, we tell the thread which one we prefer, and then perform
// the pause again to refresh all the debugger's state.
export function showAlternateSource(oldSource, newSource) {
  return async ({ dispatch, getState }) => {
    if (ThreadFront.isSourceMappedScript(oldSource.id)) {
      ThreadFront.preferScript(newSource.id, true);
    } else {
      ThreadFront.preferScript(oldSource.id, false);
    }

    const executionPoint = getThreadExecutionPoint(getState());
    await dispatch(paused({ executionPoint }));
  };
}
