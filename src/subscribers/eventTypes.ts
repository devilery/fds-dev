export interface ICommitCheck {
  status: 'pending' | 'success' | 'error' | 'failure';
  type: 'standard' | 'check';
  from: string;
  id: number;
  commit_sha: string;
  name: string;
  target_url: string;
  context: string;
  pull_request_id: number;
  raw_data: any;
}