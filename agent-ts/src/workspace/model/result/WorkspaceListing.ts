export interface WorkspaceListing {
  name: string;
  type: "file" | "dir";
  size?: number;
}
