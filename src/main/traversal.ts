import { AnnotationOptions, AnnotationEntry, AnnotationData } from "./types";
import { rgbToHex } from "./utils";

/**
 * Helper: Get properties for a single node
 */
export async function getProperties(node: SceneNode, options: AnnotationOptions): Promise<AnnotationEntry[]> {
    const localEntries: AnnotationEntry[] = [];

    // 1. COLORS (Variables & Styles & Explicit)
    if (options.annotateColors) {
        // A. Fill
        let fillFound = false;
        if ('fills' in node && (node.fills as Paint[]).length > 0) {
            const fills = node.fills as Paint[];

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
                                        label: node.type === 'TEXT' ? 'Text Color' : 'Fill',
                                        prefix: node.type === 'TEXT' ? 'Text Color' : 'Fill',
                                        content: variable.name,
                                        color: { r: 0.2, g: 0.6, b: 1 },
                                        type: 'color'
                                    });
                                    fillFound = true;
                                }
                            } catch (e) { }
                        }
                    }
                }
            }

            if (!fillFound && 'fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId === 'string') {
                try {
                    const style = figma.getStyleById(node.fillStyleId);
                    if (style) {
                        localEntries.push({
                            label: node.type === 'TEXT' ? 'Text Color' : 'Fill',
                            prefix: node.type === 'TEXT' ? 'Text Color' : 'Fill',
                            content: style.name,
                            color: { r: 0.2, g: 0.6, b: 1 },
                            type: 'color'
                        });
                        fillFound = true;
                    }
                } catch (e) { }
            }

            if (!fillFound) {
                const fill = fills[0];
                if (fill.type === 'SOLID') {
                    const hex = rgbToHex(fill.color.r, fill.color.g, fill.color.b);
                    const opacity = fill.opacity !== undefined ? Math.round(fill.opacity * 100) + "%" : "100%";
                    const content = opacity === "100%" ? hex : `${hex} (${opacity})`;
                    localEntries.push({
                        label: node.type === 'TEXT' ? 'Text Color' : 'Fill',
                        prefix: node.type === 'TEXT' ? 'Text Color' : 'Fill',
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
                            } catch (e) { }
                        }
                    }
                }
            }

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
                } catch (e) { }
            }

            if (!strokeFound) {
                const stroke = strokes[0];
                if (stroke.type === 'SOLID') {
                    const hex = rgbToHex(stroke.color.r, stroke.color.g, stroke.color.b);
                    const opacity = stroke.opacity !== undefined ? Math.round(stroke.opacity * 100) + "%" : "100%";
                    const content = opacity === "100%" ? hex : `${hex} (${opacity})`;
                    localEntries.push({
                        label: 'Stroke Color',
                        prefix: 'Stroke',
                        content: content,
                        color: stroke.color,
                        type: 'color'
                    });
                }
            }
        }
    }

    // 2. TYPOGRAPHY
    if (options.annotateTypography && node.type === "TEXT") {
        let typeFound = false;
        if (node.textStyleId && typeof node.textStyleId === 'string') {
            try {
                const style = figma.getStyleById(node.textStyleId);
                if (style) {
                    localEntries.push({
                        label: 'Typography',
                        prefix: 'Typography',
                        content: style.name,
                        color: { r: 0.6, g: 0.2, b: 0.8 },
                        type: 'typography'
                    });
                    typeFound = true;
                }
            } catch (e) { }
        }

        if (!typeFound) {
            const fontName = node.fontName;
            const fontSize = node.fontSize;
            if (fontName !== figma.mixed && fontSize !== figma.mixed) {
                let lhStr = "Auto";
                // @ts-ignore
                if (node.lineHeight !== figma.mixed && node.lineHeight.unit !== 'AUTO') {
                    // @ts-ignore
                    lhStr = Math.round(node.lineHeight.value) + (node.lineHeight.unit === 'PERCENT' ? '%' : 'px');
                }
                localEntries.push({
                    label: 'Typography',
                    prefix: 'Typography',
                    content: `${fontName.family} ${fontName.style} ${fontSize}px/${lhStr}`,
                    color: { r: 0.6, g: 0.2, b: 0.8 },
                    type: 'typography'
                });
            }
        }

        if (node.characters) {
            const fullChars = node.characters;
            const truncated = fullChars.length > 25 ? fullChars.substring(0, 25) + "..." : fullChars;
            localEntries.push({
                label: 'Content',
                prefix: 'Text',
                content: `"${truncated}"`,
                color: { r: 0.5, g: 0.5, b: 0.5 },
                type: 'content'
            });
        }
    }

    // 3. STATES
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

    // 4. EFFECTS
    if (options.annotateEffects && 'effects' in node && (node.effects as Effect[]).length > 0) {
        for (const effect of node.effects) {
            if (effect.visible && effect.type === 'DROP_SHADOW') {
                let effectName = "";
                if (node.effectStyleId && typeof node.effectStyleId === 'string') {
                    try {
                        const style = figma.getStyleById(node.effectStyleId);
                        if (style) effectName = style.name;
                    } catch (e) { }
                }

                if (effectName) {
                    localEntries.push({
                        label: 'Drop Shadow',
                        prefix: 'Shadow',
                        content: effectName,
                        color: { r: 0.2, g: 0.8, b: 0.6 },
                        type: 'effect'
                    });
                } else {
                    const color = effect.color;
                    const r = Math.round(color.r * 255);
                    const g = Math.round(color.g * 255);
                    const b = Math.round(color.b * 255);
                    const a = Math.round(color.a * 100) / 100;
                    const val = `X:${effect.offset.x} Y:${effect.offset.y} B:${effect.radius} S:${effect.spread || 0} rgba(${r},${g},${b},${a})`;
                    localEntries.push({
                        label: 'Drop Shadow',
                        prefix: 'Shadow',
                        content: val,
                        color: { r: 0.2, g: 0.8, b: 0.6 },
                        type: 'effect'
                    });
                }
            }
        }
    }

    // 5. RADIUS
    if (options.annotateRadius && 'cornerRadius' in node) {
        let radiusDisplay = "";
        // @ts-ignore
        const boundVariables = node.boundVariables;
        if (boundVariables && boundVariables['cornerRadius']) {
            try {
                const v = await figma.variables.getVariableByIdAsync(boundVariables['cornerRadius'].id);
                if (v) radiusDisplay = v.name;
            } catch (e) { }
        }

        if (!radiusDisplay) {
            // @ts-ignore
            const cr = node.cornerRadius;
            if (cr !== figma.mixed && cr !== undefined) {
                if ((cr as number) > 0) radiusDisplay = cr.toString();
            } else if (cr === figma.mixed) {
                radiusDisplay = "Mixed";
            }
        }

        if (radiusDisplay) {
            localEntries.push({
                label: 'Corner Radius',
                prefix: 'Radius',
                content: radiusDisplay,
                color: { r: 0.0, g: 0.8, b: 0.5 },
                type: 'radius'
            });
        }
    }

    // 6. LAYOUT
    if (options.annotateLayout && 'layoutMode' in node && node.layoutMode !== "NONE") {
        let paddingText = "";
        const paddingLeft = node.paddingLeft || 0;
        const paddingRight = node.paddingRight || 0;
        const paddingTop = node.paddingTop || 0;
        const paddingBottom = node.paddingBottom || 0;

        if (paddingLeft === paddingRight && paddingTop === paddingBottom && paddingLeft === paddingTop && paddingLeft > 0) {
            paddingText = `P:${paddingLeft}`;
        } else if (paddingLeft === paddingRight && paddingTop === paddingBottom && (paddingLeft > 0 || paddingTop > 0)) {
            paddingText = `PH:${paddingLeft} PV:${paddingTop}`;
        } else if (paddingLeft > 0 || paddingRight > 0 || paddingTop > 0 || paddingBottom > 0) {
            paddingText = `P:${paddingTop} ${paddingRight} ${paddingBottom} ${paddingLeft}`;
        }

        if (paddingText) {
            localEntries.push({
                label: 'Spacing',
                prefix: 'Layout',
                content: paddingText,
                color: { r: 0.9, g: 0.4, b: 0.5 },
                type: 'state'
            });
        }
    }

    return localEntries;
}

/**
 * Recursive traversal to Collect Data
 */
export async function collectAnnotations(
    node: SceneNode,
    options: AnnotationOptions,
    collected: AnnotationData[],
    ignoredIds: Set<string>
) {
    if (ignoredIds.has(node.id)) return;
    if ('visible' in node && !node.visible) return;

    let mergedEntries: AnnotationEntry[] = [];
    const childIdsToIgnore: string[] = [];

    const isContainer = (node.type === 'FRAME' || node.type === 'INSTANCE' || node.type === 'COMPONENT') &&
        ((node.fills as Paint[]).length > 0 || (node.strokes as Paint[]).length > 0);

    if (isContainer && 'children' in node && node.children.length > 0 && node.children.length <= 3) {
        const parentProps = await getProperties(node, options);
        const childrenToMerge: SceneNode[] = [];
        for (const child of node.children) {
            if (child.type === 'TEXT' && child.visible) {
                childrenToMerge.push(child);
            }
        }

        if (childrenToMerge.length > 0) {
            if (parentProps.length > 0) {
                mergedEntries.push({
                    label: 'Section',
                    prefix: node.type === 'FRAME' ? 'Button' : 'Container',
                    content: '',
                    color: { r: 0, g: 0, b: 0 },
                    type: 'section_header'
                });
                mergedEntries.push(...parentProps);
            }

            for (const child of childrenToMerge) {
                const childProps = await getProperties(child, options);
                if (childProps.length > 0) {
                    mergedEntries.push({
                        label: 'Section',
                        prefix: child.type === 'TEXT' ? 'Text' : 'Layer',
                        content: '',
                        color: { r: 0, g: 0, b: 0 },
                        type: 'section_header'
                    });
                    mergedEntries.push(...childProps);
                    childIdsToIgnore.push(child.id);
                }
            }
        }
    }

    if (mergedEntries.length > 0) {
        // @ts-ignore
        const mergedChildren = node.children.filter((c: SceneNode) => childIdsToIgnore.includes(c.id));
        collected.push({ nodes: [node, ...mergedChildren], entries: mergedEntries });
        for (const id of childIdsToIgnore) ignoredIds.add(id);
    } else {
        const localEntries = await getProperties(node, options);
        if (localEntries.length > 0) {
            collected.push({ nodes: [node], entries: localEntries });
        }
    }

    if ('children' in node) {
        for (const child of node.children) {
            if (!ignoredIds.has(child.id)) {
                await collectAnnotations(child, options, collected, ignoredIds);
            }
        }
    }
}
