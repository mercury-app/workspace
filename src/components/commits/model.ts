import { Project } from "../projects/model";

export interface CommitJson extends Object {
  id: string;
  type: string;
  attributes?: {
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

export class Commits {
  static readonly type = "commits";

  static async all(
    project: Project,
    from = "HEAD",
    n = -1
  ): Promise<Array<CommitJson>> {
    // TODO: implement this
    return;
  }
}

export class Commit {
  private readonly _sha: string;
  private readonly _projectId: string;
  private readonly _branch: string;
  private readonly _parentCommitRef: string;
  private readonly _authorName: string;
  private readonly _authorEmail: string;
  private readonly _message: string;
  private readonly _timestamp: number;
  private readonly _timezoneOffset: number;

  constructor(project: Project, sha: string) {
    // TODO: implement this
  }

  public toJson(): CommitJson {
    return {
      id: this._sha,
      type: Commits.type,
      attributes: {
        project_id: this._projectId,
        branch: this._branch,
        parent_commit_id: this._parentCommitRef,
        author_name: this._authorName,
        author_email: this._authorEmail,
        message: this._message,
        timestamp: this._timestamp,
        timezone_offset: this._timezoneOffset,
      },
    };
  }
}
