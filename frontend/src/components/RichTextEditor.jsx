import React, { useMemo } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

const editorStyles = `
  .kb-editor .ql-toolbar {
    background: rgb(39 39 42);
    border: 1px solid rgb(63 63 70);
    border-radius: 8px 8px 0 0;
    position: sticky;
    top: 0;
    z-index: 10;
    flex-wrap: wrap;
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
  
  .kb-editor .ql-toolbar .ql-picker-label:hover,
  .kb-editor .ql-toolbar .ql-picker-label.ql-active {
    color: rgb(212 175 55);
  }
  
  .kb-editor .ql-toolbar .ql-picker-item:hover,
  .kb-editor .ql-toolbar .ql-picker-item.ql-selected {
    color: rgb(212 175 55);
  }
  
  .kb-editor .ql-container {
    background: rgb(39 39 42);
    border: 1px solid rgb(63 63 70);
    border-top: none;
    border-radius: 0 0 8px 8px;
    min-height: 400px;
    font-size: 15px;
  }
  
  .kb-editor .ql-container:focus-within {
    border-color: rgb(212 175 55);
  }
  
  .kb-editor .ql-editor {
    color: rgb(255 255 255);
    min-height: 400px;
    line-height: 1.8;
    padding: 1.5rem;
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
    font-weight: 600;
    margin-bottom: 0.6em;
    margin-top: 1em;
    line-height: 1.3;
  }
  
  .kb-editor .ql-editor h2 {
    color: white;
    font-size: 1.5em;
    font-weight: 600;
    margin-bottom: 0.5em;
    margin-top: 0.8em;
    line-height: 1.3;
  }
  
  .kb-editor .ql-editor h3 {
    color: white;
    font-size: 1.25em;
    font-weight: 600;
    margin-bottom: 0.4em;
    margin-top: 0.6em;
    line-height: 1.4;
  }
  
  .kb-editor .ql-editor p {
    margin-bottom: 1em;
    color: rgb(209 213 219);
    line-height: 1.75;
  }
  
  .kb-editor .ql-editor a {
    color: rgb(212 175 55);
    text-decoration: underline;
  }
  
  .kb-editor .ql-editor blockquote {
    border-left: 4px solid rgb(212 175 55);
    padding-left: 1em;
    margin: 1em 0;
    color: rgb(156 163 175);
    font-style: italic;
    background: rgba(212, 175, 55, 0.05);
    padding: 0.75em 1em;
    border-radius: 0 6px 6px 0;
  }
  
  .kb-editor .ql-editor pre {
    background: rgb(24 24 27);
    border-radius: 6px;
    padding: 1em;
    overflow-x: auto;
    margin: 1em 0;
  }
  
  .kb-editor .ql-editor code {
    background: rgb(24 24 27);
    padding: 0.2em 0.4em;
    border-radius: 4px;
    font-family: 'Fira Code', monospace;
    font-size: 0.9em;
  }
  
  .kb-editor .ql-editor ul,
  .kb-editor .ql-editor ol {
    padding-left: 1.5em;
    color: rgb(209 213 219);
    margin-bottom: 1em;
  }
  
  .kb-editor .ql-editor li {
    color: rgb(209 213 219);
    margin-bottom: 0.4em;
    line-height: 1.6;
  }

  .kb-editor .ql-editor li::marker {
    color: rgb(212 175 55);
  }
  
  .kb-editor .ql-editor img {
    max-width: 100%;
    border-radius: 8px;
    margin: 1em 0;
  }

  .kb-editor .ql-editor hr {
    border: none;
    border-top: 1px solid rgb(63 63 70);
    margin: 2em 0;
  }

  .kb-editor .ql-editor .ql-video {
    width: 100%;
    min-height: 320px;
    border-radius: 8px;
    margin: 1em 0;
  }

  /* Indent levels */
  .kb-editor .ql-editor .ql-indent-1 { padding-left: 2em; }
  .kb-editor .ql-editor .ql-indent-2 { padding-left: 4em; }
  .kb-editor .ql-editor .ql-indent-3 { padding-left: 6em; }
  .kb-editor .ql-editor .ql-indent-4 { padding-left: 8em; }

  /* Alignment */
  .kb-editor .ql-editor .ql-align-center { text-align: center; }
  .kb-editor .ql-editor .ql-align-right { text-align: right; }
  .kb-editor .ql-editor .ql-align-justify { text-align: justify; }
  
  .kb-editor .ql-snow .ql-tooltip {
    background: rgb(39 39 42);
    border-color: rgb(63 63 70);
    color: white;
    box-shadow: 0 10px 25px rgba(0,0,0,0.5);
    z-index: 20;
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
  
  .kb-editor *:focus {
    outline: none !important;
    box-shadow: none !important;
  }

  /* Size picker display */
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-label::before,
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-item::before {
    content: 'Normal';
  }
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="small"]::before,
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="small"]::before {
    content: 'Pequeno';
  }
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="large"]::before,
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="large"]::before {
    content: 'Grande';
  }
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-label[data-value="huge"]::before,
  .kb-editor .ql-snow .ql-picker.ql-size .ql-picker-item[data-value="huge"]::before {
    content: 'Muito Grande';
  }

  /* Header picker display */
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-label::before {
    content: 'Texto Normal';
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="1"]::before {
    content: 'Titulo 1';
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="2"]::before {
    content: 'Titulo 2';
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-label[data-value="3"]::before {
    content: 'Titulo 3';
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-item::before {
    content: 'Texto Normal';
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="1"]::before {
    content: 'Titulo 1';
    font-size: 1.5em;
    font-weight: bold;
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="2"]::before {
    content: 'Titulo 2';
    font-size: 1.25em;
    font-weight: bold;
  }
  .kb-editor .ql-snow .ql-picker.ql-header .ql-picker-item[data-value="3"]::before {
    content: 'Titulo 3';
    font-size: 1.1em;
    font-weight: bold;
  }
`;

const RichTextEditor = ({ value, onChange, placeholder = 'Escreva o conteudo aqui...' }) => {
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        [{ 'size': ['small', false, 'large', 'huge'] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'color': [] }, { 'background': [] }],
        [{ 'list': 'ordered' }, { 'list': 'bullet' }],
        [{ 'indent': '-1' }, { 'indent': '+1' }],
        [{ 'align': [] }],
        ['blockquote', 'code-block'],
        ['link', 'image', 'video'],
        ['clean']
      ],
    },
    clipboard: {
      matchVisual: false
    }
  }), []);

  const formats = [
    'header', 'size',
    'bold', 'italic', 'underline', 'strike',
    'color', 'background',
    'list', 'bullet', 'indent',
    'align',
    'blockquote', 'code-block',
    'link', 'image', 'video'
  ];

  return (
    <>
      <style>{editorStyles}</style>
      <div className="kb-editor">
        <ReactQuill
          theme="snow"
          value={value || ''}
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
