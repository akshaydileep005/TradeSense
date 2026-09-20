import React, { useEffect, useRef } from 'react';

export const CandleBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', handleResize);

    // Candle simulation bars
    const candleCount = Math.floor(width / 24);
    const candles: {
      x: number;
      y: number;
      bodyHeight: number;
      wickTop: number;
      wickBottom: number;
      isGreen: boolean;
      speed: number;
      opacity: number;
    }[] = [];

    let currentPrice = height * 0.5;

    for (let i = 0; i < candleCount; i++) {
      const isGreen = Math.random() > 0.48;
      const bodyH = Math.random() * 28 + 6;
      const wickT = Math.random() * 16 + 4;
      const wickB = Math.random() * 16 + 4;
      currentPrice += (Math.random() - 0.5) * 14;
      currentPrice = Math.max(height * 0.2, Math.min(height * 0.8, currentPrice));

      candles.push({
        x: i * 24,
        y: currentPrice,
        bodyHeight: bodyH,
        wickTop: wickT,
        wickBottom: wickB,
        isGreen,
        speed: 0.18 + Math.random() * 0.12,
        opacity: 0.12 + Math.random() * 0.08,
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1;
      const gridSize = 48;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Draw and drift candles
      candles.forEach((c) => {
        c.x -= c.speed;
        if (c.x < -30) {
          c.x = width + 20;
          c.isGreen = Math.random() > 0.48;
          c.bodyHeight = Math.random() * 28 + 6;
          c.y = height * 0.5 + (Math.random() - 0.5) * (height * 0.4);
        }

        const color = c.isGreen ? `rgba(0, 230, 118, ${c.opacity})` : `rgba(255, 59, 48, ${c.opacity})`;
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;

        // Wick
        ctx.beginPath();
        ctx.moveTo(c.x + 5, c.y - c.wickTop);
        ctx.lineTo(c.x + 5, c.y + c.bodyHeight + c.wickBottom);
        ctx.stroke();

        // Body
        ctx.fillRect(c.x + 1, c.y, 8, c.bodyHeight);
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};
