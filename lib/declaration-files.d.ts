export function RemoveDeclarations(packagePath?: string, options?: {
    declarationFileExtension?: string;
    dryRun?: boolean;
    consoleOptions?: import("..").ConsoleOptions_ | import("..").ConsoleOptions;
}, ...includeSubfolders: string[]): number;
