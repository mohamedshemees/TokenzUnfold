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
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Design Annotator</h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <input
                        type="checkbox"
                        name="annotateColors"
                        checked={options.annotateColors}
                        onChange={handleCheckboxChange}
                    />
                    Annotate Colors (Variables)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <input
                        type="checkbox"
                        name="annotateTypography"
                        checked={options.annotateTypography}
                        onChange={handleCheckboxChange}
                    />
                    Annotate Typography (Styles)
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                    <input
                        type="checkbox"
                        name="annotateStates"
                        checked={options.annotateStates}
                        onChange={handleCheckboxChange}
                    />
                    Annotate Component States
                </label>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button onClick={onAnnotate} style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#18A0FB',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '12px'
                }}>Annotate Selection</button>
                <button onClick={onCancel} style={{
                    padding: '8px 16px',
                    backgroundColor: 'white',
                    color: 'black',
                    border: '1px solid #e5e5e5',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '12px'
                }}>Close</button>
            </div>
        </div>
    );
};

export default App;
