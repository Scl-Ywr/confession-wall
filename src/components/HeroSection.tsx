'use client';

import { useEffect, useRef } from 'react';

export default function HeroSection() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const FADE_DURATION = 500; // 0.5s
    let animationFrameId: number;

    const handleLoop = () => {
      if (!video) return;

      const currentTime = video.currentTime * 1000;
      const duration = video.duration * 1000;

      if (currentTime >= duration - FADE_DURATION) {
        // Fade out before the end
        video.style.opacity = '0';
      } else if (currentTime < FADE_DURATION) {
        // Fade in at the start
        video.style.opacity = `${currentTime / FADE_DURATION}`;
      } else {
        video.style.opacity = '1';
      }
    };

    const checkLoop = () => {
      handleLoop();
      animationFrameId = requestAnimationFrame(checkLoop);
    };

    const handleEnded = () => {
      if (!video) return;

      video.style.opacity = '0';
      setTimeout(() => {
        video.currentTime = 0;
        video.play();
      }, 100);
    };

    // Start monitoring
    animationFrameId = requestAnimationFrame(checkLoop);

    video.addEventListener('ended', handleEnded);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      {/* Video Background */}
      <div
        className="absolute inset-0 z-0"
        style={{
          top: '300px',
          left: 'auto',
          right: 'auto',
          bottom: 'auto',
        }}
      >
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover"
          style={{
            opacity: 0,
            transition: 'opacity 0.5s ease-in-out',
          }}
        >
          <source
            src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4"
            type="video/mp4"
          />
        </video>

        {/* Gradient Overlays */}
        <div className="absolute inset-0 bg-gradient-to-b from-white via-transparent to-white" />
      </div>

      {/* Navigation Bar */}
      <div className="relative z-10">
        {/* Will be imported from HeroNavbar component */}
      </div>

      {/* Hero Content */}
      <div
        className="relative z-10 flex flex-col items-center justify-center text-center px-6"
        style={{
          paddingTop: 'calc(8rem - 75px)',
          paddingBottom: '10rem',
        }}
      >
        {/* Headline */}
        <h1
          className="display-font text-5xl sm:text-7xl md:text-8xl max-w-7xl font-normal leading-[0.95] tracking-tight animate-fade-rise"
          style={{
            letterSpacing: '-2.46px',
            color: '#000000',
          }}
        >
          Beyond <span className="italic text-[#6F6F6F]">silence,</span> we build
          the <span className="italic text-[#6F6F6F]">eternal.</span>
        </h1>

        {/* Description */}
        <p
          className="body-font text-base sm:text-lg max-w-2xl mt-8 leading-relaxed animate-fade-rise-delay"
          style={{
            color: '#6F6F6F',
          }}
        >
          Building platforms for brilliant minds, fearless makers, and
          thoughtful souls. Through the noise, we craft digital havens for deep
          work and pure flows.
        </p>

        {/* CTA Button */}
        <button
          className="rounded-full px-14 py-5 text-base font-medium mt-12 bg-black text-white hover:scale-103 transition-transform animate-fade-rise-delay-2 body-font"
          style={{
            color: '#FFFFFF',
            backgroundColor: '#000000',
          }}
        >
          Begin Journey
        </button>
      </div>
    </div>
  );
}
