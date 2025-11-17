import React, { useCallback, useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";

// This component follows the official Excalidraw integration pattern:
// - Use a ref to access Excalidraw instance methods (getSceneElements, updateScene, etc.)
// - Provide initialData and onChange to keep a copy of the scene locally
// - Do NOT import the CSS from the package here; the app already loads it via CDN
//   in index.html to avoid Vite resolution issues.

export default function ExcalidrawCanvas() {
  const excalidrawRef = useRef(null);
  const [elements, setElements] = useState([]);
  const [appState, setAppState] = useState({ viewBackgroundColor: "#ffffff" });

  // onChange is called by Excalidraw when elements/appState change
  const onChange = useCallback((nextElements, nextAppState) => {
    setElements(nextElements ?? []);
    if (nextAppState) setAppState(nextAppState);
  }, []);

  const saveToLocalStorage = () => {
    try {
      const data = { elements, appState };
      localStorage.setItem("excalidraw_data", JSON.stringify(data));
      alert("Saved to localStorage");
    } catch (err) {
      console.error(err);
      alert("Failed to save");
    }
  };

  const loadFromLocalStorage = () => {
    try {
      const raw = localStorage.getItem("excalidraw_data");
      if (!raw) return alert("No saved data");
      const parsed = JSON.parse(raw);
      // update the scene via Excalidraw API
      excalidrawRef.current.updateScene({
        elements: parsed.elements || [],
        appState: parsed.appState || {},
      });
    } catch (err) {
      console.error(err);
      alert("Failed to load");
    }
  };

  const clearScene = () => {
    excalidrawRef.current.updateScene({
      elements: [],
      appState: { viewBackgroundColor: "#ffffff" },
    });
    setElements([]);
  };

  const logElements = () => {
    const els = excalidrawRef.current?.getSceneElements() ?? [];
    console.log("Excalidraw elements:", els);
    alert(`Elements: ${els.length}`);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999 }}>
      <Excalidraw
        ref={excalidrawRef}
        initialData={{
          elements: [],
          appState: { viewBackgroundColor: "#ffffff" },
        }}
        onChange={onChange}
        // You can customize toolbar and UIOptions per the docs
        UIOptions={{ canvasActions: { changeViewBackgroundColor: false } }}
      />

      <div
        style={{
          position: "fixed",
          top: 12,
          right: 12,
          zIndex: 10000,
          display: "flex",
          gap: 8,
        }}
      >
        <button onClick={saveToLocalStorage}>Save</button>
        <button onClick={loadFromLocalStorage}>Load</button>
        <button onClick={clearScene}>Clear</button>
        <button onClick={logElements}>Log</button>
      </div>
    </div>
  );
}
