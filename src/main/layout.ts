import { AnnotationData } from "./types";
import { getBoundingBox } from "./utils";

/**
 * Deterministic Sort Helper
 */
export const sortAnnotations = (list: AnnotationData[], mainAxis: 'x' | 'y') => {
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
