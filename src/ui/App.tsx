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

    const currentTheme = THEMES[options.theme] || THEMES['dark'];

    // Dynamic Styles based on theme
    const containerStyle = {
        padding: '16px',
        display: 'flex',
        flexDirection: 'column' as const,
        gap: '16px',
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

    return (
        <div style={containerStyle}>
            {/* Header with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: options.theme === 'blueprint' ? '#00FFFF' : '#18A0FB', // Accent color tweak?
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: options.theme === 'blueprint' ? '#000' : 'white'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: currentTheme.headerText }}>Design Annotator</h2>
            </div>

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
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
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
        </div>
    );
};

export default App;
