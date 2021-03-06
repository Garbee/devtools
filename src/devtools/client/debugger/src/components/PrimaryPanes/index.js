/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at <http://mozilla.org/MPL/2.0/>. */

//

import React, { Component } from "react";
import classnames from "classnames";
import { Tab, Tabs, TabList, TabPanels } from "react-aria-components/src/tabs";

import actions from "../../actions";
import {
  getActiveSearch,
  getProjectDirectoryRoot,
  getSelectedPrimaryPaneTab,
  getContext,
  getExtensionNameBySourceUrl,
} from "../../selectors";
import { isExtensionDirectoryPath } from "../../utils/source";
import { features, prefs } from "../../utils/prefs";
import { connect } from "../../utils/connect";
import { formatKeyShortcut } from "../../utils/text";

import Outline from "./Outline";
import SourcesTree from "./SourcesTree";
import AccessibleImage from "../shared/AccessibleImage";

import "./Sources.css";

class PrimaryPanes extends Component {
  constructor(props) {
    super(props);

    this.state = {
      alphabetizeOutline: prefs.alphabetizeOutline,
    };
  }

  showPane = selectedPane => {
    this.props.setPrimaryPaneTab(selectedPane);
  };

  onAlphabetizeClick = () => {
    const alphabetizeOutline = !prefs.alphabetizeOutline;
    prefs.alphabetizeOutline = alphabetizeOutline;
    this.setState({ alphabetizeOutline });
  };

  onActivateTab = index => {
    if (index === 0) {
      this.showPane("sources");
    } else {
      this.showPane("outline");
    }
  };

  getRootLabel = projectRoot => {
    const { rootExtensionName } = this.props;

    if (targetThread) {
      return targetThread.name;
    } else if (rootExtensionName) {
      return rootExtensionName;
    } else if (projectRoot.endsWith("://")) {
      if (projectRoot === "ng://") {
        return "Angular";
      } else if (projectRoot === "webpack://") {
        return "Webpack";
      }
      return `${unescape(projectRoot)}`;
    }

    return projectRoot.split("/").pop();
  };

  renderOutlineTabs() {
    if (!features.outline) {
      return;
    }

    const sources = formatKeyShortcut(L10N.getStr("sources.header"));
    const outline = formatKeyShortcut(L10N.getStr("outline.header"));
    const isSources = this.props.selectedTab === "sources";
    const isOutline = this.props.selectedTab === "outline";

    return [
      <Tab className={classnames("tab sources-tab", { active: isSources })} key="sources-tab">
        {sources}
      </Tab>,
      <Tab className={classnames("tab outline-tab", { active: isOutline })} key="outline-tab">
        {outline}
      </Tab>,
    ];
  }

  renderProjectRootHeader() {
    const { cx, projectRoot } = this.props;

    if (!projectRoot) {
      return null;
    }

    const rootLabel = this.getRootLabel(projectRoot);

    return (
      <div key="root" className="sources-clear-root-container">
        <button
          className="sources-clear-root"
          onClick={() => this.props.clearProjectDirectoryRoot(cx)}
          title={L10N.getStr("removeDirectoryRoot.label")}
        >
          <AccessibleImage className="home" />
          <AccessibleImage className="breadcrumb" />
          <span className="sources-clear-root-label">{rootLabel}</span>
        </button>
      </div>
    );
  }

  renderSources() {
    return <SourcesTree />;
  }

  render() {
    const { selectedTab, projectRoot } = this.props;
    const activeIndex = selectedTab === "sources" ? 0 : 1;

    return (
      <Tabs activeIndex={activeIndex} className="sources-panel" onActivateTab={this.onActivateTab}>
        <TabList className="source-outline-tabs">{this.renderOutlineTabs()}</TabList>
        <TabPanels
          className={classnames("source-outline-panel", {
            "has-root": projectRoot,
          })}
          hasFocusableContent
        >
          <div className="threads-list">{this.renderSources()}</div>
          <Outline
            alphabetizeOutline={this.state.alphabetizeOutline}
            onAlphabetizeClick={this.onAlphabetizeClick}
          />
        </TabPanels>
      </Tabs>
    );
  }
}

const mapStateToProps = state => {
  const newProjectRoot = getProjectDirectoryRoot(state);
  const extensionAsRoot = isExtensionDirectoryPath(newProjectRoot);

  return {
    cx: getContext(state),
    selectedTab: getSelectedPrimaryPaneTab(state),
    sourceSearchOn: getActiveSearch(state) === "source",
    projectRoot: newProjectRoot,
    rootExtensionName: extensionAsRoot ? getExtensionNameBySourceUrl(state, newProjectRoot) : null,
  };
};

const connector = connect(mapStateToProps, {
  setPrimaryPaneTab: actions.setPrimaryPaneTab,
  setActiveSearch: actions.setActiveSearch,
  closeActiveSearch: actions.closeActiveSearch,
  clearProjectDirectoryRoot: actions.clearProjectDirectoryRoot,
});

export default connector(PrimaryPanes);
