export function RemoveDeclarations(packagePath?: string, options?: {
    declarationFileExtension?: string;
    dryRun?: boolean;
}, ...includeSubfolders: string[]): number;
