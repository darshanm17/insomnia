import { useCallback, useState } from 'react';

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

export const useSendAnimation = (config: Partial<AnimationConfig> = {}) => {
  const [animationState, setAnimationState] = useState<AnimationState>({
    isSending: false,
    isSuccessful: false,
    hasError: false,
    startTime: null,
  });

  const animationConfig: AnimationConfig = {
    duration: 2000, // 2 seconds for sending animation
    successDuration: 1000, // 1 second for success animation
    errorDuration: 1500, // 1.5 seconds for error animation
    ...config,
  };

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
        classes.push('animate-pulse', 'bg-opacity-80', 'relative');
      }

      if (animationState.isSuccessful) {
        classes.push('animate-success-burst', 'bg-green-500', 'relative');
      }

      if (animationState.hasError) {
        classes.push('animate-shake', 'bg-red-500', 'relative');
      }

      return classes.join(' ');
    },
    [animationState],
  );

  // Get animation emoji for visual effects
  const getAnimationEmoji = useCallback(() => {
    if (animationState.isSending) {
      return '🚀';
    }

    if (animationState.isSuccessful) {
      return '🎉';
    }

    if (animationState.hasError) {
      return '💥';
    }

    return '';
  }, [animationState]);

  // Get animation class for emoji
  const getEmojiAnimationClass = useCallback(() => {
    if (animationState.isSending) {
      return 'animate-rocket-launch';
    }

    if (animationState.isSuccessful || animationState.hasError) {
      return 'animate-party-popper';
    }

    return '';
  }, [animationState]);

  // Get animation progress percentage (0-100)
  const getAnimationProgress = useCallback(() => {
    if (!animationState.startTime || !animationState.isSending) {
      return 0;
    }

    const elapsed = Date.now() - animationState.startTime;
    const progress = Math.min((elapsed / animationConfig.duration) * 100, 100);
    return progress;
  }, [animationState.startTime, animationState.isSending, animationConfig.duration]);

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
    getAnimationEmoji,
    getEmojiAnimationClass,
    getAnimationProgress,
  };
};
