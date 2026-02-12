// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 300 });

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
    node: SceneNode;
    entries: AnnotationEntry[];
}

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
function createAnnotationTag(entries: AnnotationEntry[]) {
    const frame = figma.createFrame();
    frame.name = "Tag Group";
    frame.layoutMode = "VERTICAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.paddingLeft = 8;
    frame.paddingRight = 8;
    frame.paddingTop = 6;
    frame.paddingBottom = 6;
    frame.cornerRadius = 4;
    frame.itemSpacing = 4;

    // Warm dark background (Dark Brown-Grey)
    frame.fills = [{ type: 'SOLID', color: { r: 0.18, g: 0.16, b: 0.15 } }];
    frame.strokes = [{ type: 'SOLID', color: { r: 0.28, g: 0.26, b: 0.25 } }]; // Subtle border
    frame.strokeWeight = 1;

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

    // Sort entries
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

        // Text with mixed styling
        const textNode = figma.createText();
        const fullText = `${entry.prefix}: ${entry.content}`;
        textNode.characters = fullText;
        textNode.fontSize = 11;

        // Default color (Content) - Off-White
        textNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

        // Style the Prefix (Warm Gold/Orange)
        const prefixEnd = entry.prefix.length + 1; // Include the colon? User said "Type : label"
        // Let's color the prefix (e.g. "Fill")
        // Gold: #FFC107 -> {r: 1, g: 0.76, b: 0.03}
        // Or a softer warm orange: #FFB74D -> {r: 1, g: 0.72, b: 0.3}
        textNode.setRangeFills(0, entry.prefix.length, [{ type: 'SOLID', color: { r: 1, g: 0.72, b: 0.3 } }]);

        // Ensure bold or medium for prefix?
        textNode.setRangeFontName(0, entry.prefix.length, { family: "Inter", style: "Medium" });
        textNode.setRangeFontName(prefixEnd, fullText.length, { family: "Inter", style: "Regular" });

        row.appendChild(textNode);
        frame.appendChild(row);
    }

    return frame;
}

// Helper: Draw connector line (Standard) - NOT USED IN SMART LAYOUT BUT KEPT FOR REFERENCE
function createConnector(start: Vector, end: Vector, color: RGB) {
    const line = figma.createVector();
    line.name = "Connector";
    line.vectorPaths = [{
        windingRule: "NONZERO",
        data: `M ${start.x} ${start.y} L ${end.x} ${end.y}`
    }];
    line.strokes = [{ type: 'SOLID', color: color }];
    line.strokeWeight = 1;
    line.strokeCap = "ROUND";
    return line;
}

// Recursive traversal to Collect Data
async function collectAnnotations(node: SceneNode, options: AnnotationOptions, collected: AnnotationData[], ignoredIds: Set<string>) {
    if (ignoredIds.has(node.id)) return;
    // console.log("Processing node:", node.name, node.type);

    const localEntries: AnnotationEntry[] = [];

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

    // 4. GROUP CHILD TEXT NODES
    if ('children' in node) {
        for (const child of node.children) {
            if (child.type === 'TEXT' && !ignoredIds.has(child.id)) {
                // Typography
                if (options.annotateTypography) {
                    if (child.textStyleId && typeof child.textStyleId === 'string') {
                        try {
                            const style = figma.getStyleById(child.textStyleId);
                            if (style) {
                                localEntries.push({
                                    label: 'Type',
                                    prefix: 'Type',
                                    content: style.name,
                                    color: { r: 0.6, g: 0.2, b: 0.8 },
                                    type: 'typography'
                                });
                            }
                        } catch (e) { console.error("Error getting child text style:", e); }
                    }
                }

                // Text Color (Fill)
                if (options.annotateColors) {
                    if ('fills' in child && (child.fills as Paint[]).length > 0) {
                        // Variables
                        // @ts-ignore
                        const boundVariables = child.boundVariables;
                        if (boundVariables && boundVariables['fills']) {
                            const fillsVar = boundVariables['fills'];
                            if (Array.isArray(fillsVar)) {
                                for (const v of fillsVar) {
                                    if (v.id) {
                                        try {
                                            const variable = await figma.variables.getVariableByIdAsync(v.id);
                                            if (variable) {
                                                localEntries.push({
                                                    label: 'Text Color',
                                                    prefix: 'Text Color',
                                                    content: variable.name,
                                                    color: { r: 0.2, g: 0.6, b: 1 },
                                                    type: 'color'
                                                });
                                            }
                                        } catch (e) { console.error("Error getting child text fill var:", e); }
                                    }
                                }
                            }
                        }

                        // Style
                        if ('fillStyleId' in child && child.fillStyleId && typeof child.fillStyleId === 'string') {
                            try {
                                const style = figma.getStyleById(child.fillStyleId);
                                if (style) {
                                    localEntries.push({
                                        label: 'Text Color',
                                        prefix: 'Text Color',
                                        content: style.name,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                }
                            } catch (e) { console.error("Error getting child text fill style:", e); }
                        }
                    }
                }

                // Text Stroke (Variables & Styles)
                if (options.annotateColors) {
                    if ('strokes' in child && (child.strokes as Paint[]).length > 0) {
                        // Variables
                        // @ts-ignore
                        const boundVariables = child.boundVariables;
                        if (boundVariables && boundVariables['strokes']) {
                            const strokesVar = boundVariables['strokes'];
                            if (Array.isArray(strokesVar)) {
                                for (const v of strokesVar) {
                                    if (v.id) {
                                        try {
                                            const variable = await figma.variables.getVariableByIdAsync(v.id);
                                            if (variable) {
                                                localEntries.push({
                                                    label: 'Text Stroke Color',
                                                    prefix: 'Text Stroke',
                                                    content: variable.name,
                                                    color: { r: 0.2, g: 0.6, b: 1 },
                                                    type: 'color'
                                                });
                                            }
                                        } catch (e) { console.error("Error getting child text stroke var:", e); }
                                    }
                                }
                            }
                        }

                        // Style
                        if ('strokeStyleId' in child && child.strokeStyleId && typeof child.strokeStyleId === 'string') {
                            try {
                                const style = figma.getStyleById(child.strokeStyleId);
                                if (style) {
                                    localEntries.push({
                                        label: 'Text Stroke Color',
                                        prefix: 'Text Stroke',
                                        content: style.name,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                }
                            } catch (e) { console.error("Error getting child text stroke style:", e); }
                        }
                    }
                }

                // Mark child as handled
                ignoredIds.add(child.id);
            }
        }
    }

    if (localEntries.length > 0) {
        collected.push({
            node: node,
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
                console.log("Collected items:", collectedData.length);

                if (collectedData.length === 0) {
                    figma.notify("No annotations found for selection.");
                    continue;
                }

                const nodesToGroup: SceneNode[] = [];

                // Layout Config
                const GAP = 10;
                const PADDING = 60; // Distance from edge of frame to start of tags
                const UNIFIED_COLOR = { r: 0.2, g: 0.6, b: 1 };

                // Buckets for edges
                const top: AnnotationData[] = [];
                const bottom: AnnotationData[] = [];
                const left: AnnotationData[] = [];
                const right: AnnotationData[] = [];

                // Helper to determine nearest edge
                const frameAbsX = rootNode.absoluteTransform[0][2];
                const frameAbsY = rootNode.absoluteTransform[1][2];
                const frameWidth = rootNode.width;
                const frameHeight = rootNode.height;

                for (const data of collectedData) {
                    const nodeAbsX = data.node.absoluteTransform[0][2];
                    const nodeAbsY = data.node.absoluteTransform[1][2];
                    const nodeWidth = data.node.width;
                    const nodeHeight = data.node.height;

                    const distLeft = nodeAbsX - frameAbsX;
                    const distRight = (frameAbsX + frameWidth) - (nodeAbsX + nodeWidth);
                    const distTop = nodeAbsY - frameAbsY;
                    const distBottom = (frameAbsY + frameHeight) - (nodeAbsY + nodeHeight);

                    const min = Math.min(distLeft, distRight, distTop, distBottom);

                    if (min === distTop) top.push(data);
                    else if (min === distBottom) bottom.push(data);
                    else if (min === distLeft) left.push(data);
                    else right.push(data);
                }

                // Sort and Render Functions

                // --- RIGHT EDGE ---
                // Sort by Y (Top to Bottom)
                right.sort((a, b) => a.node.absoluteTransform[1][2] - b.node.absoluteTransform[1][2]);

                // Track the bottom of the previous tag to avoid overlap
                let lastBottom_Right = -Infinity;
                const startX_Right = frameAbsX + frameWidth + PADDING;

                for (const data of right) {
                    const tag = createAnnotationTag(data.entries);

                    // Ideal Y: Center of tag aligned with Center of Component
                    const nodeCenterY = data.node.absoluteTransform[1][2] + (data.node.height / 2);
                    const idealY = nodeCenterY - (tag.height / 2);

                    // Place tag: Max of (Ideal, Previous Bottom + Gap)
                    const yPos = Math.max(idealY, lastBottom_Right + GAP);

                    tag.x = startX_Right;
                    tag.y = yPos;
                    nodesToGroup.push(tag);

                    lastBottom_Right = yPos + tag.height;

                    // Connector
                    const targetX = data.node.absoluteTransform[0][2] + data.node.width;
                    const targetY = nodeCenterY;
                    const tagX = tag.x;
                    const tagY = tag.y + (tag.height / 2);

                    drawSmartConnector(targetX, targetY, tagX, tagY, UNIFIED_COLOR, nodesToGroup, 'RIGHT');
                }

                // --- LEFT EDGE ---
                // Sort by Y (Top to Bottom)
                left.sort((a, b) => a.node.absoluteTransform[1][2] - b.node.absoluteTransform[1][2]);
                let lastBottom_Left = -Infinity;

                for (const data of left) {
                    const tag = createAnnotationTag(data.entries);

                    const nodeCenterY = data.node.absoluteTransform[1][2] + (data.node.height / 2);
                    const idealY = nodeCenterY - (tag.height / 2);
                    const yPos = Math.max(idealY, lastBottom_Left + GAP);

                    // Align right side of tag to PADDING from left edge
                    tag.x = frameAbsX - PADDING - tag.width;
                    tag.y = yPos;
                    nodesToGroup.push(tag);

                    lastBottom_Left = yPos + tag.height;

                    const targetX = data.node.absoluteTransform[0][2]; // Left edge of node
                    const targetY = nodeCenterY;
                    const tagX = tag.x + tag.width; // Right edge of tag
                    const tagY = tag.y + (tag.height / 2);

                    drawSmartConnector(targetX, targetY, tagX, tagY, UNIFIED_COLOR, nodesToGroup, 'LEFT');
                }

                // Sort by position to avoid crossing lines
                // Top/Bottom: Primary Sort X, Secondary Sort Y (Outer -> Inner)
                top.sort((a, b) => {
                    const xDiff = a.node.absoluteTransform[0][2] - b.node.absoluteTransform[0][2];
                    if (Math.abs(xDiff) > 1) return xDiff;
                    return b.node.absoluteTransform[1][2] - a.node.absoluteTransform[1][2]; // Bottom-most first (closest to frame top edge? No, outer is smaller Y)
                });
                bottom.sort((a, b) => {
                    const xDiff = a.node.absoluteTransform[0][2] - b.node.absoluteTransform[0][2];
                    if (Math.abs(xDiff) > 1) return xDiff;
                    return a.node.absoluteTransform[1][2] - b.node.absoluteTransform[1][2]; // Top-most first (closest to frame bottom edge? No, outer is larger Y)
                });

                // Left/Right: Primary Sort Y, Secondary Sort X (Outer -> Inner)
                left.sort((a, b) => {
                    const yDiff = a.node.absoluteTransform[1][2] - b.node.absoluteTransform[1][2];
                    if (Math.abs(yDiff) > 1) return yDiff; // Top to Bottom
                    return b.node.absoluteTransform[0][2] - a.node.absoluteTransform[0][2]; // Right-most first (closest to frame left edge)
                });
                right.sort((a, b) => {
                    const yDiff = a.node.absoluteTransform[1][2] - b.node.absoluteTransform[1][2];
                    if (Math.abs(yDiff) > 1) return yDiff; // Top to Bottom
                    return a.node.absoluteTransform[0][2] - b.node.absoluteTransform[0][2]; // Left-most first (closest to frame right edge)
                });
                let lastRight_Bottom = -Infinity;
                const startY_Bottom = frameAbsY + frameHeight + PADDING;

                for (const data of bottom) {
                    const tag = createAnnotationTag(data.entries);

                    const nodeCenterX = data.node.absoluteTransform[0][2] + (data.node.width / 2);
                    const idealX = nodeCenterX - (tag.width / 2);
                    const xPos = Math.max(idealX, lastRight_Bottom + GAP);

                    tag.x = xPos;
                    tag.y = startY_Bottom;
                    nodesToGroup.push(tag);

                    lastRight_Bottom = xPos + tag.width;

                    const targetX = nodeCenterX;
                    const targetY = data.node.absoluteTransform[1][2] + data.node.height; // Bottom edge of node
                    const tagX = tag.x + (tag.width / 2);
                    const tagY = tag.y; // Top edge of tag

                    drawSmartConnector(targetX, targetY, tagX, tagY, UNIFIED_COLOR, nodesToGroup, 'BOTTOM');
                }
                if (nodesToGroup.length > 0) {
                    const group = figma.group(nodesToGroup, figma.currentPage);
                    group.name = "Annotations - " + rootNode.name;
                }
            }

            figma.notify("Smart Annotations complete!");
        }

        if (msg.type === 'cancel') {
            figma.closePlugin();
        }
    } catch (error) {
        console.error("Plugin Error:", error);
        // @ts-ignore
        figma.notify("Plugin Error: " + error.message);
    }
};

async function drawSmartConnector(targetX: number, targetY: number, tagX: number, tagY: number, color: RGB, groupArray: SceneNode[], edge: string) {
    // 1. Dot at target
    const dot = figma.createEllipse();
    dot.resize(6, 6);
    dot.x = targetX - 3;
    dot.y = targetY - 3;
    dot.fills = [{ type: 'SOLID', color: color }];
    groupArray.push(dot);

    // 2. Connector Line logic
    // User requested symmetrical double-angle: \______/
    // Path: Start -> Diagonal -> Horizontal/Vertical (Mid) -> Diagonal -> End

    // Vertices
    const vertices: Vector[] = [];
    const OFFSET = 20; // How far the diagonal stretches

    if (edge === 'RIGHT') {
        // Tag is Right. Target is Left.
        // Start: Tag Left
        // End: Target Right
        // MidY: Average Y to keep horizontal segment centered
        const midY = (tagY + targetY) / 2;

        // P1: Tag Anchor
        vertices.push({ x: tagX, y: tagY });

        // P2: Elbow near Tag (Diagonal)
        // Move Left by OFFSET, Move Y to MidY
        // Constrain X so we don't cross target
        const p2X = Math.max(targetX + OFFSET, tagX - OFFSET);
        vertices.push({ x: p2X, y: midY });

        // P3: Elbow near Target (Horizontal from P2)
        // X is Target + OFFSET
        const p3X = Math.min(p2X, targetX + OFFSET);
        vertices.push({ x: p3X, y: midY });

        // P4: Target Anchor
        vertices.push({ x: targetX, y: targetY });
    }
    else if (edge === 'LEFT') {
        // Tag is Left. Target is Right.
        const midY = (tagY + targetY) / 2;

        // P1: Tag Right
        vertices.push({ x: tagX, y: tagY });

        // P2: Elbow near Tag
        const p2X = Math.min(targetX - OFFSET, tagX + OFFSET);
        vertices.push({ x: p2X, y: midY });

        // P3: Elbow near Target
        const p3X = Math.max(p2X, targetX - OFFSET);
        vertices.push({ x: p3X, y: midY });

        // P4: Target
        vertices.push({ x: targetX, y: targetY });
    }
    else if (edge === 'TOP') {
        // Tag is Top. Target is Bottom.
        const midX = (tagX + targetX) / 2;

        // P1: Tag Bottom
        vertices.push({ x: tagX, y: tagY });

        // P2: Elbow near Tag
        const p2Y = Math.min(targetY - OFFSET, tagY + OFFSET);
        vertices.push({ x: midX, y: p2Y });

        // P3: Elbow near Target
        const p3Y = Math.max(p2Y, targetY - OFFSET);
        vertices.push({ x: midX, y: p3Y });

        // P4: Target
        vertices.push({ x: targetX, y: targetY });
    }
    else if (edge === 'BOTTOM') {
        // Tag is Bottom. Target is Top.
        const midX = (tagX + targetX) / 2;

        // P1: Tag Top
        vertices.push({ x: tagX, y: tagY });

        // P2: Elbow near Tag
        const p2Y = Math.max(targetY + OFFSET, tagY - OFFSET);
        vertices.push({ x: midX, y: p2Y });

        // P3: Elbow near Target
        const p3Y = Math.min(p2Y, targetY + OFFSET);
        vertices.push({ x: midX, y: p3Y });

        // P4: Target
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
