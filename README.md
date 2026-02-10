# Figma Plugin: Design Annotator

This plugin helps you automatically annotate your Figma designs with details about **Colors**, **Typography**, and **Component States**.

## Features

- **External Annotations**: Places annotations to the right of your frames to keep the design clean.
- **Connectors**: Draws lines pointing from the annotation tag to the specific element.
- **Supports**:
  - Figma Variables (Colors)
  - Color Styles (Legacy)
  - Typography Styles
  - Component Properties (States/Variants)

## Setup

1.  Install dependencies:
    ```bash
    npm install
    ```

2.  Build the plugin:
    ```bash
    npm run build
    ```
    This creates a `dist/` folder with `code.js` and `index.html`.

3.  Load in Figma:
    -   Open Figma -> **Plugins** -> **Development** -> **Import plugin from manifest...**.
    -   Select the `manifest.json` file in this directory.

## Development

-   Run `npm run watch` to automatically rebuild on changes.

## Usage

1.  Select a **Frame** (e.g., a phone screen).
2.  Run the plugin.
3.  Choose what to annotate (Colors, Typography, States).
4.  Click **Annotate Selection**.
