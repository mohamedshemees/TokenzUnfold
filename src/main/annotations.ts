import { AnnotationEntry } from "./types";
import { THEMES } from "./theme";

/**
 * Helper: Create an annotation tag
 */
export const createAnnotationTag = (entries: AnnotationEntry[], nodeName: string, themeName: string = 'dark') => {
    const theme = THEMES[themeName] || THEMES['dark'];

    // 1. Container (Vertical)
    const container = figma.createFrame();
    container.name = "Annotation Tag";
    container.layoutMode = "VERTICAL";
    container.counterAxisSizingMode = "AUTO";
    container.primaryAxisSizingMode = "AUTO";
    container.itemSpacing = 0;
    container.fills = [];

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

    const hasSections = entries.some(e => e.type === 'section_header');
    let sortedEntries = [...entries];
    if (!hasSections) {
        sortedEntries.sort((a, b) => {
            const pA = priority[a.label] !== undefined ? priority[a.label] : 99;
            const pB = priority[b.label] !== undefined ? priority[b.label] : 99;
            return pA - pB;
        });
    }

    for (const entry of sortedEntries) {
        if (entry.type === 'section_header') {
            const headerRow = figma.createFrame();
            headerRow.layoutMode = "HORIZONTAL";
            headerRow.counterAxisSizingMode = "AUTO";
            headerRow.primaryAxisSizingMode = "AUTO";
            headerRow.paddingTop = 4;
            headerRow.paddingBottom = 2;
            headerRow.fills = [];

            const hText = figma.createText();
            hText.characters = entry.prefix;
            hText.fontSize = 11;
            hText.fills = [{ type: 'SOLID', color: theme.textPrimary }];
            try {
                hText.fontName = { family: "Inter", style: "Bold" };
            } catch (e) { }

            headerRow.appendChild(hText);
            body.appendChild(headerRow);
            continue;
        }

        const row = figma.createFrame();
        row.layoutMode = "HORIZONTAL";
        row.counterAxisSizingMode = "AUTO";
        row.primaryAxisSizingMode = "AUTO";
        row.itemSpacing = 6;
        row.fills = [];

        if (entry.type !== 'content') {
            const dot = figma.createEllipse();
            dot.resize(8, 8);
            dot.fills = [{ type: 'SOLID', color: entry.color }];
            row.appendChild(dot);
        }

        const textNode = figma.createText();
        const fullText = `${entry.prefix}: ${entry.content}`;
        textNode.characters = fullText;
        textNode.fontSize = 11;
        textNode.fills = [{ type: 'SOLID', color: theme.textPrimary }];
        textNode.setRangeFills(0, entry.prefix.length, [{ type: 'SOLID', color: theme.prefix }]);

        try {
            textNode.setRangeFontName(0, entry.prefix.length, { family: "Inter", style: "Medium" });
            textNode.setRangeFontName(entry.prefix.length + 1, fullText.length, { family: "Inter", style: "Regular" });
        } catch (e) { }

        row.appendChild(textNode);
        body.appendChild(row);
    }

    container.appendChild(header);
    container.appendChild(body);

    return container;
};

/**
 * Helper: Get Annotation Hash
 */
export function getAnnotationHash(entries: AnnotationEntry[], includeContent: boolean = false): string {
    const filtered = includeContent ? entries : entries.filter(e => e.type !== 'content');
    const sorted = [...filtered].sort((a, b) => (a.label + a.content).localeCompare(b.label + b.content));
    return JSON.stringify(sorted.map(e => `${e.prefix}:${e.content}|${e.type}`));
}
