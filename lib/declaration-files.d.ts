export function RemoveDeclarations(packagePath?: string, options?: {
    declarationFileExtension?: string;
    dryRun?: boolean;
    consoleOptions?: {
        logLevel?: "default" | "debug" | "verbose";
        verbose?: boolean;
        debug?: boolean;
    };
}, ...includeSubfolders: string[]): number;
