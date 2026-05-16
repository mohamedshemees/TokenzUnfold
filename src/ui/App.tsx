import React, { useState } from 'react';

// Theme Definitions (Mirrored from code.ts for preview)
interface ThemeColors {
    containerFill: string;
    containerStroke: string;
    headerFill: string;
    headerText: string;
    bodyFill: string;
    bodyStroke: string;
    textPrimary: string;
    textSecondary: string;
    prefix: string;
    connector: string;
}



// Simplified Theme definitions using Hex strings for CSS
const THEMES: { [key: string]: ThemeColors } = {
    'dark': {
        containerFill: '#211C1A', // approx { r: 0.13, g: 0.11, b: 0.1 }
        containerStroke: '#4D4D4D',
        headerFill: '#333333',
        headerText: '#FFFFFF',
        bodyFill: '#211C1A',
        bodyStroke: '#4D4D4D',
        textPrimary: '#E6E6E6',
        textSecondary: '#999999',
        prefix: '#FFB84D', // Warm Gold
        connector: '#3399FF'
    },
    'light': {
        containerFill: '#FAFAFA',
        containerStroke: '#D9D9D9',
        headerFill: '#E6E6E6',
        headerText: '#333333',
        bodyFill: '#FFFFFF',
        bodyStroke: '#E6E6E6',
        textPrimary: '#333333',
        textSecondary: '#808080',
        prefix: '#CC6600', // Burnt Orange
        connector: '#333333'
    },
    'blueprint': {
        containerFill: '#0D1A33', // Deep Blue
        containerStroke: '#3366CC',
        headerFill: '#1A3366',
        headerText: '#66CCFF',
        bodyFill: '#0D1A33',
        bodyStroke: '#3366CC',
        textPrimary: '#CCE6FF',
        textSecondary: '#6699CC',
        prefix: '#00FFFF', // Cyan
        connector: '#00FFFF'
    }
};

const App = () => {
    const [options, setOptions] = useState({
        annotateColors: true,
        annotateTypography: true,
        annotateStates: true,
        annotateRadius: true,
        annotateEffects: true,
        annotateLayout: false,
        theme: 'dark', // Default theme
    });
    const [isExporting, setIsExporting] = useState(false);
    const [exportDialogVisible, setExportDialogVisible] = useState(false);
    const [exportSelection, setExportSelection] = useState<any[]>([]);
    const [exportTarget, setExportTarget] = useState<'android_studio' | 'local'>('android_studio');
    const [exportPort, setExportPort] = useState('6789');
    const [globalExportFormat, setGlobalExportFormat] = useState('PNG');
    const exportTargetRef = React.useRef(exportTarget);
    const exportPortRef = React.useRef(exportPort);
    const globalExportFormatRef = React.useRef(globalExportFormat);
    const resizeHandleRef = React.useRef<HTMLDivElement>(null);

    const handleResizePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        if (resizeHandleRef.current) {
            resizeHandleRef.current.setPointerCapture(e.pointerId);
        }
        (window as any).isResizing = true;
        e.preventDefault();
    };

    React.useEffect(() => {
        const handlePointerMove = (e: PointerEvent) => {
            if ((window as any).isResizing) {
                const newWidth = Math.round(Math.max(300, e.clientX));
                const newHeight = Math.round(Math.max(500, e.clientY));
                parent.postMessage({ pluginMessage: { type: 'resize', width: newWidth, height: newHeight } }, '*');
            }
        };

        const handlePointerUp = (e: PointerEvent) => {
            if ((window as any).isResizing) {
                (window as any).isResizing = false;
                if (resizeHandleRef.current) {
                    try {
                        resizeHandleRef.current.releasePointerCapture(e.pointerId);
                    } catch (err) {}
                }
            }
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        
        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };
    }, []);

    React.useEffect(() => {
        exportTargetRef.current = exportTarget;
    }, [exportTarget]);

    React.useEffect(() => {
        exportPortRef.current = exportPort;
    }, [exportPort]);

    React.useEffect(() => {
        globalExportFormatRef.current = globalExportFormat;
    }, [globalExportFormat]);

    const onAnnotate = () => {
        parent.postMessage({ pluginMessage: { type: 'annotate-selection', options } }, '*');
    };

    const onCancel = () => {
        parent.postMessage({ pluginMessage: { type: 'cancel' } }, '*');
    };

    const handleCheckboxChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, checked } = event.target;
        setOptions(prev => ({ ...prev, [name]: checked }));
    };

    const handleSelectChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const { name, value } = event.target;
        setOptions(prev => ({ ...prev, [name]: value }));
    };

    // Send theme update message whenever theme changes
    React.useEffect(() => {
        parent.postMessage({ pluginMessage: { type: 'update-theme', theme: options.theme } }, '*');
    }, [options.theme]);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const pluginMessage = event.data.pluginMessage;
            if (!pluginMessage) return;

            const { type, images, selection } = pluginMessage;

            if (type === 'selection-for-export') {
                if (!selection || selection.length === 0) {
                     parent.postMessage({ pluginMessage: { type: 'notify', message: 'Please select at least one element' } }, '*');
                     return;
                }
                
                // Cleanup old preview URLs
                setExportSelection(prev => {
                    prev.forEach(item => {
                        if (item.previewUrl) window.URL.revokeObjectURL(item.previewUrl);
                    });
                    return prev;
                });

                const newSelection = selection.map((s: any) => {
                    let previewUrl = null;
                    if (s.preview) {
                        const blob = new Blob([s.preview], { type: 'image/png' });
                        previewUrl = window.URL.createObjectURL(blob);
                    }
                    return { 
                        ...s, 
                        selected: true, 
                        format: globalExportFormatRef.current, 
                        previewUrl,
                        densities: {
                            mdpi: true,
                            hdpi: true,
                            xhdpi: true,
                            xxhdpi: true,
                            xxxhdpi: true
                        }
                    };
                });
                setExportSelection(newSelection);
                setExportDialogVisible(true);
            } else if (type === 'export-error') {
                setIsExporting(false);
            } else if (type === 'export-success') {
                const arrayBufferToBase64 = (buffer: Uint8Array) => {
                    let binary = '';
                    const bytes = new Uint8Array(buffer);
                    const len = bytes.byteLength;
                    for (let i = 0; i < len; i++) {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    return window.btoa(binary);
                };

                const densitySuffixMap: Record<string, string> = {
                    mdpi: '@1x',
                    hdpi: '@1.5x',
                    xhdpi: '@2x',
                    xxhdpi: '@3x',
                    xxxhdpi: '@4x'
                };

                const payload = {
                    images: images.map((img: any) => ({
                        name: img.name,
                        data: arrayBufferToBase64(img.data),
                        width: img.width,
                        height: img.height,
                        density: img.density,
                        format: img.format
                    }))
                };

                if (exportTargetRef.current === 'android_studio') {
                    const port = exportPortRef.current || '6789';
                    fetch(`http://localhost:${port}/import`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    }).then(res => {
                        setIsExporting(false);
                        setExportDialogVisible(false);
                        if (res.ok) {
                            parent.postMessage({ pluginMessage: { type: 'notify', message: 'Successfully synced assets to Android Studio!' } }, '*');
                        } else {
                            parent.postMessage({ pluginMessage: { type: 'notify', message: 'Failed to sync assets to Android Studio.' } }, '*');
                        }
                    }).catch(err => {
                        setIsExporting(false);
                        parent.postMessage({ pluginMessage: { type: 'notify', message: 'Android Studio plugin is not running. Please open your project first.' } }, '*');
                    });
                } else if (exportTargetRef.current === 'local') {
                    import('jszip').then((JSZip) => {
                        const zip = new JSZip.default();
                        const densitySuffixMap: Record<string, string> = {
                            mdpi: '@1x',
                            hdpi: '@1.5x',
                            xhdpi: '@2x',
                            xxhdpi: '@3x',
                            xxxhdpi: '@4x'
                        };
                        images.forEach((img: any) => {
                            const suffix = img.format === 'svg' ? '' : (densitySuffixMap[img.density] || '');
                            const filename = `${img.name}${suffix}.${img.format}`;
                            zip.file(filename, img.data, { binary: true });
                        });
                        
                        zip.generateAsync({ type: 'blob' }).then(content => {
                            const url = window.URL.createObjectURL(content);
                            const a = document.createElement('a');
                            a.style.display = 'none';
                            a.href = url;
                            a.download = 'figma_assets.zip';
                            document.body.appendChild(a);
                            a.click();
                            
                            setTimeout(() => {
                                window.URL.revokeObjectURL(url);
                                if (a.parentNode) document.body.removeChild(a);
                            }, 1000);
                            
                            setIsExporting(false);
                            setExportDialogVisible(false);
                            parent.postMessage({ pluginMessage: { type: 'notify', message: 'Downloaded flat assets ZIP successfully.' } }, '*');
                        });
                    }).catch(err => {
                        console.error('Failed to load JSZip', err);
                        setIsExporting(false);
                        parent.postMessage({ pluginMessage: { type: 'notify', message: 'Failed to create ZIP file.' } }, '*');
                    });
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    const currentTheme = THEMES[options.theme] || THEMES['dark'];

    // Dynamic Styles based on theme
    const containerStyle = {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '20px',
        fontFamily: "'Inter', sans-serif",
        color: currentTheme.textPrimary,
        height: '100%',
        overflowY: 'auto' as const, // Fix for hidden buttons
        boxSizing: 'border-box' as const,
        backgroundColor: currentTheme.containerFill, // Reactive BG
        transition: 'background-color 0.3s, color 0.3s'
    };

    const cardStyle = {
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '12px',
        backgroundColor: currentTheme.headerFill, // Reactive Card BG
        padding: '16px',
        borderRadius: '8px',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
        border: `1px solid ${currentTheme.containerStroke}`,
        transition: 'background-color 0.3s, border-color 0.3s'
    };

    const sectionTitleStyle = {
        fontSize: '12px',
        fontWeight: 600,
        color: currentTheme.textSecondary,
        marginBottom: '4px'
    };

    const checkboxLabelStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13px',
        cursor: 'pointer',
        color: currentTheme.textPrimary
    };

    const inputStyle = {
        padding: '8px',
        borderRadius: '6px',
        border: `1px solid ${currentTheme.containerStroke}`,
        fontSize: '13px',
        outline: 'none',
        backgroundColor: currentTheme.bodyFill,
        color: currentTheme.textPrimary,
        cursor: 'pointer'
    };

    const renderDragHandle = () => (
        <div
            ref={resizeHandleRef}
            onPointerDown={handleResizePointerDown}
            style={{
                position: 'fixed',
                right: 0,
                bottom: 0,
                width: '16px',
                height: '16px',
                cursor: 'nwse-resize',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: 0.7
            }}
        >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="12" y1="0" x2="0" y2="12" stroke={currentTheme.textSecondary} strokeWidth="1" strokeLinecap="round"/>
                <line x1="12" y1="4" x2="4" y2="12" stroke={currentTheme.textSecondary} strokeWidth="1" strokeLinecap="round"/>
                <line x1="12" y1="8" x2="8" y2="12" stroke={currentTheme.textSecondary} strokeWidth="1" strokeLinecap="round"/>
            </svg>
        </div>
    );

    const onConfirmExport = async () => {
        const itemsToExport = exportSelection.filter(s => s.selected).map(s => ({ id: s.id, name: s.name, format: s.format, densities: s.densities }));
        if (itemsToExport.length === 0) return;
        
        setIsExporting(true);
        parent.postMessage({ pluginMessage: { type: 'execute-export', items: itemsToExport } }, '*');
    };

    if (exportDialogVisible) {
        return (
            <div style={containerStyle}>
                <div style={cardStyle}>
                    <div style={sectionTitleStyle}>GLOBAL IMAGE FORMAT</div>
                    <div style={{ marginBottom: '16px' }}>
                        <select 
                            value={globalExportFormat}
                            onChange={(e) => {
                                const newFormat = e.target.value;
                                setGlobalExportFormat(newFormat);
                                setExportSelection(prev => prev.map(item => ({ ...item, format: newFormat })));
                            }}
                            style={{ ...inputStyle, width: '100%', fontSize: '13px' }}
                        >
                            <option value="PNG">PNG</option>
                            <option value="JPG">JPG</option>
                            <option value="SVG">SVG</option>
                        </select>
                    </div>

                    <div style={sectionTitleStyle}>EXPORT TARGET</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <label style={checkboxLabelStyle}>
                                <input 
                                    type="radio" 
                                    name="exportTarget"
                                    value="android_studio"
                                    checked={exportTarget === 'android_studio'} 
                                    onChange={() => setExportTarget('android_studio')}
                                    style={{ accentColor: '#3DDC84', cursor: 'pointer', width: '14px', height: '14px' }}
                                />
                                <span style={{ fontSize: '12px', color: currentTheme.textPrimary }}>Android Studio Sync</span>
                            </label>
                            
                            {exportTarget === 'android_studio' && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', paddingLeft: '24px' }}>
                                    <span style={{ fontSize: '11px', color: currentTheme.textSecondary }}>Port:</span>
                                    <span style={{ 
                                        fontSize: '11px', 
                                        fontWeight: 600,
                                        color: currentTheme.textPrimary 
                                    }}>
                                        6789
                                    </span>
                                </div>
                            )}
                        </div>
                        <label style={checkboxLabelStyle}>
                            <input 
                                type="radio" 
                                name="exportTarget"
                                value="local"
                                checked={exportTarget === 'local'} 
                                onChange={() => setExportTarget('local')}
                                style={{ accentColor: '#3DDC84', cursor: 'pointer', width: '14px', height: '14px' }}
                            />
                            <span style={{ fontSize: '12px', color: currentTheme.textPrimary }}>Download Zip</span>
                        </label>
                    </div>
                    
                    <div style={sectionTitleStyle}>SELECTED ELEMENTS</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto' }}>
                        {exportSelection.map((item, index) => (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', backgroundColor: currentTheme.bodyFill, borderRadius: '4px', border: `1px solid ${currentTheme.containerStroke}` }}>
                                <input 
                                    type="checkbox" 
                                    checked={item.selected} 
                                    onChange={(e) => {
                                        const newSel = [...exportSelection];
                                        newSel[index].selected = e.target.checked;
                                        setExportSelection(newSel);
                                    }}
                                    style={{ accentColor: '#3DDC84', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                                />
                                {item.previewUrl ? (
                                    <img src={item.previewUrl} alt="preview" style={{ width: '48px', height: '48px', objectFit: 'contain', borderRadius: '4px', backgroundColor: currentTheme.headerFill, flexShrink: 0 }} />
                                ) : (
                                    <div style={{ width: '48px', height: '48px', borderRadius: '4px', backgroundColor: currentTheme.headerFill, flexShrink: 0 }} />
                                )}
                                
                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px', minWidth: 0 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <input 
                                            type="text"
                                            value={item.name}
                                            onChange={(e) => {
                                                const newSel = [...exportSelection];
                                                newSel[index].name = e.target.value;
                                                setExportSelection(newSel);
                                            }}
                                            style={{ 
                                                ...inputStyle, 
                                                padding: '4px', 
                                                fontSize: '12px', 
                                                fontWeight: 600, 
                                                flex: 1, 
                                                minWidth: 0, 
                                                marginRight: '8px' 
                                            }}
                                        />
                                        <select 
                                            value={item.format}
                                            onChange={(e) => {
                                                const newSel = [...exportSelection];
                                                newSel[index].format = e.target.value;
                                                setExportSelection(newSel);
                                            }}
                                            style={{ ...inputStyle, padding: '2px 4px', fontSize: '11px', width: '60px' }}
                                        >
                                            <option value="PNG">PNG</option>
                                            <option value="JPG">JPG</option>
                                            <option value="SVG">SVG</option>
                                        </select>
                                    </div>
                                    
                                    {item.format !== 'SVG' && (
                                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                                            {['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi'].map(scale => (
                                                <label key={scale} style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '10px', color: currentTheme.textSecondary, cursor: 'pointer' }}>
                                                    <input 
                                                        type="checkbox"
                                                        checked={item.densities[scale]}
                                                        onChange={(e) => {
                                                            const newSel = [...exportSelection];
                                                            newSel[index].densities[scale] = e.target.checked;
                                                            setExportSelection(newSel);
                                                        }}
                                                        style={{ width: '10px', height: '10px', accentColor: '#3DDC84', cursor: 'pointer' }}
                                                    />
                                                    {scale}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                    <button onClick={() => setExportDialogVisible(false)} style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: currentTheme.bodyFill,
                        color: currentTheme.textPrimary,
                        border: `1px solid ${currentTheme.containerStroke}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                        transition: 'background-color 0.2s'
                    }}>Back</button>
                    <button 
                        onClick={onConfirmExport}
                        disabled={isExporting || !exportSelection.some(s => s.selected)}
                        style={{
                            flex: 1,
                            padding: '10px 16px',
                            backgroundColor: isExporting ? currentTheme.containerStroke : '#3DDC84',
                            color: isExporting ? currentTheme.textSecondary : '#000000',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: isExporting ? 'not-allowed' : 'pointer',
                            fontWeight: 600,
                            fontSize: '13px',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 1px 2px rgba(0,0,0, 0.2)'
                        }}
                    >
                        {isExporting ? 'Exporting...' : 'Confirm Export'}
                    </button>
                </div>
                {renderDragHandle()}
            </div>
        );
    }

    return (
        <div style={containerStyle}>
            {/* Options Card */}
            <div style={cardStyle}>
                <div style={sectionTitleStyle}>ANNOTATION OPTIONS</div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateColors"
                        checked={options.annotateColors}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Colors <span style={{ color: currentTheme.textSecondary }}>(Variables)</span></span>
                </label>
                <div style={{ height: '1px', backgroundColor: currentTheme.containerStroke }}></div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateTypography"
                        checked={options.annotateTypography}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Typography <span style={{ color: currentTheme.textSecondary }}>(Styles)</span></span>
                </label>
                <div style={{ height: '1px', backgroundColor: currentTheme.containerStroke }}></div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateStates"
                        checked={options.annotateStates}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Component States</span>
                </label>
                <div style={{ height: '1px', backgroundColor: currentTheme.containerStroke }}></div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateRadius"
                        checked={options.annotateRadius}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Corner Radius</span>
                </label>
                <div style={{ height: '1px', backgroundColor: currentTheme.containerStroke }}></div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateEffects"
                        checked={options.annotateEffects}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Effects <span style={{ color: currentTheme.textSecondary }}>(Shadows)</span></span>
                </label>
                <div style={{ height: '1px', backgroundColor: currentTheme.containerStroke }}></div>
                <label style={checkboxLabelStyle}>
                    <input
                        type="checkbox"
                        name="annotateLayout"
                        checked={options.annotateLayout}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Layout Spacing</span>
                </label>
            </div>

            {/* Theme Selection & Preview */}
            <div style={cardStyle}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={sectionTitleStyle}>APPEARANCE</label>
                    <select
                        name="theme"
                        value={options.theme}
                        onChange={handleSelectChange}
                        style={inputStyle}
                    >
                        <option value="dark">Dark (Default)</option>
                        <option value="light">Light (Clean)</option>
                        <option value="blueprint">Blueprint (Blue)</option>
                    </select>
                </div>

                {/* Theme Preview Box (Mini Representation) */}
                <div style={{
                    marginTop: '4px',
                    border: `1px solid ${currentTheme.containerStroke}`,
                    borderRadius: '6px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    fontSize: '11px',
                    backgroundColor: currentTheme.containerFill
                }}>
                    <div style={{
                        backgroundColor: currentTheme.headerFill,
                        color: currentTheme.headerText,
                        padding: '4px 8px',
                        fontSize: '10px',
                        fontWeight: 500
                    }}>
                        PREVIEW: Button / Primary
                    </div>
                    <div style={{
                        padding: '8px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        backgroundColor: currentTheme.bodyFill
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3399FF' }}></div>
                            <span style={{ color: currentTheme.prefix, fontWeight: 500 }}>Fill:</span>
                            <span style={{ color: currentTheme.textPrimary }}>Blue 500</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#9b59b6' }}></div>
                            <span style={{ color: currentTheme.prefix, fontWeight: 500 }}>Type:</span>
                            <span style={{ color: currentTheme.textPrimary }}>Inter Medium 14</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: 'auto' }}>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button onClick={onAnnotate} style={{
                        flex: 1,
                        padding: '10px 16px',
                        backgroundColor: options.theme === 'blueprint' ? '#00FFFF' : '#18A0FB',
                        color: options.theme === 'blueprint' ? '#000' : 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0, 0.2)'
                    }}>Annotate Selection</button>
                    <button onClick={onCancel} style={{
                        padding: '10px 16px',
                        backgroundColor: currentTheme.bodyFill,
                        color: currentTheme.textPrimary,
                        border: `1px solid ${currentTheme.containerStroke}`,
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontWeight: 500,
                        fontSize: '13px',
                        transition: 'background-color 0.2s'
                    }}>Close</button>
                </div>
                <button 
                    onClick={() => {
                        parent.postMessage({ pluginMessage: { type: 'get-selection-for-export' } }, '*');
                    }} 
                    disabled={isExporting}
                    style={{
                        padding: '10px 16px',
                        backgroundColor: isExporting ? currentTheme.containerStroke : '#3DDC84', // Android Green
                        color: isExporting ? currentTheme.textSecondary : '#000000',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        fontWeight: 600,
                        fontSize: '13px',
                        transition: 'background-color 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0, 0.2)'
                    }}
                >
                    {isExporting ? 'Exporting...' : 'Export'}
                </button>
            </div>
            {renderDragHandle()}
        </div>
    );
};

export default App;
