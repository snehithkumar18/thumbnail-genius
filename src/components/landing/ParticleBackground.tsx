import { useCallback, useMemo } from "react";
import Particles from "@tsparticles/react";
import { loadSlim } from "@tsparticles/slim";
import type { Engine } from "@tsparticles/engine";

const ParticleBackground = () => {
  const particlesInit = useCallback(async (engine: Engine) => {
    await loadSlim(engine);
  }, []);

  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  const options = useMemo(
    () => ({
      fullScreen: false,
      fpsLimit: 60,
      particles: {
        number: { value: isMobile ? 40 : 80, density: { enable: true } },
        color: {
          value: ["#FF4500", "#FF4500", "#FF4500", "#FFD700", "#FFFFFF"],
        },
        opacity: { value: { min: 0.15, max: 0.4 } },
        size: { value: { min: 1, max: 3 } },
        move: {
          enable: true,
          speed: 0.6,
          direction: "none" as const,
          outModes: { default: "out" as const },
        },
        links: {
          enable: true,
          distance: 120,
          color: "#FF4500",
          opacity: 0.08,
        },
      },
      interactivity: {
        events: {
          onHover: { enable: !isMobile, mode: "repulse" },
          onClick: { enable: true, mode: "push" },
        },
        modes: {
          repulse: { distance: 80, speed: 0.5 },
          push: { quantity: 8 },
        },
      },
      detectRetina: true,
    }),
    [isMobile]
  );

  return (
    <Particles
      id="hero-particles"
      className="absolute inset-0 z-0"
      init={particlesInit}
      options={options}
    />
  );
};

export default ParticleBackground;
