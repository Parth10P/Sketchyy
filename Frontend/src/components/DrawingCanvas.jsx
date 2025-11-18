import React, { useRef, useState, useEffect } from "react";
import { io } from "socket.io-client";

export default function DrawingCanvas() {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const socketRef = useRef(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [isEraser, setIsEraser] = useState(false);
  const prevStrokeRef = useRef({ color: "#000", width: 2 });

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

    // do not set eraser here; control it from state watcher below

    const handleMouseDown = (e) => {
      const { x, y } = getCanvasCoords(e);
      setIsDrawing(true);
      isDrawingRef.current = true;
      ctx.beginPath();
      ctx.moveTo(x, y);
      lastPointRef.current = { x, y };
    };

    const handleMouseMove = (e) => {
      if (!isDrawingRef.current) return;
      const { x, y } = getCanvasCoords(e);
      ctx.lineTo(x, y);
      ctx.stroke();
      // emit drawing data to server
      try {
        const prev = lastPointRef.current;
        if (socketRef.current && prev) {
          socketRef.current.emit("draw-line", {
            prevPoint: prev,
            currentPoint: { x, y },
            color: ctx.strokeStyle,
            width: ctx.lineWidth,
          });
        }
      } catch (e) {
        console.warn("emit draw-line failed", e);
      }
      lastPointRef.current = { x, y };
    };

    const stopDrawing = () => {
      setIsDrawing(false);
      isDrawingRef.current = false;
      ctx.closePath();
      lastPointRef.current = null;
    };

    // mouse events
    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", stopDrawing);
    canvas.addEventListener("mouseout", stopDrawing);

    // handle window resize
    window.addEventListener("resize", resize);

    // --- socket.io setup ---
    try {
      const SOCKET_URL =
        import.meta.env.VITE_API_URL || "http://localhost:3001";
      socketRef.current = io(SOCKET_URL);

      socketRef.current.on("connect", () => {
        console.log("connected to socket server", socketRef.current.id);
      });

      // load initial canvas history (array of draw-line events)
      socketRef.current.on("load-canvas", (history) => {
        if (!Array.isArray(history)) return;
        history.forEach((d) => {
          drawRemoteLine(d);
        });
      });

      // incoming draw events from other users
      socketRef.current.on("draw-line", (data) => {
        drawRemoteLine(data);
      });

      // clear events
      socketRef.current.on("clear-canvas", () => {
        // clear local canvas and repaint white background
        const cssWidth = window.innerWidth;
        const cssHeight = window.innerHeight;
        ctx.setTransform(1, 0, 0, 1, 0, 0); // reset transform
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(
          window.devicePixelRatio || 1,
          0,
          0,
          window.devicePixelRatio || 1,
          0,
          0
        );
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, cssWidth, cssHeight);
      });
    } catch (e) {
      console.warn("socket init failed", e);
    }

    // helper to draw lines received from server
    const drawRemoteLine = (data) => {
      try {
        if (!data) return;
        const prev = data.prevPoint;
        const cur = data.currentPoint;
        if (!prev || !cur) return;
        ctx.beginPath();
        ctx.lineWidth = data.width || 2;
        ctx.strokeStyle = data.color || "#000";
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(cur.x, cur.y);
        ctx.stroke();
        ctx.closePath();
      } catch (err) {
        console.log(err);
      }
    };

    // expose a small API to toggle eraser from outside the effect if needed
    canvas.__toggleEraser = (on) => {
      if (!ctxRef.current) return;
      if (on) {
        prevStrokeRef.current = {
          color: ctxRef.current.strokeStyle,
          width: ctxRef.current.lineWidth,
        };
        ctxRef.current.strokeStyle = "#ffffff";
        ctxRef.current.lineWidth = 20;
      } else {
        ctxRef.current.strokeStyle = prevStrokeRef.current.color || "#000";
        ctxRef.current.lineWidth = prevStrokeRef.current.width || 2;
      }
    };

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", stopDrawing);
      canvas.removeEventListener("mouseout", stopDrawing);
      window.removeEventListener("resize", resize);
    };
  }, []);

  // watch isEraser and toggle canvas eraser mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas && typeof canvas.__toggleEraser === "function") {
      canvas.__toggleEraser(isEraser);
    }
  }, [isEraser]);

  useEffect(() => {
    isDrawingRef.current = isDrawing;
  }, [isDrawing]);

  const handleToggleEraser = () => {
    setIsEraser((v) => !v);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    // local clear
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(
      window.devicePixelRatio || 1,
      0,
      0,
      window.devicePixelRatio || 1,
      0,
      0
    );
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    // notify server
    try {
      socketRef.current?.emit("clear-canvas");
    } catch (e) {
      console.warn("failed to emit clear", e);
    }
  };

  return (
    <>
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 10001,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={handleToggleEraser} style={{ padding: "6px 10px" }}>
          {isEraser ? "Eraser: ON" : "Eraser: OFF"}
        </button>
        <button onClick={handleClear} style={{ padding: "6px 10px" }}>
          Clear
        </button>
      </div>

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
    </>
  );
}
