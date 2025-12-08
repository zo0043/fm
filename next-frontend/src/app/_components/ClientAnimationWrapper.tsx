'use client';

import React from 'react';
import { useMediaQuery } from '@mui/material';
import Fade, { type FadeProps } from '@mui/material/Fade';
import Slide, { type SlideProps } from '@mui/material/Slide';

interface ClientAnimationWrapperProps {
  children: React.ReactNode;
}

// 动画工具函数，用于根据用户偏好决定是否显示动画
export function useAnimationPreferences() {
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  return { prefersReducedMotion };
}

// Fade动画组件，尊重用户偏好
export function ClientFade(props: FadeProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  return <Fade {...props} in={!prefersReducedMotion && props.in} timeout={prefersReducedMotion ? 0 : props.timeout} />;
}

// Slide动画组件，尊重用户偏好
export function ClientSlide(props: SlideProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  return <Slide {...props} in={!prefersReducedMotion && props.in} timeout={prefersReducedMotion ? 0 : props.timeout} />;
}

export default function ClientAnimationWrapper({ children }: ClientAnimationWrapperProps) {
  const { prefersReducedMotion } = useAnimationPreferences();
  
  return (
    <div style={{ animationPlayState: prefersReducedMotion ? 'paused' : 'running' }}>
      {children}
    </div>
  );
}
