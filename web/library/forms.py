from django import forms
from django.utils.safestring import mark_safe
from .models import Pack


class MultipleFolderWidget(forms.ClearableFileInput):
    allow_multiple_selected = True

    def render(self, name, value, attrs=None, renderer=None):
        attrs = attrs or {}
        attrs.update({'directory': True, 'webkitdirectory': True, 'multiple': True, 'style': 'display: none;'})
        default_html = super().render(name, value, attrs, renderer)
        
        html_code = """
        <div class="dropzone-container" id="dropzone-container-{name}">
            <style>
                .dropzone-container {{
                    width: 100%;
                    max-width: 600px;
                    margin-bottom: 16px;
                }}
                .dropzone-box {{
                    border: 2px dashed rgba(128, 128, 128, 0.35);
                    background-color: rgba(128, 128, 128, 0.05);
                    border-radius: 8px;
                    padding: 32px 20px;
                    text-align: center;
                    cursor: pointer;
                    transition: all 0.2s ease-in-out;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 120px;
                }}
                .dropzone-box:hover {{
                    border-color: #3182ce;
                    background-color: rgba(49, 130, 206, 0.05);
                }}
                .dropzone-box.dragover {{
                    border-color: #3182ce;
                    background-color: rgba(49, 130, 206, 0.12);
                    box-shadow: 0 0 10px rgba(49, 130, 206, 0.1);
                }}
                .dropzone-icon {{
                    width: 36px;
                    height: 36px;
                    color: #a0aec0;
                    margin-bottom: 10px;
                    transition: transform 0.2s ease;
                }}
                .dropzone-box:hover .dropzone-icon {{
                    transform: translateY(-2px);
                    color: #3182ce;
                }}
                .dropzone-text {{
                    margin: 0 0 4px 0;
                    font-size: 14px;
                    font-weight: 500;
                    color: var(--body-fg, #4a5568);
                }}
                .dropzone-subtext {{
                    margin: 0;
                    font-size: 11px;
                    color: #718096;
                }}
                .dropzone-file-list {{
                    margin-top: 8px;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }}
                .dropzone-list-item {{
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 8px 12px;
                    background-color: rgba(128, 128, 128, 0.08);
                    border: 1px solid rgba(128, 128, 128, 0.15);
                    border-radius: 6px;
                    color: var(--body-fg, #2d3748);
                    font-size: 12.5px;
                    transition: background-color 0.15s ease;
                }}
                .dropzone-list-item:hover {{
                    background-color: rgba(128, 128, 128, 0.15);
                }}
                .dropzone-remove-btn {{
                    background: none;
                    border: none;
                    color: #e53e3e;
                    cursor: pointer;
                    font-weight: 600;
                    font-size: 11px;
                    padding: 2px 6px;
                    border-radius: 4px;
                    transition: background-color 0.15s ease;
                }}
                .dropzone-remove-btn:hover {{
                    background-color: rgba(229, 62, 62, 0.1);
                    color: #e53e3e;
                }}
            </style>
            
            <div class="dropzone-box" id="dropzone-{name}">
                <svg class="dropzone-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                <p class="dropzone-text">Drag & Drop folders here or click to browse</p>
                <p class="dropzone-subtext">Accepts directories containing audio files</p>
            </div>
            
            <div style="display: none;">
                {default_input}
            </div>
            
            <div class="dropzone-file-list" id="file-list-{name}">
                <div style="color: #718096; font-size: 11.5px; padding: 4px;">No folders selected</div>
            </div>
        </div>
        
        <script>
        (function() {{
            const name = "{name}";
            const dropzone = document.getElementById("dropzone-" + name);
            const container = document.getElementById("dropzone-container-" + name);
            const hiddenInput = container.querySelector("input[type=file]");
            const fileListContainer = document.getElementById("file-list-" + name);
            
            let foldersList = [];
            let folderIdCounter = 0;
            
            dropzone.addEventListener("click", () => {{
                hiddenInput.click();
            }});
            
            // Prevent default drag behaviors
            ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {{
                dropzone.addEventListener(eventName, e => {{
                    e.preventDefault();
                    e.stopPropagation();
                }}, false);
            }});
            
            // Highlight drop zone
            ["dragenter", "dragover"].forEach(eventName => {{
                dropzone.addEventListener(eventName, () => {{
                    dropzone.classList.add("dragover");
                }}, false);
            }});
            
            ["dragleave", "drop"].forEach(eventName => {{
                dropzone.addEventListener(eventName, () => {{
                    dropzone.classList.remove("dragover");
                }}, false);
            }});
            
            // Handle dropped folders/files
            dropzone.addEventListener("drop", async (e) => {{
                const dt = e.dataTransfer;
                const items = dt.items;
                
                if (items) {{
                    const promises = [];
                    for (let i = 0; i < items.length; i++) {{
                        const item = items[i];
                        if (item.kind === "file") {{
                            const entry = item.webkitGetAsEntry();
                            if (entry) {{
                                promises.push(traverseEntry(entry));
                            }}
                        }}
                    }}
                    
                    const results = await Promise.all(promises);
                    results.forEach(res => {{
                        if (res && res.files.length > 0) {{
                            addFolderToList(res.folderName, res.files);
                        }}
                    }});
                    updateHiddenInputAndUI();
                }}
            }}, false);
            
            // Handle selected folders from dialog
            hiddenInput.addEventListener("change", () => {{
                const files = Array.from(hiddenInput.files);
                if (files.length === 0) return;
                
                const groups = {{}};
                files.forEach(file => {{
                    let dirName = "Selected Folder";
                    if (file.webkitRelativePath) {{
                        const parts = file.webkitRelativePath.split("/");
                        if (parts.length > 0 && parts[0]) {{
                            dirName = parts[0];
                        }}
                    }}
                    if (!groups[dirName]) {{
                        groups[dirName] = [];
                    }}
                    groups[dirName].push(file);
                }});
                
                Object.entries(groups).forEach(([dirName, dirFiles]) => {{
                    addFolderToList(dirName, dirFiles);
                }});
                
                updateHiddenInputAndUI();
            }}, false);
            
            function addFolderToList(folderName, files) {{
                const validExtensions = ['.wav', '.mp3', '.ogg', '.flac', '.aif', '.aiff', '.m4a', '.mp4', '.aac', '.wma'];
                const audioFiles = files.filter(f => {{
                    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
                    return validExtensions.includes(ext);
                }});
                
                if (audioFiles.length === 0) return;
                
                foldersList.push({{
                    id: ++folderIdCounter,
                    name: folderName,
                    files: audioFiles
                }});
            }}
            
            async function traverseEntry(entry) {{
                const files = [];
                
                async function scan(item) {{
                    if (item.isFile) {{
                        const file = await new Promise(resolve => item.file(resolve));
                        files.push(file);
                    }} else if (item.isDirectory) {{
                        const entries = await readAllDirectoryEntries(item);
                        for (const subEntry of entries) {{
                            await scan(subEntry);
                        }}
                    }}
                }}
                
                await scan(entry);
                return {{ folderName: entry.name, files: files }};
            }}
            
            async function readAllDirectoryEntries(directoryEntry) {{
                const reader = directoryEntry.createReader();
                let entries = [];
                while (true) {{
                    const batch = await new Promise((resolve, reject) => {{
                        reader.readEntries(resolve, reject);
                    }});
                    if (batch.length === 0) break;
                    entries.push(...batch);
                }}
                return entries;
            }}
            
            function updateHiddenInputAndUI() {{
                const dt = new DataTransfer();
                let totalCount = 0;
                
                foldersList.forEach(folder => {{
                    folder.files.forEach(file => {{
                        dt.items.add(file);
                        totalCount++;
                    }});
                }});
                
                hiddenInput.files = dt.files;
                fileListContainer.innerHTML = "";
                
                if (foldersList.length === 0) {{
                    fileListContainer.innerHTML = '<div style="color: #718096; font-size: 11.5px; padding: 4px;">No folders selected</div>';
                    return;
                }}
                
                foldersList.forEach(folder => {{
                    const item = document.createElement("div");
                    item.className = "dropzone-list-item";
                    
                    const info = document.createElement("span");
                    info.innerHTML = "📁 <strong>" + escapeHtml(folder.name) + "</strong> (" + folder.files.length + " audio files)";
                    
                    const removeBtn = document.createElement("button");
                    removeBtn.type = "button";
                    removeBtn.className = "dropzone-remove-btn";
                    removeBtn.innerText = "Remove";
                    removeBtn.onclick = () => {{
                        removeFolder(folder.id);
                    }};
                    
                    item.appendChild(info);
                    item.appendChild(removeBtn);
                    fileListContainer.appendChild(item);
                }});
                
                const summary = document.createElement("div");
                summary.style.fontSize = "11px";
                summary.style.color = "var(--body-fg, #718096)";
                summary.style.marginTop = "6px";
                summary.style.textAlign = "right";
                summary.innerHTML = "Total files to upload: <strong>" + totalCount + "</strong>";
                fileListContainer.appendChild(summary);
            }}
            
            function removeFolder(id) {{
                foldersList = foldersList.filter(f => f.id !== id);
                updateHiddenInputAndUI();
            }}
            
            function escapeHtml(str) {{
                return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
            }}
        }})();
        </script>
        """
        return mark_safe(html_code.format(default_input=default_html, name=name))


class MultipleFileField(forms.FileField):
    def __init__(self, *args, **kwargs):
        kwargs.setdefault("widget", MultipleFolderWidget())
        super().__init__(*args, **kwargs)

    def clean(self, data, initial=None):
        single_file_clean = super().clean
        if isinstance(data, (list, tuple)):
            result = [single_file_clean(d, initial) for d in data]
        else:
            result = single_file_clean(data, initial)
        return result


class FileFieldForm(forms.Form):
    file_field = MultipleFileField()


class PackForm(forms.ModelForm):
    auto_upload = MultipleFileField(required=False, label="Single Pack Folder (Auto-Categorize with AI)")
    drums = MultipleFileField(required=False, label="Drums (Manual Upload)")
    bass = MultipleFileField(required=False, label="Bass (Manual Upload)")
    tonal = MultipleFileField(required=False, label="Tonal (Manual Upload)")
    vocals = MultipleFileField(required=False, label="Vocals (Manual Upload)")
    sfxs = MultipleFileField(required=False, label="SFXs (Manual Upload)")
    ambiences = MultipleFileField(required=False, label="Ambiences (Manual Upload)")

    class Meta:
        model = Pack
        fields = ["type", "name", "author", "cover", "tags", "auto_upload", "drums", "bass", "tonal", "vocals", "sfxs", "ambiences"]


