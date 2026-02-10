// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 320, height: 300 });

interface AnnotationOptions {
    annotateColors: boolean;
    annotateTypography: boolean;
    annotateStates: boolean;
}

interface AnnotationData {
    node: SceneNode;
    text: string;
    color: RGB;
    type: 'color' | 'typography' | 'state';
}

// Helper: load Fonts
async function loadFonts() {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
}

// Helper: Create an annotation tag
function createAnnotationTag(text: string, color: RGB) {
    const frame = figma.createFrame();
    frame.name = "Tag: " + text;
    frame.layoutMode = "HORIZONTAL";
    frame.primaryAxisSizingMode = "AUTO";
    frame.counterAxisSizingMode = "AUTO";
    frame.paddingLeft = 8;
    frame.paddingRight = 8;
    frame.paddingTop = 6;
    frame.paddingBottom = 6;
    frame.cornerRadius = 4;
    frame.fills = [{ type: 'SOLID', color: color }];

    const textNode = figma.createText();
    textNode.characters = text;
    textNode.fontSize = 12;
    textNode.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    frame.appendChild(textNode);

    return frame;
}

// Helper: Draw connector line
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
async function collectAnnotations(node: SceneNode, options: AnnotationOptions, collected: AnnotationData[]) {
    // console.log("Processing node:", node.name, node.type);

    // 1. COLORS (Variables & Styles)
    if (options.annotateColors) {
        // A. Fill Variables
        if ('fills' in node && (node.fills as Paint[]).length > 0) {
            // Check bound variables for fills
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
                                    collected.push({
                                        node: node,
                                        text: `Fill Var: ${variable.name}`,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                }
                            } catch (e) { console.error("Error getting fill variable:", e); }
                        }
                    }
                }
            }

            // B. Fill Styles (Legacy/Standard)
            if ('fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId === 'string' && node.fillStyleId !== figma.mixed) {
                try {
                    const style = figma.getStyleById(node.fillStyleId);
                    if (style) {
                        collected.push({
                            node: node,
                            text: `Fill Style: ${style.name}`,
                            color: { r: 0.2, g: 0.6, b: 1 },
                            type: 'color'
                        });
                    }
                } catch (e) { console.error("Error getting fill style:", e); }
            }
        }

        // C. Stroke Variables & Styles
        if ('strokes' in node && (node.strokes as Paint[]).length > 0) {
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
                                    collected.push({
                                        node: node,
                                        text: `Stroke Var: ${variable.name}`,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                }
                            } catch (e) { console.error("Error getting stroke variable:", e); }
                        }
                    }
                }
            }

            // Styles
            if ('strokeStyleId' in node && node.strokeStyleId && typeof node.strokeStyleId === 'string' && node.strokeStyleId !== figma.mixed) {
                try {
                    const style = figma.getStyleById(node.strokeStyleId);
                    if (style) {
                        collected.push({
                            node: node,
                            text: `Stroke Style: ${style.name}`,
                            color: { r: 0.2, g: 0.6, b: 1 },
                            type: 'color'
                        });
                    }
                } catch (e) { console.error("Error getting stroke style:", e); }
            }
        }
    }

    // 2. TYPOGRAPHY (Styles)
    if (options.annotateTypography) {
        if (node.type === 'TEXT') {
            if (node.textStyleId && typeof node.textStyleId === 'string' && node.textStyleId !== figma.mixed) {
                try {
                    const style = figma.getStyleById(node.textStyleId);
                    if (style) {
                        collected.push({
                            node: node,
                            text: `Type: ${style.name}`,
                            color: { r: 0.6, g: 0.2, b: 0.8 },
                            type: 'typography'
                        });
                    }
                } catch (e) { console.error("Error getting text style:", e); }
            }
        }
    }

    // 3. STATES (Component Properties)
    if (options.annotateStates) {
        if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
            if (node.componentProperties) {
                const props = node.componentProperties;
                let stateText = "";
                for (const [key, value] of Object.entries(props)) {
                    if (['State', 'Status', 'Type', 'Variant'].some(k => key.includes(k))) {
                        stateText += `${key}=${value.value} `;
                    }
                }
                if (stateText) {
                    collected.push({
                        node: node,
                        text: `State: ${stateText.trim()}`,
                        color: { r: 1, g: 0.6, b: 0.2 },
                        type: 'state'
                    });
                }
            }
        }
    }

    // Recurse
    if ('children' in node) {
        for (const child of node.children) {
            await collectAnnotations(child, options, collected);
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
                console.log("Collecting annotations for", rootNode.name);
                await collectAnnotations(rootNode, msg.options, collectedData);
                console.log("Collected items:", collectedData.length);

                if (collectedData.length === 0) {
                    figma.notify("No annotations found for selection.");
                    continue;
                }

                const nodesToGroup: SceneNode[] = [];

                // Layout Config
                const filteredData = collectedData;
                // Default to 100px padding, but ensure we don't overlap if frame is huge/small
                const startX = rootNode.absoluteTransform[0][2] + rootNode.width + 50;
                let currentY = rootNode.absoluteTransform[1][2];
                const GAP = 10;

                for (const data of filteredData) {
                    // Create Tag
                    const tag = createAnnotationTag(data.text, data.color);
                    tag.x = startX;
                    tag.y = currentY;
                    nodesToGroup.push(tag);

                    // Draw Connector
                    const nodeAbsX = data.node.absoluteTransform[0][2];
                    const nodeAbsY = data.node.absoluteTransform[1][2];
                    const nodeCenterY = nodeAbsY + (data.node.height / 2);
                    const nodeRightX = nodeAbsX + data.node.width;

                    const tagLeftX = tag.x;
                    const tagLeftY = tag.y + (tag.height / 2); // Center of tag

                    // Create simple line
                    try {
                        const line = figma.createVector();
                        line.strokeWeight = 1;
                        line.strokes = [{ type: 'SOLID', color: data.color }];

                        // Use vectorNetwork with explicit vertices and segments
                        await line.setVectorNetworkAsync({
                            vertices: [
                                { x: nodeRightX, y: nodeCenterY },       // Start (Component Right)
                                { x: nodeRightX + 20, y: nodeCenterY },   // Elbow 1 (Straight out)
                                { x: tagLeftX - 20, y: tagLeftY },        // Elbow 2 (Straight in to tag)
                                { x: tagLeftX, y: tagLeftY }              // End (Tag Left)
                            ],
                            segments: [
                                { start: 0, end: 1 },
                                { start: 1, end: 2 },
                                { start: 2, end: 3 }
                            ]
                        });

                        nodesToGroup.push(line);

                        // Dot at intersection
                        const dot = figma.createEllipse();
                        dot.resize(6, 6);
                        dot.x = nodeRightX - 3;
                        dot.y = nodeCenterY - 3;
                        dot.fills = [{ type: 'SOLID', color: data.color }];
                        nodesToGroup.push(dot);

                    } catch (drawError) {
                        console.error("Failed to draw connector:", drawError);
                        // Continue to next tag even if connector fails
                    }

                    currentY += tag.height + GAP;
                }

                if (nodesToGroup.length > 0) {
                    const group = figma.group(nodesToGroup, figma.currentPage);
                    group.name = "Annotations - " + rootNode.name;
                }
            }

            figma.notify("External Annotations complete!");
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
