import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import { sanitizeBoardContent } from "../utils/boardContent";

function EditorButton({ active, disabled, label, onClick, title }) {
  return (
    <button
      type="button"
      className={`boardEditorToolbarBtn ${active ? "isActive" : ""}`}
      onClick={onClick}
      disabled={disabled}
      title={title || label}
    >
      {label}
    </button>
  );
}

export default function RichTextEditor({ value, onChange }) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),
      Underline,
      Link.configure({
        openOnClick: true,
        autolink: true,
        defaultProtocol: "https",
      }),
    ],
    content: sanitizeBoardContent(value),
    onUpdate: ({ editor: nextEditor }) => {
      onChange(nextEditor.getHTML());
    },
    editorProps: {
      attributes: {
        class: "boardEditorSurface",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;

    const normalized = sanitizeBoardContent(value);
    if (normalized !== editor.getHTML()) {
      editor.commands.setContent(normalized, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  function handleLink() {
    const previousUrl = editor.getAttributes("link").href || "";
    const url = window.prompt("링크 주소를 입력해주세요.", previousUrl);

    if (url === null) return;

    if (!url.trim()) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="boardEditor">
      <div className="boardEditorToolbar">
        <EditorButton
          label="B"
          title="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <EditorButton
          label="I"
          title="기울임"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <EditorButton
          label="U"
          title="밑줄"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        />
        <EditorButton
          label="S"
          title="취소선"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <EditorButton
          label="•"
          title="목록"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <EditorButton
          label="1."
          title="번호 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <EditorButton
          label="❝"
          title="인용문"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <EditorButton
          label="링크"
          title="링크"
          active={editor.isActive("link")}
          onClick={handleLink}
        />
        <EditorButton
          label="H2"
          title="제목 2"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <EditorButton
          label="H3"
          title="제목 3"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <EditorButton
          label="초기화"
          title="서식 지우기"
          onClick={() =>
            editor.chain().focus().clearNodes().unsetAllMarks().run()
          }
        />
      </div>

      <EditorContent editor={editor} />
      <div className="boardEditorHint">
        굵게, 밑줄, 취소선, 목록, 링크, 인용문까지 자유롭게 사용할 수 있어요.
      </div>
    </div>
  );
}
