/**
 * Draws an orthogonal L-shaped smart connector from a set of target nodes to a tag anchor.
 */
export async function drawSmartConnector(
    targetNodes: SceneNode[],
    tagX: number,
    tagY: number,
    color: RGB,
    groupArray: SceneNode[],
    edge: string
) {
    const CORNER_RADIUS = 10;

    for (const targetNode of targetNodes) {
        const bbox = targetNode.absoluteBoundingBox || {
            x: targetNode.absoluteTransform[0][2],
            y: targetNode.absoluteTransform[1][2],
            width: targetNode.width,
            height: targetNode.height
        };

        let targetX = 0;
        let targetY = 0;

        if (edge === 'RIGHT') {
            targetX = bbox.x + bbox.width;
            targetY = bbox.y + (bbox.height / 2);
        } else if (edge === 'LEFT') {
            targetX = bbox.x;
            targetY = bbox.y + (bbox.height / 2);
        } else if (edge === 'TOP') {
            targetX = bbox.x + (bbox.width / 2);
            targetY = bbox.y;
        } else if (edge === 'BOTTOM') {
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

        // 2. Connector Line
        const vertices: VectorVertex[] = [];
        const segments: VectorSegment[] = [];

        try {
            const line = figma.createVector();
            line.strokeWeight = 1;
            line.strokes = [{ type: 'SOLID', color: color }];

            if (edge === 'RIGHT' || edge === 'LEFT') {
                if (Math.abs(tagY - targetY) < 2) {
                    vertices.push({ x: tagX, y: tagY });
                    vertices.push({ x: targetX, y: targetY });
                    segments.push({ start: 0, end: 1 });
                } else {
                    vertices.push({ x: tagX, y: tagY }); // Start
                    vertices.push({ x: targetX, y: tagY, cornerRadius: CORNER_RADIUS }); // Corner
                    vertices.push({ x: targetX, y: targetY }); // End
                    segments.push({ start: 0, end: 1 });
                    segments.push({ start: 1, end: 2 });
                }
            } else {
                if (Math.abs(tagX - targetX) < 2) {
                    vertices.push({ x: tagX, y: tagY });
                    vertices.push({ x: targetX, y: targetY });
                    segments.push({ start: 0, end: 1 });
                } else {
                    vertices.push({ x: tagX, y: tagY }); // Start
                    vertices.push({ x: tagX, y: targetY, cornerRadius: CORNER_RADIUS }); // Corner
                    vertices.push({ x: targetX, y: targetY }); // End
                    segments.push({ start: 0, end: 1 });
                    segments.push({ start: 1, end: 2 });
                }
            }

            await line.setVectorNetworkAsync({
                vertices: vertices,
                segments: segments
            });
            groupArray.push(line);
        } catch (e) {
            console.error("Line draw error", e);
        }
    }
}
