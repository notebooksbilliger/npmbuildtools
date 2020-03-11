export function UpdatePackageVersion(packagePath: string, releaseType: import("semver").ReleaseType): void;
export type ReleaseType = "major" | "premajor" | "minor" | "preminor" | "patch" | "prepatch" | "prerelease";
export function ReleaseType(releaseType: string): import("semver").ReleaseType;
