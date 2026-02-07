import { useCallback, useEffect, useState } from 'react';
import { matchPath, useLocation, useSearchParams } from 'react-router';

import type { McpRequest } from '~/models/mcp-request';

import type { GrpcRequest } from '../../models/grpc-request';
import type { MockRoute } from '../../models/mock-route';
import type { Project } from '../../models/project';
import type { Request } from '../../models/request';
import type { RequestGroup } from '../../models/request-group';
import type { SocketIORequest } from '../../models/socket-io-request';
import type { UnitTestSuite } from '../../models/unit-test-suite';
import type { WebSocketRequest } from '../../models/websocket-request';
import type { Workspace } from '../../models/workspace';
import { useDocBodyKeyboardShortcuts } from '../components/keydown-binder';
import { type BaseTab, type TabType } from '../components/tabs/tab';
import { TAB_ROUTER_PATH } from '../components/tabs/tab-list';
import { formatMethodName, getRequestMethodShortHand } from '../components/tags/method-tag';
import { useInsomniaTabContext } from '../context/app/insomnia-tab-context';

// Animation interfaces
export interface AnimationState {
  isSending: boolean;
  isSuccessful: boolean;
  hasError: boolean;
  startTime: number | null;
}

export interface AnimationConfig {
  duration: number;
  successDuration: number;
  errorDuration: number;
}

interface InsomniaTabProps {
  organizationId: string;
  projectId: string;
  workspaceId: string;
  activeProject: Project;
  activeWorkspace: Workspace;
  activeRequest?: Request | GrpcRequest | WebSocketRequest | SocketIORequest | McpRequest;
  activeRequestGroup?: RequestGroup;
  activeMockRoute?: MockRoute;
  unitTestSuite?: UnitTestSuite;
}

export const useInsomniaTab = ({
  organizationId,
  projectId,
  workspaceId,
  activeProject,
  activeWorkspace,
  activeRequest,
  activeRequestGroup,
  activeMockRoute,
  unitTestSuite,
}: InsomniaTabProps) => {
  const { appTabsRef, addTab, changeActiveTab, closeTabById } = useInsomniaTabContext();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  // Animation state for send request functionality
  const [animationState, setAnimationState] = useState<AnimationState>({
    isSending: false,
    isSuccessful: false,
    hasError: false,
    startTime: null,
  });

  const [animationConfig] = useState<AnimationConfig>({
    duration: 2000, // 2 seconds for sending animation
    successDuration: 1000, // 1 second for success animation
    errorDuration: 1500, // 1.5 seconds for error animation
  });

  // Animation control functions
  const startSendingAnimation = useCallback(() => {
    setAnimationState({
      isSending: true,
      isSuccessful: false,
      hasError: false,
      startTime: Date.now(),
    });
  }, []);

  const setSuccessAnimation = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isSending: false,
      isSuccessful: true,
      hasError: false,
    }));

    // Reset after success duration
    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        isSuccessful: false,
      }));
    }, animationConfig.successDuration);
  }, [animationConfig.successDuration]);

  const setErrorAnimation = useCallback(() => {
    setAnimationState(prev => ({
      ...prev,
      isSending: false,
      isSuccessful: false,
      hasError: true,
    }));

    // Reset after error duration
    setTimeout(() => {
      setAnimationState(prev => ({
        ...prev,
        hasError: false,
      }));
    }, animationConfig.errorDuration);
  }, [animationConfig.errorDuration]);

  const resetAnimation = useCallback(() => {
    setAnimationState({
      isSending: false,
      isSuccessful: false,
      hasError: false,
      startTime: null,
    });
  }, []);

  // Get animation CSS classes based on current state
  const getAnimationClasses = useCallback(
    (baseClasses: string = '') => {
      const classes = [baseClasses];

      if (animationState.isSending) {
        classes.push('animate-pulse', 'bg-opacity-80');
      }

      if (animationState.isSuccessful) {
        classes.push('animate-bounce', 'bg-green-500');
      }

      if (animationState.hasError) {
        classes.push('animate-shake', 'bg-red-500');
      }

      return classes.join(' ');
    },
    [animationState],
  );

  // Get animation progress percentage (0-100)
  const getAnimationProgress = useCallback(() => {
    if (!animationState.startTime || !animationState.isSending) {
      return 0;
    }

    const elapsed = Date.now() - animationState.startTime;
    const progress = Math.min((elapsed / animationConfig.duration) * 100, 100);
    return progress;
  }, [animationState.startTime, animationState.isSending, animationConfig.duration]);

  const generateTabUrl = useCallback(
    (type: TabType) => {
      if (type === 'request') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/debug/request/${activeRequest?._id}`;
      }

      if (type === 'folder') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/debug/request-group/${activeRequestGroup?._id}`;
      }

      if (type === 'collection') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/debug?doNotSkipToActiveRequest=true`;
      }

      if (type === 'environment') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/environment`;
      }

      if (type === 'runner') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/debug/runner${location.search}`;
      }

      if (type === 'mockServer') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/mock-server`;
      }

      if (type === 'mockRoute') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/mock-server/mock-route/${activeMockRoute?._id}`;
      }

      if (type === 'document') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/spec`;
      }

      if (type === 'test') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test`;
      }

      if (type === 'testSuite') {
        return `/organization/${organizationId}/project/${projectId}/workspace/${workspaceId}/test/test-suite/${unitTestSuite?._id}`;
      }
      return '';
    },
    [
      activeMockRoute?._id,
      activeRequest?._id,
      activeRequestGroup?._id,
      location.search,
      organizationId,
      projectId,
      unitTestSuite?._id,
      workspaceId,
    ],
  );

  const getTabType = (pathname: string): TabType | null => {
    for (const type in TAB_ROUTER_PATH) {
      const ifMatch = matchPath(
        {
          path: TAB_ROUTER_PATH[type as TabType],
          end: true,
        },
        pathname,
      );
      if (ifMatch) {
        return type as TabType;
      }
    }

    return null;
  };

  const getRunnerTabId = useCallback(() => {
    const folderId = searchParams.get('folder');
    if (folderId) {
      return `runner_${folderId}`;
    }
    return `runner_${workspaceId}`;
  }, [searchParams, workspaceId]);

  const getCurrentTab = useCallback(
    (type: TabType | null) => {
      if (!type) {
        return;
      }
      const currentOrgTabs = appTabsRef?.current?.[organizationId];
      if (type === 'request') {
        return currentOrgTabs?.tabList.find(tab => tab.id === activeRequest?._id);
      }

      if (type === 'folder') {
        return currentOrgTabs?.tabList.find(tab => tab.id === activeRequestGroup?._id);
      }

      if (type === 'runner') {
        // collection runner tab id is prefixed with 'runner_'
        const runnerTabId = getRunnerTabId();
        return currentOrgTabs?.tabList.find(tab => tab.id === runnerTabId);
      }

      if (type === 'mockRoute') {
        return currentOrgTabs?.tabList.find(tab => tab.id === activeMockRoute?._id);
      }

      if (type === 'testSuite') {
        return currentOrgTabs?.tabList.find(tab => tab.id === unitTestSuite?._id);
      }

      const collectionTabTypes: TabType[] = ['collection', 'document', 'environment', 'mockServer', 'test'];
      if (collectionTabTypes.includes(type)) {
        return currentOrgTabs?.tabList.find(tab => tab.id === workspaceId);
      }
      return;
    },
    [
      activeMockRoute?._id,
      activeRequest?._id,
      activeRequestGroup?._id,
      appTabsRef,
      getRunnerTabId,
      organizationId,
      unitTestSuite?._id,
      workspaceId,
    ],
  );

  const getTabId = useCallback(
    (type: TabType | null): string => {
      if (!type) {
        return '';
      }
      if (type === 'request') {
        return activeRequest?._id || '';
      }

      if (type === 'folder') {
        return activeRequestGroup?._id || '';
      }

      if (type === 'runner') {
        const runnerTabId = getRunnerTabId();
        return runnerTabId;
      }

      if (type === 'mockRoute') {
        return activeMockRoute?._id || '';
      }

      if (type === 'testSuite') {
        return unitTestSuite?._id || '';
      }
      const collectionTabTypes: TabType[] = ['collection', 'document', 'environment', 'mockServer', 'test'];
      if (collectionTabTypes.includes(type)) {
        return workspaceId;
      }

      return '';
    },
    [
      activeMockRoute?._id,
      activeRequest?._id,
      activeRequestGroup?._id,
      getRunnerTabId,
      unitTestSuite?._id,
      workspaceId,
    ],
  );

  const packTabInfo = useCallback(
    (type: TabType): BaseTab | undefined => {
      if (!type) {
        return undefined;
      }

      // Get common parameters
      const commonParams = {
        type,
        id: getTabId(type),
        url: generateTabUrl(type),
        organizationId,
        projectId,
        workspaceId,
        projectName: activeProject.name,
        workspaceName: activeWorkspace.name,
        temporary: false,
      };

      if (type === 'request') {
        return {
          ...commonParams,
          name: activeRequest?.name || 'New Request',
          tag: getRequestMethodShortHand(activeRequest),
          method: (activeRequest as Request)?.method || '',
        };
      }

      if (type === 'folder') {
        return {
          ...commonParams,
          name: activeRequestGroup?.name || 'My Folder',
        };
      }

      const collectionTabTypes: TabType[] = ['collection', 'document', 'environment', 'mockServer', 'test'];
      if (collectionTabTypes.includes(type)) {
        return {
          ...commonParams,
          name: activeWorkspace.name,
        };
      }

      if (type === 'runner') {
        return {
          ...commonParams,
          name: 'Runner',
        };
      }

      if (type === 'mockRoute') {
        return {
          ...commonParams,
          name: activeMockRoute?.name || 'Untitled mock route',
          tag: formatMethodName(activeMockRoute?.method || ''),
          method: activeMockRoute?.method || '',
        };
      }

      if (type === 'testSuite') {
        return {
          ...commonParams,
          name: unitTestSuite?.name || 'Untitled test suite',
        };
      }

      return;
    },
    [
      activeMockRoute?.method,
      activeMockRoute?.name,
      activeProject.name,
      activeRequest,
      activeRequestGroup?.name,
      activeWorkspace.name,
      generateTabUrl,
      getTabId,
      organizationId,
      projectId,
      unitTestSuite?.name,
      workspaceId,
    ],
  );

  useEffect(() => {
    const type = getTabType(location.pathname);
    const currentTab = getCurrentTab(type);
    if (!currentTab && type) {
      const tabInfo = packTabInfo(type);
      if (tabInfo) {
        let temporary = false;
        // current temporary tabs scope only for request collection
        if ((type === 'request' || type === 'folder' || type === 'collection') && !searchParams.get('created')) {
          temporary = true;
        }

        if (searchParams.get('created')) {
          const newSearchParams = new URLSearchParams(searchParams);
          newSearchParams.delete('created');
          setSearchParams(newSearchParams);
        }

        addTab({
          ...tabInfo,
          temporary,
        });
        return;
      }
    }

    // keep active tab in sync with the current route
    if (currentTab) {
      const currentActiveTabId = appTabsRef?.current?.[organizationId]?.activeTabId;
      if (currentActiveTabId !== currentTab.id) {
        changeActiveTab(currentTab.id, { navigate: false });
      }
    }
  }, [
    addTab,
    appTabsRef,
    changeActiveTab,
    getCurrentTab,
    location.pathname,
    organizationId,
    packTabInfo,
    searchParams,
    setSearchParams,
  ]);

  useDocBodyKeyboardShortcuts({
    close_tab: event => {
      event.preventDefault();
      const currentActiveTabId = appTabsRef?.current?.[organizationId]?.activeTabId;
      if (currentActiveTabId) {
        closeTabById(currentActiveTabId);
      }
    },
  });

  // Return animation functions and state for components to use
  return {
    // Animation state
    animationState,
    animationConfig,

    // Animation control functions
    startSendingAnimation,
    setSuccessAnimation,
    setErrorAnimation,
    resetAnimation,

    // Animation utilities
    getAnimationClasses,
    getAnimationProgress,
  };
};
