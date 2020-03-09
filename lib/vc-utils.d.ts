import { HistoryEntry } from "./vc-utils";

class HistoryEntry { constructor(timestamp: number) };
class StatusEntry { constructor(status: string, file: string) };

function GetHistory(pathSpec: string): HistoryEntry[];
function GetLastChange(pathSpec: string, excludeStatusCodes: string[], ignoreStatusCodes: string[]): number; 