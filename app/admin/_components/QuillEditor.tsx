"use client";

import React, { useEffect, useRef } from "react";
import "quill/dist/quill.snow.css";

interface QuillEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

export default function QuillEditor({
  value,
  onChange,
  placeholder,
}: QuillEditorProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<any>(null);

  useEffect(() => {
    let isCurrent = true;

    if (!containerRef.current || quillRef.current) return;

    import("quill").then((QuillModule) => {
      if (!isCurrent) return;
      if (quillRef.current) return;

      const Quill = QuillModule.default;

      const modules = {
        toolbar: [
          [{ header: [3, false] }],
          ["bold"],
          ["link", "image", "code-block"],
          [{ list: "ordered" }, { list: "bullet" }],
          ["clean"],
        ],
      };

      const quill = new Quill(containerRef.current!, {
        theme: "snow",
        modules,
        placeholder:
          placeholder || "Deploy your analytical text structure here...",
      });

      quillRef.current = quill;

      if (value) {
        quill.root.innerHTML = value;
      }

      quill.on("text-change", () => {
        const html = quill.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    });

    return () => {
      isCurrent = false;
      quillRef.current = null;

      if (wrapperRef.current) {
        wrapperRef.current.innerHTML = '<div id="quill-container"></div>';
        containerRef.current = wrapperRef.current
          .firstElementChild as HTMLDivElement;
      }
    };
  }, []);

  useEffect(() => {
    if (quillRef.current && quillRef.current.root.innerHTML !== value) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div
      // FIX: Cleaned down harsh border utilities and forced bold fonts down to beautiful natural reading weight parameters safely.
      className="border border-chess-border border-opacity-30 rounded-xl overflow-hidden bg-chess-bg text-chess-text
                 [&_.ql-toolbar.ql-snow]:border-none [&_.ql-toolbar.ql-snow]:border-b [&_.ql-toolbar.ql-snow]:border-chess-border [&_.ql-toolbar.ql-snow]:border-opacity-20 [&_.ql-toolbar.ql-snow]:bg-chess-surface
                 [&_.ql-container.ql-snow]:border-none [&_.ql-editor]:min-h-[350px] [&_.ql-editor]:text-sm [&_.ql-editor]:font-medium [&_.ql-editor]:leading-relaxed
                 [&_.ql-editor.ql-blank::before]:text-chess-text [&_.ql-editor.ql-blank::before]:opacity-30 [&_.ql-editor.ql-blank::before]:font-medium"
    >
      <div ref={wrapperRef}>
        <div ref={containerRef} id="quill-container" />
      </div>
    </div>
  );
}
