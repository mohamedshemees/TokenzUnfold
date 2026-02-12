import React, { useState } from 'react';

const App = () => {
    const [options, setOptions] = useState({
        annotateColors: true,
        annotateTypography: true,
        annotateStates: true,
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

    return (
        <div style={{
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            fontFamily: "'Inter', sans-serif",
            color: '#333',
            height: '100%',
            boxSizing: 'border-box',
            backgroundColor: '#F5F5F5' // Light gray background
        }}>
            {/* Header with Icon */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#18A0FB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white'
                }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                        <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                        <path d="M2 2l7.586 7.586"></path>
                        <circle cx="11" cy="11" r="2"></circle>
                    </svg>
                </div>
                <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Design Annotator</h2>
            </div>

            {/* Options Card */}
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                backgroundColor: 'white',
                padding: '16px',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        name="annotateColors"
                        checked={options.annotateColors}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Colors <span style={{ color: '#888' }}>(Variables)</span></span>
                </label>
                <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        name="annotateTypography"
                        checked={options.annotateTypography}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Typography <span style={{ color: '#888' }}>(Styles)</span></span>
                </label>
                <div style={{ height: '1px', backgroundColor: '#f0f0f0' }}></div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                        type="checkbox"
                        name="annotateStates"
                        checked={options.annotateStates}
                        onChange={handleCheckboxChange}
                        style={{ width: '16px', height: '16px', accentColor: '#18A0FB' }}
                    />
                    <span>Annotate Component States</span>
                </label>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '10px', marginTop: 'auto' }}>
                <button onClick={onAnnotate} style={{
                    flex: 1,
                    padding: '10px 16px',
                    backgroundColor: '#18A0FB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '13px',
                    transition: 'background-color 0.2s',
                    boxShadow: '0 1px 2px rgba(24, 160, 251, 0.2)'
                }}>Annotate Selection</button>
                <button onClick={onCancel} style={{
                    padding: '10px 16px',
                    backgroundColor: 'white',
                    color: '#333',
                    border: '1px solid #e0e0e0',
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
