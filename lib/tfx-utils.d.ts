export function TfxIgnore(vsixPackageFile?: string, ignoreFileName?: string, consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
}): void;
export function TfxMkboot(packagePath?: string, bootFile?: string, consoleOptions?: {
    logLevel?: "default" | "debug" | "verbose";
    verbose?: boolean;
    debug?: boolean;
}, ...commands: string[]): void;
