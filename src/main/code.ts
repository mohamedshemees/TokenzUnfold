import { AnnotationData, Box } from "./types";
import { THEMES } from "./theme";
import {
    loadFonts,
    isAnnotationTag,
    getBoundingBox,
    checkCollision,
    getConnectorColor
} from "./utils";
import { createAnnotationTag, getAnnotationHash } from "./annotations";
import { collectAnnotations } from "./traversal";
import { sortAnnotations } from "./layout";
import { drawSmartConnector } from "./connectors";

// This shows the HTML page in "ui.html".
figma.showUI(__html__, { width: 450, height: 700 });

figma.ui.onmessage = async (msg) => {
    try {
        if (msg.type === 'annotate-selection') {
            const selection = figma.currentPage.selection;

            if (selection.length === 0) {
                figma.notify("Please select a frame to annotate.");
                return;
            }

            // Check if any selection is a component or instance (Informational)
            const hasComponents = selection.some(n => n.type === 'COMPONENT' || n.type === 'INSTANCE' || n.type === 'COMPONENT_SET');
            if (hasComponents) {
                console.log("Selection contains components/instances. Annotation tags will be created as top-level nodes on the current page.");
            }

            await loadFonts();

            // --- GLOBAL DEDUPLICATION CONTEXT ---
            const provenanceMap = new Map<string, FrameNode>();

            // Scan the entire page for existing tags with safety
            try {
                const foundTags = figma.currentPage.findAll(isAnnotationTag);
                for (const tag of foundTags) {
                    if (tag.removed) continue;
                    const h = tag.getPluginData('annotationHash');
                    if (h) provenanceMap.set(h, tag as FrameNode);
                }
            } catch (e) {
                console.error("Error during global tag scan:", e);
            }

            console.log("Provenance Map Initialized with", provenanceMap.size, "tags.");

            for (const rootNode of selection) {
                if (rootNode.removed) continue; // Safety check
                const collectedData: AnnotationData[] = [];
                const ignoredIds = new Set<string>();

                console.log("Collecting annotations for", rootNode.name);
                await collectAnnotations(rootNode, msg.options, collectedData, ignoredIds);
                console.log("Collected items (raw):", collectedData.length);

                if (collectedData.length === 0) {
                    figma.notify("No annotations found for selection.");
                    continue;
                }

                // --- CLEANUP OLD ANNOTATIONS ---
                const existingTagId = rootNode.getPluginData('annotationTagId');
                if (existingTagId) {
                    const oldTag = await figma.getNodeByIdAsync(existingTagId);
                    if (oldTag) {
                        try {
                            const oldHash = oldTag.getPluginData('annotationHash');
                            if (oldHash && provenanceMap.get(oldHash)?.id === oldTag.id) {
                                provenanceMap.delete(oldHash);
                            }
                            oldTag.remove();
                        } catch (e) {
                            console.error("Failed to remove old tag:", e);
                        }
                    }
                    rootNode.setPluginData('annotationTagId', "");
                }

                // --- DEDUPLICATION ---
                const uniqueAnnotationsMap = new Map<string, AnnotationData>();
                for (const item of collectedData) {
                    const itemHash = getAnnotationHash(item.entries, true);
                    if (uniqueAnnotationsMap.has(itemHash)) {
                        const existing = uniqueAnnotationsMap.get(itemHash);
                        if (existing) {
                            existing.nodes.push(...item.nodes);
                        }
                    } else {
                        uniqueAnnotationsMap.set(itemHash, item);
                    }
                }

                const deduplicatedData = Array.from(uniqueAnnotationsMap.values());
                console.log("Collected items (unique):", deduplicatedData.length);

                // Layout Config
                const PADDING = 30;
                const COLLISION_PADDING = 5;

                // Buckets for edges
                const top: AnnotationData[] = [];
                const bottom: AnnotationData[] = [];
                const left: AnnotationData[] = [];
                const right: AnnotationData[] = [];

                const frameAbsX = rootNode.absoluteTransform[0][2];
                const frameAbsY = rootNode.absoluteTransform[1][2];
                const frameWidth = rootNode.width;
                const frameHeight = rootNode.height;

                for (const data of deduplicatedData) {
                    const box = getBoundingBox(data.nodes);

                    let distLeft = box.x - frameAbsX;
                    let distRight = (frameAbsX + frameWidth) - (box.x + box.width);
                    let distTop = box.y - frameAbsY;
                    let distBottom = (frameAbsY + frameHeight) - (box.y + box.height);

                    // --- ZONE-BASED LAYOUT ---
                    let screenParent = rootNode;
                    let current = rootNode;
                    while (current.parent && current.parent.type !== 'PAGE' && current.parent.type !== 'DOCUMENT') {
                        current = current.parent as SceneNode;
                    }
                    screenParent = current;

                    const screenAbsY = screenParent.absoluteTransform[1][2];
                    const screenHeight = screenParent.height;
                    const centerY = box.y + box.height / 2;
                    const relativeY = centerY - screenAbsY;
                    const ratioY = screenHeight > 0 ? relativeY / screenHeight : 0.5;

                    if (ratioY < 0.3) {
                        distLeft *= 10; distRight *= 10; distBottom *= 10; distTop *= 0.1;
                    } else if (ratioY > 0.7) {
                        distLeft *= 10; distRight *= 10; distTop *= 10; distBottom *= 0.1;
                    } else {
                        distTop *= 10; distBottom *= 10; distLeft *= 0.1; distRight *= 0.1;
                    }

                    const min = Math.min(distLeft, distRight, distTop, distBottom);
                    if (min === distBottom) bottom.push(data);
                    else if (min === distTop) top.push(data);
                    else if (min === distLeft) left.push(data);
                    else right.push(data);
                }

                const currentTheme = msg.options.theme || 'dark';
                const placedTagsBoxes: Box[] = [];

                // --- SMART COLLISION AVOIDANCE ---
                try {
                    const obstacles = new Set<SceneNode>();
                    if (rootNode.parent && 'children' in rootNode.parent) {
                        for (const child of rootNode.parent.children) obstacles.add(child);
                    }
                    for (const child of figma.currentPage.children) obstacles.add(child);

                    const searchBounds = {
                        x: frameAbsX - 500, y: frameAbsY - 500,
                        width: frameWidth + 1000, height: frameHeight + 1000
                    };

                    for (const obs of obstacles) {
                        if (obs.id === rootNode.id) continue;
                        if ('visible' in obs && !obs.visible) continue;
                        if (!obs.absoluteBoundingBox) continue;
                        const b = obs.absoluteBoundingBox;
                        const intersects = (
                            b.x < searchBounds.x + searchBounds.width &&
                            b.x + b.width > searchBounds.x &&
                            b.y < searchBounds.y + searchBounds.height &&
                            b.y + b.height > searchBounds.y
                        );
                        if (intersects) {
                            placedTagsBoxes.push({ x: b.x, y: b.y, width: b.width, height: b.height });
                        }
                    }
                } catch (e) {
                    console.error("Collision avoidance setup error:", e);
                }

                const isColliding = (testBox: Box) => {
                    return placedTagsBoxes.some(placedBox => checkCollision(testBox, placedBox, COLLISION_PADDING));
                };

                const tagsList: SceneNode[] = [];
                const linesList: SceneNode[] = [];

                // --- RIGHT EDGE ---
                sortAnnotations(right, 'y');
                const startX_Right = frameAbsX + frameWidth + PADDING;
                for (const data of right) {
                    const itemHash = getAnnotationHash(data.entries);
                    let existingTag: FrameNode | undefined = provenanceMap.get(itemHash);
                    if (existingTag) {
                        try { if (existingTag.removed || !existingTag.parent) { provenanceMap.delete(itemHash); existingTag = undefined; } } catch (e) { provenanceMap.delete(itemHash); existingTag = undefined; }
                    }

                    if (existingTag) {
                        const tagBox = { x: existingTag.x, y: existingTag.y, width: existingTag.width, height: existingTag.height };
                        await drawSmartConnector(data.nodes, tagBox.x, tagBox.y + tagBox.height / 2, getConnectorColor(data), linesList, 'RIGHT');
                        const contentEntries = data.entries.filter(e => e.type === 'content');
                        if (contentEntries.length > 0) {
                            const miniTag = createAnnotationTag(contentEntries, "", currentTheme);
                            const objectBox = getBoundingBox(data.nodes);
                            miniTag.x = objectBox.x + objectBox.width + 20;
                            miniTag.y = objectBox.y + (objectBox.height / 2) - (miniTag.height / 2);
                            tagsList.push(miniTag);
                        }
                        for (const n of data.nodes) n.setPluginData('annotationTagId', existingTag.id);
                        continue;
                    }

                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    tag.setPluginData('annotationHash', itemHash);
                    provenanceMap.set(itemHash, tag);

                    const tagBoxBox = getBoundingBox(data.nodes);
                    const idealY = tagBoxBox.y + tagBoxBox.height / 2 - tag.height / 2;
                    let placed = false, attempts = 0, currentColumnX = startX_Right;
                    const VERTICAL_SEARCH_RANGE = 5000, VERTICAL_STEP = tag.height + 4;

                    while (!placed && attempts < 20) {
                        let bestY = null;
                        let testBox = { x: currentColumnX, y: idealY, width: tag.width, height: tag.height };
                        if (!isColliding(testBox)) { bestY = idealY; }
                        else {
                            for (let i = 1; i * VERTICAL_STEP <= VERTICAL_SEARCH_RANGE; i++) {
                                testBox.y = idealY + (i * VERTICAL_STEP); if (!isColliding(testBox)) { bestY = testBox.y; break; }
                                testBox.y = idealY - (i * VERTICAL_STEP); if (!isColliding(testBox)) { bestY = testBox.y; break; }
                            }
                        }
                        if (bestY !== null) {
                            tag.x = currentColumnX; tag.y = bestY;
                            placedTagsBoxes.push({ x: currentColumnX, y: bestY, width: tag.width, height: tag.height });
                            placed = true;
                        } else break;
                    }
                    if (!placed) { tag.x = currentColumnX; tag.y = idealY; placedTagsBoxes.push({ x: tag.x, y: tag.y, width: tag.width, height: tag.height }); }
                    for (const n of data.nodes) n.setPluginData('annotationTagId', tag.id);
                    tagsList.push(tag);
                    await drawSmartConnector(data.nodes, tag.x, tag.y + tag.height / 2, getConnectorColor(data), linesList, 'RIGHT');
                }

                // --- LEFT EDGE ---
                sortAnnotations(left, 'y');
                const startX_Left = frameAbsX - PADDING;
                for (const data of left) {
                    const itemHash = getAnnotationHash(data.entries);
                    let existingTag: FrameNode | undefined = provenanceMap.get(itemHash);
                    if (existingTag) {
                        try { if (existingTag.removed || !existingTag.parent) { provenanceMap.delete(itemHash); existingTag = undefined; } } catch (e) { provenanceMap.delete(itemHash); existingTag = undefined; }
                    }
                    if (existingTag) {
                        const tagBox = { x: existingTag.x, y: existingTag.y, width: existingTag.width, height: existingTag.height };
                        await drawSmartConnector(data.nodes, tagBox.x + tagBox.width, tagBox.y + tagBox.height / 2, getConnectorColor(data), linesList, 'LEFT');
                        for (const n of data.nodes) n.setPluginData('annotationTagId', existingTag.id);
                        continue;
                    }
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    tag.setPluginData('annotationHash', itemHash);
                    provenanceMap.set(itemHash, tag);
                    const tagBoxBox = getBoundingBox(data.nodes);
                    const idealY = tagBoxBox.y + tagBoxBox.height / 2 - tag.height / 2;
                    let placed = false, attempts = 0, currentColumnX = startX_Left - tag.width;
                    const VERTICAL_SEARCH_RANGE = 5000, VERTICAL_STEP = tag.height + 4;
                    while (!placed && attempts < 20) {
                        let bestY = null;
                        let testBox = { x: currentColumnX, y: idealY, width: tag.width, height: tag.height };
                        if (!isColliding(testBox)) { bestY = idealY; }
                        else {
                            for (let i = 1; i * VERTICAL_STEP <= VERTICAL_SEARCH_RANGE; i++) {
                                testBox.y = idealY + (i * VERTICAL_STEP); if (!isColliding(testBox)) { bestY = testBox.y; break; }
                                testBox.y = idealY - (i * VERTICAL_STEP); if (!isColliding(testBox)) { bestY = testBox.y; break; }
                            }
                        }
                        if (bestY !== null) {
                            tag.x = currentColumnX; tag.y = bestY;
                            placedTagsBoxes.push({ x: currentColumnX, y: bestY, width: tag.width, height: tag.height });
                            placed = true;
                        } else break;
                    }
                    if (!placed) { tag.x = currentColumnX; tag.y = idealY; placedTagsBoxes.push({ x: tag.x, y: tag.y, width: tag.width, height: tag.height }); }
                    for (const n of data.nodes) n.setPluginData('annotationTagId', tag.id);
                    tagsList.push(tag);
                    await drawSmartConnector(data.nodes, tag.x + tag.width, tag.y + tag.height / 2, getConnectorColor(data), linesList, 'LEFT');
                }

                // --- TOP EDGE ---
                sortAnnotations(top, 'x');
                const startY_Top = frameAbsY - PADDING;
                for (const data of top) {
                    const itemHash = getAnnotationHash(data.entries);
                    let existingTag: FrameNode | undefined = provenanceMap.get(itemHash);
                    if (existingTag) {
                        try { if (existingTag.removed || !existingTag.parent) { provenanceMap.delete(itemHash); existingTag = undefined; } } catch (e) { provenanceMap.delete(itemHash); existingTag = undefined; }
                    }
                    if (existingTag) {
                        const tagBox = { x: existingTag.x, y: existingTag.y, width: existingTag.width, height: existingTag.height };
                        await drawSmartConnector(data.nodes, tagBox.x + tagBox.width / 2, tagBox.y + tagBox.height, getConnectorColor(data), linesList, 'TOP');
                        for (const n of data.nodes) n.setPluginData('annotationTagId', existingTag.id);
                        continue;
                    }
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    tag.setPluginData('annotationHash', itemHash);
                    provenanceMap.set(itemHash, tag);
                    const box = getBoundingBox(data.nodes);
                    const idealX = box.x + box.width / 2 - tag.width / 2;
                    let yPos = startY_Top - tag.height, attempts = 0;
                    let testBox = { x: idealX, y: yPos, width: tag.width, height: tag.height };
                    while (isColliding(testBox) && attempts < 50) { yPos -= (tag.height + 10); testBox.y = yPos; attempts++; }
                    tag.x = idealX; tag.y = yPos; tagsList.push(tag); placedTagsBoxes.push(testBox);
                    for (const n of data.nodes) n.setPluginData('annotationTagId', tag.id);
                    await drawSmartConnector(data.nodes, tag.x + tag.width / 2, tag.y + tag.height, getConnectorColor(data), linesList, 'TOP');
                }

                // --- BOTTOM EDGE ---
                sortAnnotations(bottom, 'x');
                const startY_Bottom = frameAbsY + frameHeight + PADDING;
                for (const data of bottom) {
                    const itemHash = getAnnotationHash(data.entries);
                    let existingTag: FrameNode | undefined = provenanceMap.get(itemHash);
                    if (existingTag) {
                        try { if (existingTag.removed || !existingTag.parent) { provenanceMap.delete(itemHash); existingTag = undefined; } } catch (e) { provenanceMap.delete(itemHash); existingTag = undefined; }
                    }
                    if (existingTag) {
                        const tagBox = { x: existingTag.x, y: existingTag.y, width: existingTag.width, height: existingTag.height };
                        await drawSmartConnector(data.nodes, tagBox.x + tagBox.width / 2, tagBox.y, getConnectorColor(data), linesList, 'BOTTOM');
                        for (const n of data.nodes) n.setPluginData('annotationTagId', existingTag.id);
                        continue;
                    }
                    const tag = createAnnotationTag(data.entries, data.nodes[0].name, currentTheme);
                    tag.setPluginData('annotationHash', itemHash);
                    provenanceMap.set(itemHash, tag);
                    const box = getBoundingBox(data.nodes);
                    const idealX = box.x + box.width / 2 - tag.width / 2;
                    let yPos = startY_Bottom, attempts = 0;
                    let testBox = { x: idealX, y: yPos, width: tag.width, height: tag.height };
                    while (isColliding(testBox) && attempts < 50) { yPos += tag.height + 10; testBox.y = yPos; attempts++; }
                    tag.x = idealX; tag.y = yPos; tagsList.push(tag); placedTagsBoxes.push(testBox);
                    for (const n of data.nodes) n.setPluginData('annotationTagId', tag.id);
                    await drawSmartConnector(data.nodes, tag.x + tag.width / 2, tag.y, getConnectorColor(data), linesList, 'BOTTOM');
                }

                const finalNodes = [...linesList, ...tagsList];
                if (finalNodes.length > 0) {
                    const group = figma.group(finalNodes, figma.currentPage);
                    group.name = "Annotations - " + rootNode.name;
                }
            }
            figma.notify("Smart Annotations complete!");
        }

        if (msg.type === 'cancel') figma.closePlugin();

        if (msg.type === 'resize') {
            figma.ui.resize(Math.round(msg.width), Math.round(msg.height));
        }

        if (msg.type === 'update-theme') {
            const themeName = msg.theme;
            const theme = THEMES[themeName] || THEMES['dark'];
            const allNodes = figma.currentPage.findAll(n => {
                if (n.name === "Annotation Tag") return true;
                if (n.name.startsWith("Annotations - ")) return true;
                if (n.name === "Header" || n.name === "Body") return true;
                return false;
            });
            for (const node of allNodes) {
                if (node.name === "Header" && node.type === "FRAME") {
                    node.fills = [{ type: 'SOLID', color: theme.headerFill }];
                    const text = node.children[0] as TextNode;
                    if (text && text.type === "TEXT") text.fills = [{ type: 'SOLID', color: theme.headerText }];
                }
                else if (node.name === "Body" && node.type === "FRAME") {
                    node.fills = [{ type: 'SOLID', color: theme.bodyFill }];
                    node.strokes = [{ type: 'SOLID', color: theme.bodyStroke }];
                    for (const row of node.children) {
                        if (row.type === "FRAME") {
                            const textNode = row.children.find(c => c.type === "TEXT") as TextNode;
                            if (textNode) {
                                textNode.fills = [{ type: 'SOLID', color: theme.textPrimary }];
                                const fullText = textNode.characters;
                                const colonIndex = fullText.indexOf(':');
                                if (colonIndex > -1) textNode.setRangeFills(0, colonIndex, [{ type: 'SOLID', color: theme.prefix }]);
                            }
                        }
                    }
                }
            }
        }

        if (msg.type === 'notify') {
            figma.notify(msg.message);
        }

        if (msg.type === 'get-selection-for-export') {
            const selection = figma.currentPage.selection;
            if (selection.length === 0) {
                figma.ui.postMessage({ type: 'selection-for-export', selection: [] });
                return;
            }
            const selData = await Promise.all(selection.map(async node => {
                let preview = null;
                try {
                    const maxDim = Math.max(node.width, node.height);
                    const scale = maxDim > 0 ? Math.min(1, 64 / maxDim) : 1;
                    preview = await node.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: scale } });
                } catch (e) {
                    console.error("Failed to generate preview for", node.name, e);
                }
                return {
                    id: node.id,
                    name: node.name,
                    preview
                };
            }));
            figma.ui.postMessage({ type: 'selection-for-export', selection: selData });
        }

        if (msg.type === 'execute-export') {
            const items = msg.items;
            if (!items || items.length === 0) {
                figma.ui.postMessage({ type: 'export-error' });
                return;
            }

            const images = [];

            for (const item of items) {
                const node = await figma.getNodeByIdAsync(item.id) as SceneNode;
                if (!node) continue;

                // Ensure name is snake_case and non-empty
                let rawName = item.name || node.name;
                let nodeName = rawName.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                if (!nodeName) nodeName = 'image';

                if (item.format === 'SVG') {
                    try {
                        const bytes = await node.exportAsync({ format: 'SVG' });
                        images.push({
                            name: nodeName,
                            data: bytes,
                            width: Math.round(node.width),
                            height: Math.round(node.height),
                            density: 'any',
                            format: 'svg'
                        });
                    } catch (err) {
                        console.error(`Export failed for ${node.name} as SVG`, err);
                        figma.notify(`Failed to export ${node.name} as SVG`);
                    }
                } else {
                    const allDensities = [
                        { name: 'mdpi', scale: 1 },
                        { name: 'hdpi', scale: 1.5 },
                        { name: 'xhdpi', scale: 2 },
                        { name: 'xxhdpi', scale: 3 },
                        { name: 'xxxhdpi', scale: 4 }
                    ];

                    const itemDensities = item.densities || { mdpi: true, hdpi: true, xhdpi: true, xxhdpi: true, xxxhdpi: true };
                    const densities = allDensities.filter(d => itemDensities[d.name]);
                    const exportFormat = item.format === 'JPG' ? 'JPG' : 'PNG';

                    for (const density of densities) {
                        try {
                            const bytes = await node.exportAsync({
                                format: exportFormat,
                                constraint: { type: 'SCALE', value: density.scale }
                            });
                            images.push({
                                name: nodeName,
                                data: bytes,
                                width: Math.round(node.width),
                                height: Math.round(node.height),
                                density: density.name,
                                format: exportFormat.toLowerCase()
                            });
                        } catch (err) {
                            console.error(`Export failed for ${node.name} at ${density.name}`, err);
                            figma.notify(`Failed to export ${node.name} at ${density.name}`);
                        }
                    }
                }
            }

            figma.ui.postMessage({ type: 'export-success', images });
        }
    } catch (error) {
        console.error("Plugin Error:", error);
        // @ts-ignore
        figma.notify("Plugin Error: " + error.message);
    }
};
