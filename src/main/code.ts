// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 340, height: 500 });

interface AnnotationOptions {
    annotateColors: boolean;
    annotateTypography: boolean;
    annotateStates: boolean;
}

interface AnnotationEntry {
    label: string;
    prefix: string;
    content: string;
    color: RGB;
    type: 'color' | 'typography' | 'state' | 'radius' | 'effect';
}

interface AnnotationData {
    nodes: SceneNode[]; // Array for deduplication
    entries: AnnotationEntry[];
}

interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

// Theme Definitions
interface ThemeColors {
    containerFill: RGB;
    containerStroke: RGB;
    headerFill: RGB;
    headerText: RGB;
    bodyFill: RGB;
    bodyStroke: RGB;
    textPrimary: RGB;
    textSecondary: RGB;
    prefix: RGB;
    connector: RGB;
}

const THEMES: { [key: string]: ThemeColors } = {
    'dark': {
        containerFill: { r: 0.13, g: 0.11, b: 0.1 }, // Brownish Dark
        containerStroke: { r: 0.3, g: 0.3, b: 0.3 },
        headerFill: { r: 0.2, g: 0.2, b: 0.2 },
        headerText: { r: 1, g: 1, b: 1 },
        bodyFill: { r: 0.13, g: 0.11, b: 0.1 },
        bodyStroke: { r: 0.3, g: 0.3, b: 0.3 },
        textPrimary: { r: 0.9, g: 0.9, b: 0.9 },
        textSecondary: { r: 0.6, g: 0.6, b: 0.6 },
        prefix: { r: 1, g: 0.72, b: 0.3 }, // Warm Gold
        connector: { r: 0.2, g: 0.6, b: 1 } // Blue
    },
    'light': {
        containerFill: { r: 0.98, g: 0.98, b: 0.98 }, // Near White
        containerStroke: { r: 0.85, g: 0.85, b: 0.85 },
        headerFill: { r: 0.9, g: 0.9, b: 0.9 }, // Light Grey
        headerText: { r: 0.2, g: 0.2, b: 0.2 }, // Dark Grey
        bodyFill: { r: 1, g: 1, b: 1 },
        bodyStroke: { r: 0.9, g: 0.9, b: 0.9 },
        textPrimary: { r: 0.2, g: 0.2, b: 0.2 }, // Dark Grey
        textSecondary: { r: 0.5, g: 0.5, b: 0.5 },
        prefix: { r: 0.8, g: 0.4, b: 0 }, // Burnt Orange
        connector: { r: 0.2, g: 0.2, b: 0.2 } // Dark Grey
    },
    'blueprint': {
        containerFill: { r: 0.05, g: 0.1, b: 0.2 }, // Deep Blue
        containerStroke: { r: 0.2, g: 0.4, b: 0.8 }, // Bright Blue
        headerFill: { r: 0.1, g: 0.2, b: 0.4 },
        headerText: { r: 0.4, g: 0.8, b: 1 }, // Cyan
        bodyFill: { r: 0.05, g: 0.1, b: 0.2 },
        bodyStroke: { r: 0.2, g: 0.4, b: 0.8 },
        textPrimary: { r: 0.8, g: 0.9, b: 1 }, // Light Cyan
        textSecondary: { r: 0.4, g: 0.6, b: 0.8 },
        prefix: { r: 0, g: 1, b: 1 }, // Cyan
        connector: { r: 0, g: 1, b: 1 } // Cyan
    }
};

// Helper: load Fonts
async function loadFonts() {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
}

// Helper: Create an annotation tag
// Helper: Convert RGB(A) to Hex
function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

// Helper: Create an annotation tag
const createAnnotationTag = (entries: AnnotationEntry[], nodeName: string, themeName: string = 'dark') => {
    const theme = THEMES[themeName] || THEMES['dark'];

    // 1. Container (Vertical)
    const container = figma.createFrame();
    container.name = "Annotation Tag"; // Name for layer list
    container.layoutMode = "VERTICAL";
    container.counterAxisSizingMode = "AUTO";
    container.primaryAxisSizingMode = "AUTO";
    container.itemSpacing = 0; // Tight spacing between notch and body
    container.fills = []; // Transparent

    // 2. Header (The Notch)
    const header = figma.createFrame();
    header.name = "Header";
    header.layoutMode = "HORIZONTAL";
    header.counterAxisSizingMode = "AUTO";
    header.primaryAxisSizingMode = "AUTO";
    header.paddingLeft = 8;
    header.paddingRight = 8;
    header.paddingTop = 4;
    header.paddingBottom = 4;
    header.cornerRadius = 4;

    // Header Style
    header.fills = [{ type: 'SOLID', color: theme.headerFill }];

    const headerText = figma.createText();
    headerText.characters = nodeName;
    headerText.fontSize = 10;
    headerText.fills = [{ type: 'SOLID', color: theme.headerText }];
    header.appendChild(headerText);

    // 3. Body (The Properties)
    const body = figma.createFrame();
    body.name = "Body";
    body.layoutMode = "VERTICAL";
    body.counterAxisSizingMode = "AUTO";
    body.primaryAxisSizingMode = "AUTO";
    body.paddingLeft = 12;
    body.paddingRight = 12;
    body.paddingTop = 12;
    body.paddingBottom = 12;
    body.itemSpacing = 8;
    body.cornerRadius = 8;

    body.fills = [{ type: 'SOLID', color: theme.bodyFill }];
    body.strokes = [{ type: 'SOLID', color: theme.bodyStroke }];
    body.strokeWeight = 1;

    // Define Order Priority
    const priority: { [key: string]: number } = {
        'Type': 0,
        'Typography': 0,
        'Fill': 1,
        'Text Color': 2,
        'Text Stroke Color': 3,
        'Stroke Color': 4,
        'Corner Radius': 5,
        'Drop Shadow': 6,
        'State': 7
    };

    const sortedEntries = [...entries].sort((a, b) => {
        const pA = priority[a.label] !== undefined ? priority[a.label] : 99;
        const pB = priority[b.label] !== undefined ? priority[b.label] : 99;
        return pA - pB;
    });

    for (const entry of sortedEntries) {
        const row = figma.createFrame();
        row.layoutMode = "HORIZONTAL";
        row.counterAxisSizingMode = "AUTO";
        row.primaryAxisSizingMode = "AUTO";
        row.itemSpacing = 6;
        row.fills = []; // Transparent

        // Dot
        const dot = figma.createEllipse();
        dot.resize(8, 8);
        dot.fills = [{ type: 'SOLID', color: entry.color }];
        row.appendChild(dot);

        // Text
        const textNode = figma.createText();
        const fullText = `${entry.prefix}: ${entry.content}`;
        textNode.characters = fullText;
        textNode.fontSize = 11;

        // Content Color 
        textNode.fills = [{ type: 'SOLID', color: theme.textPrimary }];

        // Style the Prefix 
        textNode.setRangeFills(0, entry.prefix.length, [{ type: 'SOLID', color: theme.prefix }]);

        // Font Styles (Assuming Inter available, or fallback)
        // Note: Ideally we load these fonts before using setRangeFontName to avoid errors.
        // Assuming user has these fonts or Figma defaults work. If safety needed, wrap in try/catch or check.
        try {
            textNode.setRangeFontName(0, entry.prefix.length, { family: "Inter", style: "Medium" });
            textNode.setRangeFontName(entry.prefix.length + 1, fullText.length, { family: "Inter", style: "Regular" });
        } catch (e) { /* ignore font errors */ }

        row.appendChild(textNode);
        body.appendChild(row);
    }

    // Assemble: Header then Body
    // To create the "Notch" look, maybe the header sits on top left?
    // Vertical layout does exactly that.
    container.appendChild(header);
    container.appendChild(body);

    return container;
};
// Helper: Check collision between two boxes
function checkCollision(box1: Box, box2: Box, padding: number = 0): boolean {
    return (
        box1.x < box2.x + box2.width + padding &&
        box1.x + box1.width + padding > box2.x &&
        box1.y < box2.y + box2.height + padding &&
        box1.y + box1.height + padding > box2.y
    );
}

// Helper: Get bounding box of a node or group of nodes
function getBoundingBox(nodes: SceneNode[]): Box {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of nodes) {
        // Use absoluteBoundingBox if available for rotation support, otherwise fallback
        // Since plugin API is mixed, absoluteTransform to get x/y is safer if no rotation, 
        // but absoluteBoundingBox is best. Let's try absoluteBoundingBox.
        if (node.absoluteBoundingBox) {
            minX = Math.min(minX, node.absoluteBoundingBox.x);
            minY = Math.min(minY, node.absoluteBoundingBox.y);
            maxX = Math.max(maxX, node.absoluteBoundingBox.x + node.absoluteBoundingBox.width);
            maxY = Math.max(maxY, node.absoluteBoundingBox.y + node.absoluteBoundingBox.height);
        } else {
            // Fallback for simple cases
            const x = node.absoluteTransform[0][2];
            const y = node.absoluteTransform[1][2];
            minX = Math.min(minX, x);
            minY = Math.min(minY, y);
            maxX = Math.max(maxX, x + node.width);
            maxY = Math.max(maxY, y + node.height);
        }
    }

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    };
}

// Recursive traversal to Collect Data
async function collectAnnotations(node: SceneNode, options: AnnotationOptions, collected: AnnotationData[], ignoredIds: Set<string>) {
    if (ignoredIds.has(node.id)) return;
    if ('visible' in node && !node.visible) return; // IGNORE HIDDEN ELEMENTS per user request
    // console.log("Processing node:", node.name, node.type);

    const localEntries: AnnotationEntry[] = [];
    const involvedNodes: SceneNode[] = [node];

    // 1. COLORS (Variables & Styles & Explicit)
    if (options.annotateColors) {
        // A. Fill
        let fillFound = false;
        if ('fills' in node && (node.fills as Paint[]).length > 0) {
            const fills = node.fills as Paint[];

            // Check Variables
            // @ts-ignore
            const boundVariables = node.boundVariables;
            if (boundVariables && boundVariables['fills']) {
                const fillsVar = boundVariables['fills'];
                if (Array.isArray(fillsVar)) {
                    for (const v of fillsVar) {
                        if (v.id) {
                            try {
                                const variable = await figma.variables.getVariableByIdAsync(v.id);
                                if (variable) {
                                    localEntries.push({
                                        label: 'Fill',
                                        prefix: 'Fill',
                                        content: variable.name,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                    fillFound = true;
                                }
                            } catch (e) {
                                console.error("Error getting fill variable:", e);
                            }
                        }
                    }
                }
            }

            // Check Styles (if not found variable)
            if (!fillFound && 'fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
                try {
                    const style = figma.getStyleById(node.fillStyleId);
                    if (style) {
                        localEntries.push({
                            label: 'Fill',
                            prefix: 'Fill',
                            content: style.name,
                            color: { r: 0.2, g: 0.6, b: 1 },
                            type: 'color'
                        });
                        fillFound = true;
                    }
                } catch (e) {
                    console.error("Error getting fill style:", e);
                }
            }

            // Check Explicit 
            if (!fillFound) {
                const fill = fills[0];
                if (fill.type === 'SOLID') {
                    const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
                    const opacity = fill.opacity !== undefined ? Math.round(fill.opacity * 100) + "%" : "100%";
                    const content = opacity === "100%" ? hex : `${hex} (${opacity})`;
                    localEntries.push({
                        label: 'Fill',
                        prefix: 'Fill',
                        content: content,
                        color: fill.color,
                        type: 'color'
                    });
                }
            }
        }

        // B. Stroke
        let strokeFound = false;
        if ('strokes' in node && (node.strokes as Paint[]).length > 0) {
            const strokes = node.strokes as Paint[];

            // Variables
            // @ts-ignore
            const boundVariables = node.boundVariables;
            if (boundVariables && boundVariables['strokes']) {
                const strokesVar = boundVariables['strokes'];
                if (Array.isArray(strokesVar)) {
                    for (const v of strokesVar) {
                        if (v.id) {
                            try {
                                const variable = await figma.variables.getVariableByIdAsync(v.id);
                                if (variable) {
                                    localEntries.push({
                                        label: 'Stroke Color',
                                        prefix: 'Stroke',
                                        content: variable.name,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                    strokeFound = true;
                                }
                            } catch (e) { console.error("Error getting stroke variable:", e); }
                        }
                    }
                }
            }

            // Styles
            if (!strokeFound && 'strokeStyleId' in node && node.strokeStyleId && typeof node.strokeStyleId === 'string') {
                try {
                    const style = figma.getStyleById(node.strokeStyleId);
                    if (style) {
                        localEntries.push({
                            label: 'Stroke Color',
                            prefix: 'Stroke',
                            content: style.name,
                            color: { r: 0.2, g: 0.6, b: 1 },
                            type: 'color'
                        });
                        strokeFound = true;
                    }
                } catch (e) { console.error("Error getting stroke style:", e); }
            }

            // Explicit
            if (!strokeFound) {
                const stroke = strokes[0];
                if (stroke.type === 'SOLID') {
                    const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
                    localEntries.push({
                        label: 'Stroke Color',
                        prefix: 'Stroke',
                        content: hex,
                        color: stroke.color,
                        type: 'color'
                    });
                }
            }
        }
    }

    // 2. TYPOGRAPHY (Styles & Explicit)
    if (options.annotateTypography) {
        if (node.type === 'TEXT') {
            let styleFound = false;

            // Check Style
            if (node.textStyleId && typeof node.textStyleId === 'string') {
                try {
                    const style = figma.getStyleById(node.textStyleId);
                    if (style) {
                        localEntries.push({
                            label: 'Type',
                            prefix: 'Type',
                            content: style.name,
                            color: { r: 0.6, g: 0.2, b: 0.8 },
                            type: 'typography'
                        });
                        styleFound = true;
                    }
                } catch (e) { console.error("Error getting text style:", e); }
            }

            // Check Explicit
            if (!styleFound) {
                const fontName = node.fontName as FontName; // Assuming not mixed for simplicity or handle mixed
                const fontSize = node.fontSize;
                const lineHeight = node.lineHeight;

                if (fontName !== figma.mixed && fontSize !== figma.mixed) {
                    let lhStr = "Auto";
                    if (lineHeight !== figma.mixed && lineHeight.unit !== 'AUTO') {
                        lhStr = Math.round(lineHeight.value) + (lineHeight.unit === 'PERCENT' ? '%' : 'px');
                    }

                    localEntries.push({
                        label: 'Type',
                        prefix: 'Type',
                        content: `${fontName.family} ${fontName.style} ${fontSize}px/${lhStr}`,
                        color: { r: 0.6, g: 0.2, b: 0.8 },
                        type: 'typography'
                    });
                }
            }
        }
    }

    // 3. STATES (Component Properties)
    if (options.annotateStates) {
        if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
            if ('componentProperties' in node) {
                // @ts-ignore
                const props = node.componentProperties;
                let stateText = "";
                for (const [key, value] of Object.entries(props)) {
                    if (['State', 'Status', 'Type', 'Variant'].some(k => key.includes(k))) {
                        stateText += `${key}=${(value as any).value} `;
                    }
                }
                if (stateText) {
                    localEntries.push({
                        label: 'State',
                        prefix: 'State',
                        content: stateText.trim(),
                        color: { r: 1, g: 0.6, b: 0.2 },
                        type: 'state'
                    });
                }
            }
        }
    }

    // 4. CORNER RADIUS
    if ('cornerRadius' in node) {
        if (node.cornerRadius !== figma.mixed && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
            localEntries.push({
                label: 'Corner Radius',
                prefix: 'Radius',
                content: `${node.cornerRadius}`,
                color: { r: 0.2, g: 0.8, b: 0.4 }, // Greenish
                type: 'radius'
            });
        }
    }

    // 5. AUTO LAYOUT PADDING & SPACING
    if ('layoutMode' in node && node.layoutMode !== 'NONE') {
        const paddingLeft = node.paddingLeft || 0;
        const paddingRight = node.paddingRight || 0;
        const paddingTop = node.paddingTop || 0;
        const paddingBottom = node.paddingBottom || 0;
        const itemSpacing = node.itemSpacing || 0;

        // Simplify display: 
        // If all padding equal: "P: 16"
        // If horiz/vert equal: "PH: 16 PV: 8"
        // Else: "P: 10 20 10 20" (CSS order)

        let paddingText = "";
        if (paddingLeft === paddingRight && paddingTop === paddingBottom && paddingLeft === paddingTop) {
            if (paddingLeft > 0) paddingText = `P:${paddingLeft}`;
        } else if (paddingLeft === paddingRight && paddingTop === paddingBottom) {
            paddingText = `PH:${paddingLeft} PV:${paddingTop}`;
        } else {
            paddingText = `P:${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`;
        }

        const spacingText = itemSpacing > 0 ? `Gap:${itemSpacing}` : "";

        if (paddingText || spacingText) {
            const content = [paddingText, spacingText].filter(Boolean).join(" ");
            localEntries.push({
                label: 'Spacing',
                prefix: 'Layout',
                content: content,
                color: { r: 0.9, g: 0.4, b: 0.5 }, // Pinkish
                type: 'state' // reuse state color/type or new one
            });
        }
    }

    // 5. EFFECTS (Drop Shadow)
    if ('effects' in node && (node.effects as any[]).length > 0) {
        for (const effect of node.effects) {
            if (effect.type === 'DROP_SHADOW' && effect.visible) {
                // Extract color (with alpha)
                const r = Math.round(effect.color.r * 255);
                const g = Math.round(effect.color.g * 255);
                const b = Math.round(effect.color.b * 255);
                const a = effect.color.a !== undefined ? effect.color.a.toFixed(2) : '1.00';
                const colorStr = `rgba(${r},${g},${b},${a})`;

                // Spread radius (if available)
                const spread = effect.spread !== undefined ? effect.spread : 0;

                localEntries.push({
                    label: 'Drop Shadow',
                    prefix: 'Shadow',
                    content: `X=${effect.offset.x} Y=${effect.offset.y} B=${effect.radius} S=${spread} ${colorStr}`,
                    color: { r: 0.6, g: 0.4, b: 0.8 }, // Purple-ish
                    type: 'effect'
                });
            }
        }
    }

    // 4. GROUP CHILD TEXT NODES - REMOVED per user request for separate tags
    // Child text nodes will be processed recursively as independent nodes.

    if (localEntries.length > 0) {
        collected.push({
            nodes: involvedNodes, // Include parent and any collected text children
            entries: localEntries
        });
    }

    // Recurse
    if ('children' in node) {
        for (const child of node.children) {
            await collectAnnotations(child, options, collected, ignoredIds);
        }
    }
}

figma.ui.onmessage = async (msg) => {
    try {
        if (msg.type === 'annotate-selection') {
            const selection = figma.currentPage.selection;

            if (selection.length === 0) {
                figma.notify("Please select a frame to annotate.");
                return;
            }

            await loadFonts();

            for (const rootNode of selection) {
                const collectedData: AnnotationData[] = [];
                const ignoredIds = new Set<string>();
                console.log("Collecting annotations for", rootNode.name);
                await collectAnnotations(rootNode, msg.options, collectedData, ignoredIds);
                console.log("Collected items (raw):", collectedData.length);

                if (collectedData.length === 0) {
                    figma.notify("No annotations found for selection.");
                    continue;
                }

                // --- DEDUPLICATION ---
                const uniqueAnnotationsMap = new Map<string, AnnotationData>();

                for (const item of collectedData) {
                    // Create a unique key based on the entries content
                    // Sort entries first to ensure consistent key
                    // We need to compare specific fields, ignore simple object ref diffs
                    const simpleEntries = item.entries.map(e => `${e.prefix}:${e.content}|${e.type}`).sort();
                    const key = JSON.stringify(simpleEntries);

                    if (uniqueAnnotationsMap.has(key)) {
                        // Merge nodes
                        const existing = uniqueAnnotationsMap.get(key);
                        if (existing) {
                            existing.nodes.push(...item.nodes);
                        }
                    } else {
                        uniqueAnnotationsMap.set(key, item);
                    }
                }

                const deduplicatedData = Array.from(uniqueAnnotationsMap.values());
                console.log("Collected items (unique):", deduplicatedData.length);

                // const nodesToGroup: SceneNode[] = []; // Replaced by tagsList and linesList for layering

                // Layout Config
                const PADDING = 60; // Distance from content bounding box to start of tags
                const COLLISION_PADDING = 5; // Extra padding for collision detection
                // const UNIFIED_COLOR = { r: 0.2, g: 0.6, b: 1 }; // Removed in favor of dynamic color

                // Buckets for edges
                const top: AnnotationData[] = [];
                const bottom: AnnotationData[] = [];
                const left: AnnotationData[] = [];
                const right: AnnotationData[] = [];

                // Helper to determine nearest edge based on GROUP Bounding Box
                const frameAbsX = rootNode.absoluteTransform[0][2];
                const frameAbsY = rootNode.absoluteTransform[1][2];
                const frameWidth = rootNode.width;
                const frameHeight = rootNode.height;

                for (const data of deduplicatedData) {
                    const box = getBoundingBox(data.nodes);

                    // Determine which edge is closest to the *center* of the group box
                    const centerX = box.x + box.width / 2;
                    const centerY = box.y + box.height / 2;

                    let distLeft = centerX - frameAbsX;
                    let distRight = (frameAbsX + frameWidth) - centerX;
                    let distTop = centerY - frameAbsY;
                    let distBottom = (frameAbsY + frameHeight) - centerY;

                    // --- POLISH: Edge Preference Bias ---
                    // Heuristic: Wide elements (Buttons) should prefer Side annotations to avoid vertical stacking.
                    // Tall elements (Cards) might prefer Top/Bottom naturally.
                    const aspect = frameWidth / frameHeight;
                    let sideBias = 1.0;

                    if (aspect > 1.2) {
                        // Wide element -> Prefer Sides strongly
                        sideBias = 0.4; // Make sides appear 60% closer
                    }

                    // Apply bias
                    distLeft *= sideBias;
                    distRight *= sideBias;

                    // Keep extreme corner preference?
                    // If very close to edge, maybe fine to keep implicit logic.
                    // But aspect ratio is generally more robust for shape-based layout.

                    const min = Math.min(distLeft, distRight, distTop, distBottom);

                    if (min === distTop) top.push(data);
                    else if (min === distBottom) bottom.push(data);
                    else if (min === distLeft) left.push(data);
                    else right.push(data);
                }

                // Deterministic Sort Helper
                const sortAnnotations = (list: AnnotationData[], mainAxis: 'x' | 'y') => {
                    list.sort((a, b) => {
                        const boxA = getBoundingBox(a.nodes);
                        const boxB = getBoundingBox(b.nodes);

                        // 1. Primary: Main Axis Position
                        const diffMain = mainAxis === 'y' ? boxA.y - boxB.y : boxA.x - boxB.x;
                        if (Math.abs(diffMain) > 1) return diffMain;

                        // 2. Secondary: Cross Axis Position
                        const diffCross = mainAxis === 'y' ? boxA.x - boxB.x : boxA.y - boxB.y;
                        if (Math.abs(diffCross) > 1) return diffCross;

                        // 3. Tertiary: Content Determinism (Label/Prefix)
                        const contentA = a.entries.map(e => e.label + e.content).join('');
                        const contentB = b.entries.map(e => e.label + e.content).join('');
                        const diffContent = contentA.localeCompare(contentB);
                        if (diffContent !== 0) return diffContent;

                        // 4. Quaternary: Node ID (Final tie-breaker)
                        return a.nodes[0].id.localeCompare(b.nodes[0].id);
                    });
                };

                // Helper: Get dominant color for connector
                const getConnectorColor = (data: AnnotationData): RGB => {
                    if (data.entries.length > 0) {
                        // Use the color of the first entry (highest priority)
                        return data.entries[0].color;
                    }
                    return { r: 0.2, g: 0.6, b: 1 }; // Default Blue
                };

                const currentTheme = msg.options.theme || 'dark';

                // Keep track of placed tags to avoid overlap
                const placedTagsBoxes: Box[] = [];

                // --- SMART COLLISION AVOIDANCE ---
                // Pre-populate with existing nodes to avoid overlap with buttons/existing tags
                try {
                    const obstacles = new Set<SceneNode>();

                    // Add siblings of the target node (e.g. other buttons in the frame)
                    if (rootNode.parent && 'children' in rootNode.parent) {
                        for (const child of rootNode.parent.children) {
                            obstacles.add(child);
                        }
                    }

                    // Add children of the Page (e.g. previous annotation groups)
                    // This handles cases where tags are placed at Page level
                    for (const child of figma.currentPage.children) {
                        obstacles.add(child);
                    }

                    // Define a "Broad Search Area" around the target to avoid scanning the whole world
                    const searchBounds = {
                        x: frameAbsX - 500,
                        y: frameAbsY - 500,
                        width: frameWidth + 1000,
                        height: frameHeight + 1000
                    };

                    for (const obs of obstacles) {
                        // Ignore self (the thing being annotated)
                        if (obs.id === rootNode.id) continue;

                        // Ignore explicit hidden
                        if ('visible' in obs && !obs.visible) continue;

                        // Check bounds
                        if (!obs.absoluteBoundingBox) continue;

                        const b = obs.absoluteBoundingBox;

                        // Check intersection with "Search Area"
                        const intersects = (
                            b.x < searchBounds.x + searchBounds.width &&
                            b.x + b.width > searchBounds.x &&
                            b.y < searchBounds.y + searchBounds.height &&
                            b.y + b.height > searchBounds.y
                        );

                        if (intersects) {
                            placedTagsBoxes.push({
                                x: b.x,
                                y: b.y,
                                width: b.width,
                                height: b.height
                            });
                        }
                    }
                } catch (e) {
                    console.error("Error in Smart Collision Avoidance setup:", e);
                }

                // Helper to check collision with placed tags
                const isColliding = (testBox: Box) => {
                    return placedTagsBoxes.some(placedBox => checkCollision(testBox, placedBox, COLLISION_PADDING));
                };

                const tagsList: SceneNode[] = [];
                const linesList: SceneNode[] = [];

                // --- RIGHT EDGE ---
                sortAnnotations(right, 'y'); // Sort Top-to-Bottom

                const startX_Right = frameAbsX + frameWidth + PADDING;

                for (const data of right) {
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    const tagBoxBox = getBoundingBox(data.nodes);
                    const nodeCenterY = tagBoxBox.y + (tagBoxBox.height / 2);

                    // Ideal Y: Center of tag aligned with Center of Component Group
                    let idealY = nodeCenterY - (tag.height / 2);
                    let xPos = startX_Right;

                    // Hybrid Packing Strategy:
                    // 1. Try to place at IdealY in current column.
                    // 2. If colliding, try nearby vertical spots in current column (Up/Down).
                    // 3. If no spot found vertically within limit, move to next column (Outwards).

                    let placed = false;
                    let currentColumnX = xPos;
                    let attempts = 0;

                    const VERTICAL_SEARCH_RANGE = 150; // Search up/down 150px
                    const VERTICAL_STEP = tag.height + 4; // Step by tag height + gap

                    while (!placed && attempts < 20) {
                        // Check Vertical Spots in this column
                        // 0, +1, -1, +2, -2...

                        let bestY = null;

                        // Try central first
                        let testBox = { x: currentColumnX, y: idealY, width: tag.width, height: tag.height };
                        if (!isColliding(testBox)) {
                            bestY = idealY;
                        } else {
                            // Search Spiral Outwards Vertically
                            for (let i = 1; i * VERTICAL_STEP <= VERTICAL_SEARCH_RANGE; i++) {
                                // Down
                                const yDown = idealY + (i * VERTICAL_STEP);
                                testBox.y = yDown;
                                if (!isColliding(testBox)) {
                                    bestY = yDown;
                                    break;
                                }
                                // Up
                                const yUp = idealY - (i * VERTICAL_STEP);
                                testBox.y = yUp;
                                if (!isColliding(testBox)) {
                                    bestY = yUp;
                                    break;
                                }
                            }
                        }

                        if (bestY !== null) {
                            // Found a spot!
                            tag.x = currentColumnX;
                            tag.y = bestY;
                            placedTagsBoxes.push({ x: currentColumnX, y: bestY, width: tag.width, height: tag.height });
                            placed = true;
                        } else {
                            // No spot in this column, move outwards
                            currentColumnX += tag.width + 10;
                            attempts++;
                        }
                    }

                    // Fallback if max attempts reached (just place it far out)
                    if (!placed) {
                        tag.x = currentColumnX;
                        tag.y = idealY;
                        placedTagsBoxes.push({ x: currentColumnX, y: idealY, width: tag.width, height: tag.height });
                    }

                    tagsList.push(tag);

                    const tagAnchorX = tag.x;
                    const tagAnchorY = tag.y + (tag.height / 2);
                    const connectorColor = getConnectorColor(data);

                    await drawSmartConnector(data.nodes, tagAnchorX, tagAnchorY, connectorColor, linesList, 'RIGHT');
                }

                // --- LEFT EDGE ---
                sortAnnotations(left, 'y'); // Sort Top-to-Bottom

                const startX_Left = frameAbsX - PADDING;

                for (const data of left) {
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    const tagBoxBox = getBoundingBox(data.nodes);
                    const nodeCenterY = tagBoxBox.y + (tagBoxBox.height / 2);

                    let idealY = nodeCenterY - (tag.height / 2);

                    // Initial X: Left side of frame - padding - tag width
                    let xPos = startX_Left - tag.width;

                    let placed = false;
                    let currentColumnX = xPos;
                    let attempts = 0;

                    const VERTICAL_SEARCH_RANGE = 150;
                    const VERTICAL_STEP = tag.height + 4;

                    while (!placed && attempts < 20) {
                        let bestY = null;

                        let testBox = { x: currentColumnX, y: idealY, width: tag.width, height: tag.height };
                        if (!isColliding(testBox)) {
                            bestY = idealY;
                        } else {
                            for (let i = 1; i * VERTICAL_STEP <= VERTICAL_SEARCH_RANGE; i++) {
                                const yDown = idealY + (i * VERTICAL_STEP);
                                testBox.y = yDown;
                                if (!isColliding(testBox)) {
                                    bestY = yDown;
                                    break;
                                }
                                const yUp = idealY - (i * VERTICAL_STEP);
                                testBox.y = yUp;
                                if (!isColliding(testBox)) {
                                    bestY = yUp;
                                    break;
                                }
                            }
                        }

                        if (bestY !== null) {
                            tag.x = currentColumnX;
                            tag.y = bestY;
                            placedTagsBoxes.push({ x: currentColumnX, y: bestY, width: tag.width, height: tag.height });
                            placed = true;
                        } else {
                            // Move Outwards (Left)
                            currentColumnX -= (tag.width + 10);
                            attempts++;
                        }
                    }

                    if (!placed) {
                        tag.x = currentColumnX;
                        tag.y = idealY;
                        placedTagsBoxes.push({ x: currentColumnX, y: idealY, width: tag.width, height: tag.height });
                    }

                    tagsList.push(tag);

                    const tagAnchorX = tag.x + tag.width;
                    const tagAnchorY = tag.y + (tag.height / 2);
                    const connectorColor = getConnectorColor(data);

                    await drawSmartConnector(data.nodes, tagAnchorX, tagAnchorY, connectorColor, linesList, 'LEFT');
                }

                // --- TOP EDGE ---
                sortAnnotations(top, 'x'); // Sort Left-to-Right

                const startY_Top_Real = frameAbsY - PADDING;

                for (const data of top) {
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    const box = getBoundingBox(data.nodes);
                    const centerX = box.x + box.width / 2;

                    let idealX = centerX - (tag.width / 2);
                    let yPos = startY_Top_Real - tag.height;

                    let testBox = { x: idealX, y: yPos, width: tag.width, height: tag.height };
                    let attempts = 0;

                    // Concentric: If colliding, move OUTWARDS (decrease Y, go further up)
                    // Keep simple concentric for Top/Bottom as narrow vertical aspect ratio makes horizontal spread less likely to be an issue?
                    // Or apply similar logic? Let's just keep concentric for Top/Bottom for now to avoid complexity overload, unless requested.
                    while (isColliding(testBox) && attempts < 50) {
                        yPos -= (tag.height + 10);
                        testBox.y = yPos;
                        attempts++;
                    }

                    tag.x = idealX;
                    tag.y = yPos;
                    tagsList.push(tag);

                    placedTagsBoxes.push(testBox);

                    const tagAnchorX = tag.x + (tag.width / 2);
                    const tagAnchorY = tag.y + tag.height;
                    const connectorColor = getConnectorColor(data);

                    await drawSmartConnector(data.nodes, tagAnchorX, tagAnchorY, connectorColor, linesList, 'TOP');
                }


                // --- BOTTOM EDGE ---
                sortAnnotations(bottom, 'x'); // Sort Left-to-Right

                const startY_Bottom = frameAbsY + frameHeight + PADDING;

                for (const data of bottom) {
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    const box = getBoundingBox(data.nodes);
                    const centerX = box.x + box.width / 2;

                    let idealX = centerX - (tag.width / 2);
                    let yPos = startY_Bottom;

                    let testBox = { x: idealX, y: yPos, width: tag.width, height: tag.height };
                    let attempts = 0;

                    // Concentric: If colliding, move OUTWARDS (increase Y, go further down)
                    while (isColliding(testBox) && attempts < 50) {
                        yPos += tag.height + 10;
                        testBox.y = yPos;
                        attempts++;
                    }

                    tag.x = idealX;
                    tag.y = yPos;
                    tagsList.push(tag);

                    placedTagsBoxes.push(testBox);

                    const tagAnchorX = tag.x + (tag.width / 2);
                    const tagAnchorY = tag.y;
                    const connectorColor = getConnectorColor(data);

                    await drawSmartConnector(data.nodes, tagAnchorX, tagAnchorY, connectorColor, linesList, 'BOTTOM');
                }

                // Grouping Logic: Ensure Lines are BEHIND Tags
                // In Figma Group, usually order is preserved.
                // To have Tags on Top, they should be LAST in the children array?
                // Wait, Figma renders first element at bottom? No, first element at Top usually in Layer list, but rendering is...
                // Actually, let's verify. `appendChild` adds to top.
                // `target.appendChild(a); target.appendChild(b);` => b is on top of a.
                // So if we group `[line, tag]`, then line is bottom, tag is top?
                // `figma.group(nodes)` uses the provided nodes.
                // Let's assume standard append behavior: Later elements obscure earlier elements.
                // So: [...linesList, ...tagsList] -> Lines first (bottom), Tags last (top).

                const finalNodes = [...linesList, ...tagsList];

                if (finalNodes.length > 0) {
                    const group = figma.group(finalNodes, figma.currentPage);
                    group.name = "Annotations - " + rootNode.name;
                }
            }

            figma.notify("Smart Annotations complete!");
        }

        if (msg.type === 'cancel') {
            figma.closePlugin();
        }

        if (msg.type === 'update-theme') {
            const themeName = msg.theme;
            const theme = THEMES[themeName] || THEMES['dark'];
            console.log("Updating theme to:", themeName);

            // Find all Annotation Groups or Tags on the current page
            // We look for nodes with name "Annotation Tag" or groups "Annotations - ..."
            // Recursive search or findAll? findAll is safer.

            const allNodes = figma.currentPage.findAll(n => {
                if (n.name === "Annotation Tag") return true;
                if (n.name.startsWith("Annotations - ")) return true;
                if (n.name === "Header" || n.name === "Body") return true;
                if (n.type === "VECTOR" && n.parent && n.parent.name.startsWith("Annotations - ")) return true;
                return false;
            });

            // Batch updates
            for (const node of allNodes) {
                if (node.name === "Header" && node.type === "FRAME") {
                    node.fills = [{ type: 'SOLID', color: theme.headerFill }];
                    // Header Text
                    const text = node.children[0] as TextNode;
                    if (text && text.type === "TEXT") {
                        text.fills = [{ type: 'SOLID', color: theme.headerText }];
                    }
                }
                else if (node.name === "Body" && node.type === "FRAME") {
                    node.fills = [{ type: 'SOLID', color: theme.bodyFill }];
                    node.strokes = [{ type: 'SOLID', color: theme.bodyStroke }];

                    // Body Rows
                    for (const row of node.children) {
                        if (row.type === "FRAME") {
                            // Row Children: Dot (Ellipse), Text (TextNode)
                            // We only update Text color and Prefix color range.
                            // Dot color comes from data, should be preserved.

                            const textNode = row.children.find(c => c.type === "TEXT") as TextNode;
                            if (textNode) {
                                // Update primary text color
                                textNode.fills = [{ type: 'SOLID', color: theme.textPrimary }];

                                // Re-apply Prefix Color (Need to find prefix length... or just guess based on colon?)
                                // We can't easily know the prefix length without parsing.
                                // "Prefix: Content"
                                const fullText = textNode.characters;
                                const colonIndex = fullText.indexOf(':');
                                if (colonIndex > -1) {
                                    textNode.setRangeFills(0, colonIndex, [{ type: 'SOLID', color: theme.prefix }]);
                                }
                            }
                        }
                    }
                }
                else if (node.type === "VECTOR" && node.parent && node.parent.name.startsWith("Annotations - ")) {
                    // Connector Line
                    // It's a vector. Update stroke.
                    // Wait, connector color is determined by the data type (blue, purple, etc.)?
                    // If so, we SHOULD NOT override it with a single theme connector color.
                    // The original code used `entry.color` or `connectorColor` passed to `drawSmartConnector`.
                    // `drawSmartConnector` used `getConnectorColor(data)`.

                    // HOWEVER, in `THEMES`, we have a `connector` color.
                    // If the user wants the connector to math the theme (e.g. Dark vs Light mode lines), we should update it.
                    // BUT, if it indicates the type (Fill vs Typography), we should keep it?
                    // User request: "make theming interactive".
                    // Usually, functional colors (Error/Success) stay, but structural colors change.
                    // Our connectors were colored by TYPE (Fill=Blue, Type=Purple).
                    // So maybe we leave connectors alone?
                    // OR, does `THEMES.connector` imply a default?
                    // Let's look at `code.ts` Line 705: `return { r: 0.2, g: 0.6, b: 1 }; // Default Blue`.
                    // And `drawSmartConnector` uses that color.

                    // If we overwrite all vectors, we lose the type-coding.
                    // Let's ONLY update if it was the "default" blue? Too hard to track.
                    // Decision: Leave connectors alone for now as they carry semantic meaning (Color vs Type).
                    // UNLESS the prompt implies "ALL items reflect new selection".
                    // Let's assume structural parts (Tag BG, Text) are the main target.
                }
            }

            // Re-notify to confirm?
            // figma.notify("Theme updated"); // Might be too spammy if realtime
        }

    } catch (error) {
        console.error("Plugin Error:", error);
        // @ts-ignore
        figma.notify("Plugin Error: " + error.message);
    }
};

async function drawSmartConnector(targetNodes: SceneNode[], tagX: number, tagY: number, color: RGB, groupArray: SceneNode[], edge: string) {
    // const OFFSET = 20; // Unused in new stepped logic

    for (const targetNode of targetNodes) {
        // Find target anchor point on the node
        // Use absoluteBoundingBox if possible
        const bbox = targetNode.absoluteBoundingBox || {
            x: targetNode.absoluteTransform[0][2],
            y: targetNode.absoluteTransform[1][2],
            width: targetNode.width,
            height: targetNode.height
        };

        let targetX = 0;
        let targetY = 0;

        if (edge === 'RIGHT') {
            // Tag is Right of Node. Node Target is Right Edge.
            targetX = bbox.x + bbox.width;
            targetY = bbox.y + (bbox.height / 2);
        } else if (edge === 'LEFT') {
            // Tag Left. Node Target Left.
            targetX = bbox.x;
            targetY = bbox.y + (bbox.height / 2);
        } else if (edge === 'TOP') {
            // Tag Top. Node Target Top.
            targetX = bbox.x + (bbox.width / 2);
            targetY = bbox.y;
        } else if (edge === 'BOTTOM') {
            // Tag Bottom. Node Target Bottom.
            targetX = bbox.x + (bbox.width / 2);
            targetY = bbox.y + bbox.height;
        }

        // 1. Dot at target
        const dot = figma.createEllipse();
        dot.resize(6, 6);
        dot.x = targetX - 3;
        dot.y = targetY - 3;
        dot.fills = [{ type: 'SOLID', color: color }];
        groupArray.push(dot);

        // 2. Connector Line logic
        const vertices: Vector[] = [];

        // POLISH: Stepped Diagonal Lines ( ______/ )
        // Logic: 
        // 1. Start at Tag (Anchor)
        // 2. Move Horizontally towards Target (40% of distance)
        // 3. Diagonal to Target Y
        // 4. Horizontal to Target X

        if (edge === 'RIGHT') {
            // Tag (Right) -> Target (Left) relative to tag
            // Dist X is negative (TargetX - TagX)

            const dx = targetX - tagX;
            // Break points
            // P1: TagXY
            // P2: TagX + (dx * 0.4), TagY
            // P3: TagX + (dx * 0.6), TargetY
            // P4: TargetXY

            const xBreak1 = tagX + (dx * 0.4);
            const xBreak2 = tagX + (dx * 0.6);

            vertices.push({ x: tagX, y: tagY });
            vertices.push({ x: xBreak1, y: tagY });
            vertices.push({ x: xBreak2, y: targetY }); // Diagonal bridge
            vertices.push({ x: targetX, y: targetY });
        }
        else if (edge === 'LEFT') {
            // Tag (Left) -> Target (Right) relative to tag
            // Dist X is positive
            const dx = targetX - tagX;

            const xBreak1 = tagX + (dx * 0.4);
            const xBreak2 = tagX + (dx * 0.6);

            vertices.push({ x: tagX, y: tagY });
            vertices.push({ x: xBreak1, y: tagY });
            vertices.push({ x: xBreak2, y: targetY });
            vertices.push({ x: targetX, y: targetY });
        }
        else if (edge === 'TOP') {
            // Vertical Stepped? User asked for diagonal.
            // Let's apply same logic for Top/Bottom but vertically.
            // |
            // \
            //  |

            const dy = targetY - tagY;
            const yBreak1 = tagY + (dy * 0.4);
            const yBreak2 = tagY + (dy * 0.6);

            vertices.push({ x: tagX, y: tagY });
            vertices.push({ x: tagX, y: yBreak1 });
            vertices.push({ x: targetX, y: yBreak2 });
            vertices.push({ x: targetX, y: targetY });
        }
        else if (edge === 'BOTTOM') {
            const dy = targetY - tagY;
            const yBreak1 = tagY + (dy * 0.4);
            const yBreak2 = tagY + (dy * 0.6);

            vertices.push({ x: tagX, y: tagY });
            vertices.push({ x: tagX, y: yBreak1 });
            vertices.push({ x: targetX, y: yBreak2 });
            vertices.push({ x: targetX, y: targetY });
        }

        // Draw
        try {
            const line = figma.createVector();
            line.strokeWeight = 1;
            line.strokes = [{ type: 'SOLID', color: color }];
            await line.setVectorNetworkAsync({
                vertices: vertices,
                segments: [
                    { start: 0, end: 1 },
                    { start: 1, end: 2 },
                    { start: 2, end: 3 }
                ]
            });
            groupArray.push(line);
        } catch (e) { console.error("Line draw error", e); }
    }
}
