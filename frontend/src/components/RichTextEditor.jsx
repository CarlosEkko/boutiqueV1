import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

// Custom styles for dark theme - matching form inputs
const editorStyles = `
  .kb-editor .ql-toolbar {
    background: rgb(39 39 42);
    border: 1px solid rgb(63 63 70);
    border-radius: 8px 8px 0 0;
    position: sticky;
    top: 0;
    z-index: 10;
  }
  
  .kb-editor .ql-toolbar .ql-stroke {
    stroke: rgb(161 161 170);
  }
  
  .kb-editor .ql-toolbar .ql-fill {
    fill: rgb(161 161 170);
  }
  
  .kb-editor .ql-toolbar .ql-picker {
    color: rgb(161 161 170);
  }
  
  .kb-editor .ql-toolbar .ql-picker-options {
    background: rgb(39 39 42);
    border-color: rgb(63 63 70);
  }
  
  .kb-editor .ql-toolbar .ql-picker-label {
    color: rgb(161 161 170);
  }
  
  .kb-editor .ql-toolbar button:hover .ql-stroke,
  .kb-editor .ql-toolbar button.ql-active .ql-stroke {
    stroke: rgb(212 175 55);
  }
  
  .kb-editor .ql-toolbar button:hover .ql-fill,
  .kb-editor .ql-toolbar button.ql-active .ql-fill {
    fill: rgb(212 175 55);
  }
  
  .kb-editor .ql-container {
    background: rgb(39 39 42);
    border: 1px solid rgb(63 63 70);
    border-top: none;
    border-radius: 0 0 8px 8px;
    min-height: 300px;
    font-size: 15px;
  }
  
  .kb-editor .ql-container:focus-within {
    border-color: rgb(212 175 55);
    outline: none;
  }
  
  .kb-editor .ql-editor {
    color: rgb(255 255 255);
    min-height: 300px;
  }
  
  .kb-editor .ql-editor:focus {
    outline: none;
  }
  
  .kb-editor .ql-editor.ql-blank::before {
    color: rgb(113 113 122);
    font-style: normal;
  }
  
  .kb-editor .ql-editor h1 {
    color: white;
    font-size: 2em;
    margin-bottom: 0.5em;
  }
  
  .kb-editor .ql-editor h2 {
    color: white;
    font-size: 1.5em;
    margin-bottom: 0.4em;
  }
  
  .kb-editor .ql-editor h3 {
    color: white;
    font-size: 1.17em;
    margin-bottom: 0.3em;
  }
  
  .kb-editor .ql-editor p {
    margin-bottom: 1em;
    color: white;
  }
  
  .kb-editor .ql-editor a {
    color: rgb(212 175 55);
  }
  
  .kb-editor .ql-editor blockquote {
    border-left: 4px solid rgb(212 175 55);
    padding-left: 1em;
    margin-left: 0;
    color: rgb(209 213 219);
  }
  
  .kb-editor .ql-editor pre {
    background: rgb(24 24 27);
    border-radius: 6px;
    padding: 1em;
    overflow-x: auto;
  }
  
  .kb-editor .ql-editor code {
    background: rgb(24 24 27);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: monospace;
  }
  
  .kb-editor .ql-editor ul, 
  .kb-editor .ql-editor ol {
    padding-left: 1.5em;
    color: white;
  }
  
  .kb-editor .ql-editor li {
    color: white;
  }
  
  .kb-editor .ql-editor img {
    max-width: 100%;
    border-radius: 8px;
  }
  
  .kb-editor .ql-snow .ql-tooltip {
    background: rgb(39 39 42);
    border-color: rgb(63 63 70);
    color: white;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
  }
  
  .kb-editor .ql-snow .ql-tooltip input[type=text] {
    background: rgb(24 24 27);
    border-color: rgb(63 63 70);
    color: white;
  }
  
  .kb-editor .ql-snow .ql-tooltip a.ql-action::after,
  .kb-editor .ql-snow .ql-tooltip a.ql-remove::before {
    color: rgb(212 175 55);
  }
  
  /* Remove any green/emerald focus states */
  .kb-editor *:focus {
    outline: none !important;
    box-shadow: none !important;
  }
`;

const RichTextEditor = ({ value, onChange, placeholder = 'Escreva o conteúdo aqui...' }) => {
  // Quill modules configuration
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false
    }
  }), []);

  // Quill formats
  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image'
  ];

  return (
    <>
      <style>{editorStyles}</style>
      <div className="kb-editor">
        <ReactQuill
          theme="snow"
          value={value}
          onChange={onChange}
          modules={modules}
          formats={formats}
          placeholder={placeholder}
        />
      </div>
    </>
  );
};

export default RichTextEditor;
