import * as fs from "fs";
import git, { CommitObject } from "isomorphic-git";

import { Project } from "../projects/model";

export interface CommitJson extends Object {
  id: string;
  type: string;
  attributes?: {
    project_id: string;
    parent_commit_refs: Array<string>;
    message: string;
    author_name: string;
    author_email: string;
    timestamp: number;
    timezone_offset: number;
  };
}

export class Commits {
  static readonly type = "commits";

  static async multipleFrom(
    project: Project,
    n: number,
    from: string
  ): Promise<Array<Commit>> {
    const commitResults = await git.log({
      fs,
      dir: project.path,
      depth: n,
      ref: from,
    });
    const commits = commitResults.map(
      (result) => new Commit(project, result.oid, result.commit)
    );
    return commits;
  }
}

export class Commit {
  private readonly _sha: string;
  private readonly _projectId: string;
  private readonly _parentCommitRefs: Array<string>;
  private readonly _message: string;
  private readonly _authorName: string;
  private readonly _authorEmail: string;
  private readonly _timestamp: number;
  private readonly _timezoneOffset: number;

  static async exact(project: Project, sha: string): Promise<Commit> {
    const commitResults = await git.log({
      fs,
      dir: project.path,
      depth: 1,
      ref: sha,
    });
    if (commitResults.length === 0) {
      return null;
    }
    return new Commit(project, commitResults[0].oid, commitResults[0].commit);
  }

  static async exists(project: Project, sha: string): Promise<boolean> {
    return (await Commit.exact(project, sha)) !== null;
  }

  constructor(
    project: Project,
    sha: string,
    commitObject: CommitObject = null
  ) {
    this._sha = sha;
    this._projectId = project.id;
    this._parentCommitRefs = commitObject.parent;
    this._message = commitObject.message;
    this._authorName = commitObject.author.name;
    this._authorEmail = commitObject.author.email;
    this._timestamp = commitObject.author.timestamp;
    this._timezoneOffset = commitObject.author.timezoneOffset;
  }

  public toJson(): CommitJson {
    return {
      id: this._sha,
      type: Commits.type,
      attributes: {
        project_id: this._projectId,
        parent_commit_refs: this._parentCommitRefs,
        message: this._message,
        author_name: this._authorName,
        author_email: this._authorEmail,
        timestamp: this._timestamp,
        timezone_offset: this._timezoneOffset,
      },
    };
  }
}
