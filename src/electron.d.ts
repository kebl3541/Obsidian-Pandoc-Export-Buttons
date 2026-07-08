/**
 * Minimal typings for the Electron surface Obsidian exposes to plugins.
 * Only the members this plugin actually uses are declared, so the
 * type-checker verifies every call site instead of treating them as `any`.
 */
declare module "electron" {
  interface PdfWebContents {
    printToPDF(options: {
      printBackground?: boolean;
      pageSize?: string;
    }): Promise<Uint8Array>;
  }

  interface HiddenWindow {
    loadFile(path: string): Promise<void>;
    webContents: PdfWebContents;
    destroy(): void;
  }

  interface HiddenWindowConstructor {
    new (options: {
      show?: boolean;
      webPreferences?: {
        sandbox?: boolean;
        nodeIntegration?: boolean;
        contextIsolation?: boolean;
      };
    }): HiddenWindow;
  }

  export const shell: {
    openPath(path: string): Promise<string>;
    showItemInFolder(path: string): void;
  };

  /** Present in Obsidian desktop; typed optional in case it's ever removed. */
  export const remote: { BrowserWindow?: HiddenWindowConstructor } | undefined;
}
