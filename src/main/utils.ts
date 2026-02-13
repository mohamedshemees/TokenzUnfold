import { Box, AnnotationData } from "./types";

/**
 * Helper: Convert RGB(A) to Hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
        const hex = Math.round(n * 255).toString(16);
        return hex.length === 1 ? "0" + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
}

/**
 * Helper: Check collision between two boxes
 */
export function checkCollision(box1: Box, box2: Box, padding: number = 0): boolean {
    return (
        box1.x < box2.x + box2.width + padding &&
        box1.x + box1.width + padding > box2.x &&
        box1.y < box2.y + box2.height + padding &&
        box1.y + box1.height + padding > box2.y
    );
}

/**
 * Helper: Get bounding box of a node or group of nodes
 */
export function getBoundingBox(nodes: SceneNode[]): Box {
    if (nodes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    for (const node of nodes) {
        if (node.absoluteBoundingBox) {
            minX = Math.min(minX, node.absoluteBoundingBox.x);
            minY = Math.min(minY, node.absoluteBoundingBox.y);
            maxX = Math.max(maxX, node.absoluteBoundingBox.x + node.absoluteBoundingBox.width);
            maxY = Math.max(maxY, node.absoluteBoundingBox.y + node.absoluteBoundingBox.height);
        } else {
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

/**
 * Helper: load Fonts
 */
export async function loadFonts() {
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    await figma.loadFontAsync({ family: "Inter", style: "Medium" });
    await figma.loadFontAsync({ family: "Inter", style: "Bold" });
}

/**
 * Helper to check if a node is our tag
 */
export const isAnnotationTag = (n: SceneNode): n is FrameNode => {
    return n.type === 'FRAME' && n.name === 'Annotation Tag' && n.getPluginData('annotationHash') !== "";
};

/**
 * Helper: Get dominant color for connector
 */
export const getConnectorColor = (data: AnnotationData): RGB => {
    if (data.entries.length > 0) {
        // Find first non-header entry for better color representation
        const entry = data.entries.find(e => e.type !== 'section_header') || data.entries[0];
        return entry.color;
    }
    return { r: 0.2, g: 0.6, b: 1 }; // Default Blue
};
