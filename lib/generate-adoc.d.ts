export function GenerateReadme(packagePath?: string, readmeBasename?: string, options?: GenerateReadmeOptions): void;
export function Resolve(includeRootSourcePath: string, EOL: string, ...lines: any[]): string;
export function ResolveIncludes(includeRootSourcePath: string, ...lines: string[]): string[];
export function ResolveAttributes(...lines: string[]): string[];
export function GetAttribute(attributeName: string, ...lines: string[]): string;
export function GetAttributes(...lines: string[]): any;
export type GenerateReadmeFormat = "adoc" | "xml" | "md";
export type GenerateReadmeDependencyType = "none" | "global" | "regular" | "dev" | "opt";
export type GenerateReadmeOptions = {
    /**
     * The line separator to use (defaults to `os.EOL` if
    omitted).
     */
    EOL?: string;
    /**
     * Controls whether to update the date
    specification in the output document (i.e. the asciidoc `Date` attribute,
    which might be resolved and translated when saving in a different format).
     */
    updateTimestamp?: boolean;
    /**
     * Controls whether to update the
    package file (e.g. with the path of the generated document in the `readme`
    element).
     */
    noPackageJsonUpdate?: boolean;
    /**
     * Controls the
    rendering of the `npm install` command in the Installation block (defaults
    to `regular` if omitted).
     */
    dependencyType?: "none" | "global" | "regular" | "dev" | "opt";
    /**
     * The format to use for saving
    the generated file (defaults to `adoc` if omitted).
     */
    outputFormat?: "adoc" | "xml" | "md";
};
