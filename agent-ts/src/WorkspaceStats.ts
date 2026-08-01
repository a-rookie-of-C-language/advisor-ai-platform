export interface WorkspaceStats {
  user_id: number | null;
  session_id: number | null;
  total_files: number;
  total_size: number;
  cache_files: number;
  cache_size: number;
  final_files: number;
  final_size: number;
  cache_dir: string;
  final_dir: string;
}
