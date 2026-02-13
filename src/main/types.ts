export interface AnnotationOptions {
    annotateColors: boolean;
    annotateTypography: boolean;
    annotateStates: boolean;
    annotateEffects: boolean;
    annotateRadius: boolean;
    annotateLayout: boolean;
    theme?: string;
}

export interface AnnotationEntry {
    label: string;
    prefix: string;
    content: string;
    color: RGB;
    type: 'color' | 'typography' | 'state' | 'radius' | 'effect' | 'section_header' | 'content';
}

export interface AnnotationData {
    nodes: SceneNode[]; // Array for deduplication
    entries: AnnotationEntry[];
}

export interface Box {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ThemeColors {
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
