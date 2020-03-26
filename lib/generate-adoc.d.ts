export function GenerateReadme(packagePath?: string, readmeFileName?: string, options?: {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
}): void;
export function Resolve(includeRootSourcePath: string, EOL: string, ...lines: any[]): string;
export function ResolveIncludes(includeRootSourcePath: string, ...lines: string[]): string[];
export function ResolveAttributes(...lines: string[]): string[];
export function GetAttribute(attributeName: string, ...lines: string[]): string;
export function GetAttributes(...lines: string[]): any;
export type GenerateReadmeOptions = {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
};
