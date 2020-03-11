export function GenerateReadme(packagePath?: string, readmeFileName?: string, options?: {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
}): void;
export function Resolve(includeRootSourcePath: any, EOL: any, ...lines: any[]): string;
export function ResolveIncludes(includeRootSourcePath: string, ...lines: string[]): string[];
export function GetAttribute(attributeName: string, ...lines: string[]): string;
export type GenerateReadmeOptions = {
    EOL?: string;
    updateTimestamp?: boolean;
    noPackageJsonUpdate?: boolean;
    dependencyType?: string;
};
