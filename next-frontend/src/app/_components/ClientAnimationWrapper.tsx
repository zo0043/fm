'use client';

import React, { useState, useEffect } from 'react';

interface ClientAnimationWrapperProps {
  children: React.ReactNode;
}

interface FadeProps {
  in?: boolean;
  timeout?: number;
  children?: React.ReactNode;
}

interface SlideProps {
  in?: boolean;
  timeout?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  children?: React.ReactNode;
}

// 检查用户动画偏好
function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    setMatches(media.matches);

    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    media.addEventListener('change', listener);
    return () => media.removeEventListener('change', listener);
  }, [query]);

  return matches;
}

// 动画工具函数，用于根据用户偏好决定是否显示动画
export function useAnimationPreferences() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return { prefersReducedMotion };
}

// Fade动画组件，尊重用户偏好
export function ClientFade({ in: show = true, timeout = 300, children }: FadeProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  const [visible, setVisible] = useState(show && !prefersReducedMotion);

  useEffect(() => {
    if (!prefersReducedMotion) {
      const timer = setTimeout(() => setVisible(show), show ? 0 : timeout);
      return () => clearTimeout(timer);
    } else {
      setVisible(show);
    }
  }, [show, timeout, prefersReducedMotion]);

  return (
    <div
      className={`transition-opacity duration-${prefersReducedMotion ? 0 : timeout} ease-in-out`}
      style={{
        opacity: visible ? 1 : 0,
      }}
    >
      {children}
    </div>
  );
}

// Slide动画组件，尊重用户偏好
export function ClientSlide({ 
  in: show = true, 
  timeout = 300, 
  direction = 'up', 
  children 
}: SlideProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  const [visible, setVisible] = useState(show && !prefersReducedMotion);

  useEffect(() => {
    if (!prefersReducedMotion) {
      const timer = setTimeout(() => setVisible(show), show ? 0 : timeout);
      return () => clearTimeout(timer);
    } else {
      setVisible(show);
    }
  }, [show, timeout, prefersReducedMotion]);

  const getTransform = () => {
    if (!visible) {
      const offset = 20;
      switch (direction) {
        case 'up':
          return `translateY(${offset}px)`;
        case 'down':
          return `translateY(-${offset}px)`;
        case 'left':
          return `translateX(${offset}px)`;
        case 'right':
          return `translateX(-${offset}px)`;
        default:
          return `translateY(${offset}px)`;
      }
    }
    return 'translate(0, 0)';
  };

  return (
    <div
      className={`transition-transform duration-${prefersReducedMotion ? 0 : timeout} ease-in-out`}
      style={{
        transform: getTransform(),
      }}
    >
      {children}
    </div>
  );
}

export default function ClientAnimationWrapper({ children }: ClientAnimationWrapperProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  
  return (
    <div 
      className={prefersReducedMotion ? '' : 'transition-all duration-300 ease-in-out'}
      style={{ 
        animationPlayState: prefersReducedMotion ? 'paused' : 'running' 
      }}
    >
      {children}
    </div>
  );
}
