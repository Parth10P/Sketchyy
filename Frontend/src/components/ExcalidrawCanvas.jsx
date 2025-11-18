import React, { useCallback, useRef, useState, useEffect } from "react";
import Excalidraw from "@excalidraw/excalidraw";

// Minimal Excalidraw page with simple login and localStorage persistence.
export default function ExcalidrawCanvas() {
  const excalidrawApiRef = useRef(null);
  const setExcalidrawApi = useCallback((api) => {
    excalidrawApiRef.current = api;
  }, []);

  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user")) || null;
    } catch {
      return null;
    }
  });

  const [loginName, setLoginName] = useState("");

  const params = new URLSearchParams(window.location.search);
  const boardId = params.get("id") || "default";

  const storageKey = `sketchyy_board_${boardId}`;
  const [boardTitle, setBoardTitle] = useState("Untitled Board");
  const [isEraserActive, setIsEraserActive] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      requestAnimationFrame(() => {
        if (parsed?.title) setBoardTitle(parsed.title);
        if (parsed?.elements && excalidrawApiRef.current) {
          excalidrawApiRef.current.updateScene({
            elements: parsed.elements,
            appState: parsed.appState || { viewBackgroundColor: "#ffffff" },
          });
        }
      });
    } catch (e) {
      console.warn("failed to load board", e);
    }
  }, [storageKey]);

  const onChange = useCallback(() => {}, []);

  const handleLogin = () => {
    if (!loginName.trim()) return;
    const u = { name: loginName.trim(), id: Math.random().toString(36).slice(2, 9) };
    localStorage.setItem("user", JSON.stringify(u));
    setUser(u);
  };

  const saveBoard = () => {
    if (!excalidrawApiRef.current) return;
    try {
      const elements = excalidrawApiRef.current.getSceneElements();
      const appState = excalidrawApiRef.current.getAppState();
      const data = { title: boardTitle, elements, appState };
      localStorage.setItem(storageKey, JSON.stringify(data));
      alert("Saved board locally");
    } catch (e) {
      console.error(e);
      alert("Save failed");
    }
  };

  const loadBoard = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return alert("No saved board");
      const parsed = JSON.parse(raw);
      if (parsed?.title) setBoardTitle(parsed.title);
      if (parsed?.elements && excalidrawApiRef.current) {
        excalidrawApiRef.current.updateScene({ elements: parsed.elements, appState: parsed.appState || {} });
      }
      alert("Board loaded");
    } catch (e) {
      console.error(e);
      alert("Load failed");
    }
  };

  const clearBoard = () => {
    if (!excalidrawApiRef.current) return;
    excalidrawApiRef.current.updateScene({ elements: [], appState: { viewBackgroundColor: "#ffffff" } });
    alert("Cleared board");
  };

  const toggleEraser = () => {
    if (!excalidrawApiRef.current) return;
    const next = !isEraserActive;
    setIsEraserActive(next);
    try {
      const appState = excalidrawApiRef.current.getAppState?.() || { viewBackgroundColor: "#ffffff" };
      const newAppState = { ...appState, activeTool: next ? { type: "eraser" } : { type: "selection" } };
      excalidrawApiRef.current.updateScene({ elements: excalidrawApiRef.current.getSceneElements(), appState: newAppState });
    } catch (e) {
      console.warn("failed to toggle eraser", e);
      alert("Eraser may not be available in this Excalidraw build");
    }
  };

  const handleExport = async (type) => {
    if (!excalidrawApiRef.current) return;
    try {
      const elements = excalidrawApiRef.current.getSceneElements();
      const appState = excalidrawApiRef.current.getAppState();
      if (type === "png") {
        const blob = await excalidrawApiRef.current.exportToBlob({ elements, appState, mimeType: "image/png" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${boardTitle}.png`;
        a.click();
      } else if (type === "svg") {
        const svg = await excalidrawApiRef.current.exportToSvg({ elements, appState });
        const svgString = new XMLSerializer().serializeToString(svg);
        const blob = new Blob([svgString], { type: "image/svg+xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${boardTitle}.svg`;
        a.click();
      }
    } catch (e) {
      console.error(e);
      alert("Export failed");
    }
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      {!user && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
          <div style={{ background: "white", padding: 20, borderRadius: 8, width: 320 }}>
            <h3>Login</h3>
            <input value={loginName} onChange={(e) => setLoginName(e.target.value)} placeholder="Your name" style={{ width: "100%", padding: 8, marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={handleLogin}>Login</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <strong>{boardTitle}</strong>
        <input value={boardTitle} onChange={(e) => setBoardTitle(e.target.value)} style={{ padding: 6 }} />
        <button onClick={saveBoard}>Save</button>
        <button onClick={loadBoard}>Load</button>
        <button onClick={clearBoard}>Clear</button>
        <button onClick={() => handleExport("png")}>Export PNG</button>
        <button onClick={() => handleExport("svg")}>Export SVG</button>
        <button onClick={toggleEraser} style={{ marginLeft: 8 }}>{isEraserActive ? "Eraser ON" : "Eraser OFF"}</button>
      </div>

      <div style={{ flexGrow: 1, position: "relative" }}>
        <Excalidraw
          excalidrawAPI={setExcalidrawApi}
          initialData={{ elements: [], appState: { viewBackgroundColor: "#ffffff" } }}
          onChange={(elements, appState) => onChange(elements, appState)}
        />
      </div>
    </div>
  );
}

  