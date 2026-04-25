# Orbisonic VU Lab

Standalone browser lab for designing high-channel VU meter layouts for Orbisonic workflows. This folder is the project root; the app does not depend on another Orbisonic checkout.

## Run

```sh
npm install
npm run dev
```

The dev server binds to `127.0.0.1` and uses Vite's available port selection.

## Checks

```sh
npm run build
```

Exported designs use the `orbisonic.vuMeterDesign` schema and keep live/simulated meter levels out of the JSON.
