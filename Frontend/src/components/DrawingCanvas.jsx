import React, { useRef, useState, useEffect } from "react";

export default function DrawingCanvas() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const isDrawingRef = useRef(false);

  const [isDrawing, setIsDrawing] = useState(false);

  // get coords in CSS pixels (context is scaled to devicePixelRatio)
  const getCanvasCoords = (event) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // helper to size canvas to fill viewport and handle devicePixelRatio
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const cssWidth = window.innerWidth;
      const cssHeight = window.innerHeight;

      // set backing store size
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);

      // set CSS size
      canvas.style.width = cssWidth + "px";
      canvas.style.height = cssHeight + "px";

      // reset transform and scale to DPR so drawing coordinates are in CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // fill white background
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, cssWidth, cssHeight);
    };

    // initial setup
    resize();

    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2;
    ctx.strokeStyle = "#000";

    ctxRef.current = ctx;

    const handleMouseDown = (e) => {
      const { x, y } = getCanvasCoords(e);
      setIsDrawing(true);
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;
      const { x, y } = getCanvasCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      isDrawingRef.current = false;
      ctx.closePath();
    };

    // mouse events
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // handle window resize
    window.addEventListener("resize", resize);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
      window.removeEventListener("resize", resize);
    };
  }, []);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  return (
    <canvas
      ref={canvasRef}
      aria-label="fullscreen drawing canvas"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "#ffffff",
        display: "block",
        zIndex: 9999,
        touchAction: "none",
      }}
    />
  );
}
