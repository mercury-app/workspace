const commitsType = "commits";

export interface CommitJson extends Object {
  id: string;
  type: string;
  attributes: {
    project_id: string;
    branch: string;
    parent_commit_id: string;
    author_name: string;
    author_email: string;
    message: string;
    timestamp: number;
    timezone_offset: number;
  };
}
