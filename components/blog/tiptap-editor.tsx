"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Youtube from "@tiptap/extension-youtube";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Highlighter,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Video,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from "lucide-react";

export interface TiptapEditorProps {
  initialContent?: Record<string, unknown> | null;
  placeholder?: string;
  onChange?: (json: Record<string, unknown>, text: string) => void;
  onImageUploadRequest?: () => Promise<string | null>;
  readOnly?: boolean;
}

export function TiptapEditor({
  initialContent,
  placeholder = "Write your story here...",
  onChange,
  onImageUploadRequest,
  readOnly = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    editable: !readOnly,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      Highlight.configure({
        multicolor: false,
      }),
      TextAlign.configure({
        types: ["heading", "paragraph"],
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          rel: "noopener noreferrer nofollow",
          target: "_blank",
          class: "text-[#f36b3f] underline font-bold cursor-pointer",
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: "rounded-xl shadow-md max-w-full my-4 mx-auto",
        },
      }),
      Youtube.configure({
        HTMLAttributes: {
          class: "w-full aspect-video rounded-xl shadow-md my-4",
        },
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: initialContent && Object.keys(initialContent).length > 0 ? initialContent : undefined,
    onUpdate: ({ editor }) => {
      if (onChange) {
        const json = editor.getJSON() as Record<string, unknown>;
        const text = editor.getText();
        onChange(json, text);
      }
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[280px] rounded-xl border border-[#e5dcd1] bg-white p-6 animate-pulse flex items-center justify-center text-xs text-[#7c727e]">
        Initializing editor...
      </div>
    );
  }

  const addLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("Enter link URL:", previousUrl);

    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const addImage = async () => {
    if (onImageUploadRequest) {
      const url = await onImageUploadRequest();
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
      return;
    }

    const url = window.prompt("Enter image URL (https://...):");
    if (url && url.startsWith("https://")) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  const addYoutube = () => {
    const url = window.prompt("Enter YouTube video URL (https://www.youtube.com/watch?v=...):");
    if (url) {
      editor.chain().focus().setYoutubeVideo({ src: url }).run();
    }
  };

  const text = editor.getText();
  const wordCount = text.trim() ? text.trim().split(/\s+/).filter(Boolean).length : 0;
  const charCount = text.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));

  return (
    <div className="rounded-xl border border-[#e5dcd1] bg-white shadow-xs overflow-hidden">
      {/* Editor Toolbar */}
      {!readOnly && (
        <div className="flex flex-wrap items-center gap-1 border-b border-[#eee6dc] bg-[#faf8f5] p-2 text-xs">
          {/* History */}
          <button
            type="button"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-1.5 rounded hover:bg-[#eee6dc] text-[#211b29] disabled:opacity-30 cursor-pointer"
            title="Undo"
          >
            <Undo className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-1.5 rounded hover:bg-[#eee6dc] text-[#211b29] disabled:opacity-30 cursor-pointer"
            title="Redo"
          >
            <Redo className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e5dcd1] mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
              editor.isActive("heading", { level: 1 })
                ? "bg-[#211b29] text-white"
                : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Heading 1"
          >
            <Heading1 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
              editor.isActive("heading", { level: 2 })
                ? "bg-[#211b29] text-white"
                : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Heading 2"
          >
            <Heading2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1.5 rounded text-xs font-bold cursor-pointer ${
              editor.isActive("heading", { level: 3 })
                ? "bg-[#211b29] text-white"
                : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Heading 3"
          >
            <Heading3 className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e5dcd1] mx-1" />

          {/* Inline Marks */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("bold") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Bold"
          >
            <Bold className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("italic") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Italic"
          >
            <Italic className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("underline") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Underline"
          >
            <UnderlineIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("strike") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Strikethrough"
          >
            <Strikethrough className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("highlight") ? "bg-[#fce8df] text-[#f36b3f]" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Highlight"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e5dcd1] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("left").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "left" }) ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Align Left"
          >
            <AlignLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("center").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "center" }) ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Align Center"
          >
            <AlignCenter className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setTextAlign("right").run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive({ textAlign: "right" }) ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Align Right"
          >
            <AlignRight className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e5dcd1] mx-1" />

          {/* Blocks */}
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("bulletList") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Bullet List"
          >
            <List className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("orderedList") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Numbered List"
          >
            <ListOrdered className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("blockquote") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Blockquote"
          >
            <Quote className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleCodeBlock().run()}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("codeBlock") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Code Block"
          >
            <Code className="h-3.5 w-3.5" />
          </button>

          <div className="h-4 w-px bg-[#e5dcd1] mx-1" />

          {/* Media & Embeds */}
          <button
            type="button"
            onClick={addLink}
            className={`p-1.5 rounded cursor-pointer ${
              editor.isActive("link") ? "bg-[#211b29] text-white" : "hover:bg-[#eee6dc] text-[#211b29]"
            }`}
            title="Insert Link"
          >
            <LinkIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={addImage}
            className="p-1.5 rounded hover:bg-[#eee6dc] text-[#211b29] cursor-pointer"
            title="Insert Image"
          >
            <ImageIcon className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={addYoutube}
            className="p-1.5 rounded hover:bg-[#eee6dc] text-[#211b29] cursor-pointer"
            title="Insert YouTube Video"
          >
            <Video className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="p-1.5 rounded hover:bg-[#eee6dc] text-[#211b29] cursor-pointer"
            title="Divider"
          >
            <Minus className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Writing Canvas */}
      <div className="p-6 min-h-[360px] prose prose-sm sm:prose max-w-none focus:outline-none">
        <EditorContent
          editor={editor}
          className="outline-none min-h-[300px] font-sans leading-relaxed text-[#211b29]"
        />
      </div>

      {/* Editor Footer: Word Count, Char Count, Reading Time */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-[#eee6dc] bg-[#faf8f5] text-[10px] text-[#7c727e]">
        <div className="flex items-center gap-3">
          <span>{wordCount} words</span>
          <span>&bull;</span>
          <span>{charCount} characters</span>
          <span>&bull;</span>
          <span>{readingTime} min read</span>
        </div>
        <div className="font-semibold text-[#277a67]">
          Tiptap Rich-Text Engine
        </div>
      </div>
    </div>
  );
}

