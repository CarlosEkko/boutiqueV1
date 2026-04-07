import React, { useRef, useEffect } from 'react';
import { Editor } from '@tinymce/tinymce-react';

const RichTextEditor = ({ value, onChange, placeholder = 'Escreva o conteúdo aqui...' }) => {
  const editorRef = useRef(null);

  const handleEditorChange = (content) => {
    if (onChange) onChange(content);
  };

  // Fix: Radix Dialog adds "inert" to TinyMCE auxiliary elements (menus, dialogs)
  // which blocks all interaction. This observer removes it immediately.
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const auxEls = document.querySelectorAll(
        '.tox-tinymce-aux[inert], .tox-dialog-wrap[inert], .tox-tinymce-aux[aria-hidden="true"]'
      );
      auxEls.forEach(el => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      });
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['inert', 'aria-hidden']
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="kb-editor-tinymce">
      <Editor
        tinymceScriptSrc="/tinymce/tinymce.min.js"
        onInit={(evt, editor) => { editorRef.current = editor; }}
        value={value || ''}
        onEditorChange={handleEditorChange}
        init={{
          license_key: 'gpl',
          height: 500,
          min_height: 400,
          placeholder,
          menubar: 'edit insert format table',
          plugins: [
            'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
            'preview', 'anchor', 'searchreplace', 'visualblocks', 'code',
            'fullscreen', 'insertdatetime', 'media', 'table', 'help',
            'wordcount', 'codesample', 'emoticons'
          ],
          toolbar: [
            'blocks fontsize | bold italic underline strikethrough | forecolor backcolor | table',
            'bullist numlist | alignleft aligncenter alignright alignjustify | outdent indent | blockquote codesample | link image media | code fullscreen | removeformat'
          ],
          table_toolbar: 'tableprops tabledelete | tableinsertrowbefore tableinsertrowafter tabledeleterow | tableinsertcolbefore tableinsertcolafter tabledeletecol',
          table_appearance_options: true,
          table_grid: true,
          table_default_styles: {
            'border-collapse': 'collapse',
            'width': '100%'
          },
          table_default_attributes: {
            border: '1'
          },
          content_style: `
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              font-size: 15px;
              color: #e5e7eb;
              background-color: #27272a;
              line-height: 1.7;
              padding: 16px;
            }
            body::before {
              color: #71717a !important;
            }
            h1 { font-size: 2em; font-weight: 600; color: #fff; margin: 0.8em 0 0.4em; }
            h2 { font-size: 1.5em; font-weight: 600; color: #fff; margin: 0.7em 0 0.35em; }
            h3 { font-size: 1.25em; font-weight: 600; color: #fff; margin: 0.6em 0 0.3em; }
            p { margin: 0 0 1em; color: #d1d5db; }
            a { color: #D4AF37; }
            blockquote { border-left: 4px solid #D4AF37; padding: 0.5em 1em; margin: 1em 0; background: rgba(212,175,55,0.05); border-radius: 0 6px 6px 0; color: #9ca3af; font-style: italic; }
            table { border-collapse: collapse; width: 100%; }
            table td, table th { border: 1px solid #3f3f46; padding: 8px 12px; }
            table th { background: #18181b; color: #fff; font-weight: 600; }
            table td { color: #d1d5db; }
            pre { background: #18181b; border-radius: 6px; padding: 1em; color: #d1d5db; overflow-x: auto; }
            code { background: #18181b; padding: 0.2em 0.4em; border-radius: 3px; font-size: 0.9em; }
            img { max-width: 100%; border-radius: 8px; }
            hr { border: none; border-top: 1px solid #3f3f46; margin: 2em 0; }
            ul, ol { padding-left: 1.5em; color: #d1d5db; }
            li { margin-bottom: 0.3em; }
            li::marker { color: #D4AF37; }
          `,
          skin: 'oxide-dark',
          content_css: 'dark',
          promotion: false,
          branding: false,
          resize: true,
          statusbar: true,
          elementpath: true,
          link_default_target: '_blank',
          image_advtab: true,
          automatic_uploads: false,
          file_picker_types: 'image',
          block_formats: 'Parágrafo=p; Título 1=h1; Título 2=h2; Título 3=h3; Pré-formatado=pre; Citação=blockquote',
          setup: (editor) => {
            editor.on('init', () => {
              const container = editor.getContainer();
              if (container) {
                container.style.borderRadius = '8px';
                container.style.overflow = 'hidden';
                container.style.border = '1px solid #3f3f46';
              }
            });
          }
        }}
      />
    </div>
  );
};

export default RichTextEditor;
