export function ResolvePath(basename: string, limit?: number, platform?: string): string | string[];
export function ResolveEnv(text: string, platform?: string): string;
export function ListProperties(object: any, options?: ListPropertiesOptions): string[];
export type OutString = {
    value: string;
};
export type ListPropertiesOptions = {
    /**
     * The name of the object, which will be used as a
    prefix in every line (defaults to 'object' if omitted).
     */
    namePrefix?: string;
    /**
     * Optional list of property types to skip.
     */
    skipTypeOf?: string[];
};
