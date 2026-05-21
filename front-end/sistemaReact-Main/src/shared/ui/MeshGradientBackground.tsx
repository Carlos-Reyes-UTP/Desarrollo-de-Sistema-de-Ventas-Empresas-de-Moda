import React, { useEffect, useRef } from 'react';

interface Blob {
  x: number;
  y: number;
  baseR: number;
  vx: number;
  vy: number;
  phase: number;
  alpha: number;
}
 
const BLOB_COUNT = 5;
const BLUR_PX = 160;

interface MeshGradientProps {
  soloPuntero?: boolean;
  blobColorRgb?: string;
}

const MeshGradientBackground: React.FC<MeshGradientProps> = ({
  soloPuntero = false,
  blobColorRgb = '15, 15, 15',
}) => {
  const blobColorRef = useRef(blobColorRgb);

  useEffect(() => {
    blobColorRef.current = blobColorRgb;
  }, [blobColorRgb]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soloPunteroRef = useRef(soloPuntero);

  useEffect(() => {
    soloPunteroRef.current = soloPuntero;
  }, [soloPuntero]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
 
    let raf: number;
    let w = 0, h = 0;
    let t = 0;
    let mx = -999, my = -999;
    let mouseAlpha = 0;
    let blobs: Blob[] = [];
 
    const resize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
 
      // Re-seed blobs on resize so they spread across the new dimensions
      blobs = Array.from({ length: BLOB_COUNT }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        baseR: Math.min(w, h) * (0.22 + Math.random() * 0.18),
        vx: (Math.random() - 0.5) * 0.55,
        vy: (Math.random() - 0.5) * 0.55,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.12 + Math.random() * 0.08, // Reducido de 0.28+
      }));
    };
 
    const onMouseMove = (e: MouseEvent) => { mx = e.clientX; my = e.clientY; };
    const onMouseLeave = () => { mx = -999; my = -999; };
 
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseleave', onMouseLeave);
    resize();
 
    const drawOrb = (
      x: number, y: number, r: number,
      alphaCenter: number, alphaMid: number,
    ) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      const rgb = blobColorRef.current;
      g.addColorStop(0,   `rgba(${rgb},${alphaCenter})`);
      g.addColorStop(0.45,`rgba(${rgb},${alphaMid})`);
      g.addColorStop(1,   `rgba(${rgb},0)`);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = g;
      ctx.fill();
    };
 
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      t += 0.007;
 
      // Cursor orb
      if (mx > 0) {
        mouseAlpha = Math.min(mouseAlpha + 0.07, 1);
        drawOrb(mx, my, 180, 0.38 * mouseAlpha, 0.12 * mouseAlpha);
      } else {
        mouseAlpha = Math.max(mouseAlpha - 0.04, 0);
        if (mouseAlpha > 0) drawOrb(mx, my, 180, 0.38 * mouseAlpha, 0.12 * mouseAlpha);
      }
 
      // Animated blobs — wrap-around instead of bouncing
      if (!soloPunteroRef.current) {
        for (const b of blobs) {
          b.x += b.vx + Math.sin(t * 0.8 + b.phase) * 0.55;
          b.y += b.vy + Math.cos(t * 0.8 + b.phase) * 0.55;

          if (b.x < -b.baseR) b.x = w + b.baseR;
          else if (b.x > w + b.baseR) b.x = -b.baseR;
          if (b.y < -b.baseR) b.y = h + b.baseR;
          else if (b.y > h + b.baseR) b.y = -b.baseR;

          // Pulsing radius + alpha
          const r = b.baseR * (1 + Math.sin(t * 1.4 + b.phase) * 0.1);
          const a = b.alpha * (1 + Math.sin(t * 1.1 + b.phase) * 0.15);

          drawOrb(b.x, b.y, r, a, a * 0.35);
        }
      }
 
      raf = requestAnimationFrame(draw);
    };
 
    draw();
 
    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseleave', onMouseLeave);
      cancelAnimationFrame(raf);
    };
  }, []);
 
  return (
    <canvas
      ref={canvasRef}
      className="hidden lg:block fixed inset-0 w-full h-full -z-10 pointer-events-none"
      style={{ filter: `blur(${BLUR_PX}px)` }}
    />
  );
};
 
export default MeshGradientBackground;
