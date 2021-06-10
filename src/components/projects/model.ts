import * as fs from "fs";
import * as uuid from "uuid";
import git from "isomorphic-git";

import config from "../../config";

export interface ProjectJson extends Object {
  id: string;
  type: string;
  attributes?: {
    path: string;
    canvas: Record<string, unknown>;
    dag: Record<string, unknown>;
    notebooks_dir: string;
  };
}

export class Projects {
  static readonly type = "projects";

  static all(): Array<ProjectJson> {
    const projectsDbPath = config.projectsDbPath;
    const projectsData = fs.readFileSync(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    return JSON.parse(projectsData);
  }
}

export class Project {
  private static readonly _canvasJsonFilename = "canvas.json";
  private static readonly _dagJsonFilename = "dag.json";

  private readonly _id: string;
  private readonly _path: string;
  private readonly _stateFilesDir: string;
  private readonly _notebooksDir: string;
  private readonly _canvasJsonPath: string;
  private readonly _dagJsonPath: string;
  private _canvas: Record<string, unknown>;
  private _dag: Record<string, unknown>;
  private _repo: { fs: typeof fs; dir: string };

  constructor(id = "") {
    this._id = id;
    if (!this._id) {
      this._id = uuid.v4();
    }

    const projectParentDirPath = config.projectsDirPath;
    this._path = `${projectParentDirPath}/${this._id}`;
    this._stateFilesDir = `${this._path}/.mercury`;
    this._notebooksDir = `${this._path}/notebooks`;

    this._canvasJsonPath = `${this._stateFilesDir}/${Project._canvasJsonFilename}`;
    this._dagJsonPath = `${this._stateFilesDir}/${Project._dagJsonFilename}`;
    this._canvas = {};
    this._dag = {};

    // A convenience structure that is passed in calls to isomorphic git APIs
    this._repo = { fs, dir: this._path };

    if (!fs.existsSync(this._path)) {
      this._createProjectDir();
      this._addProjectEntryToDb();
      this._writeProjectFiles();
      this._initRepo();
    } else {
      this._readProjectFiles();
    }
  }

  private _createProjectDir(): boolean {
    try {
      if (!fs.existsSync(this._path)) {
        fs.mkdirSync(this._path);
      }
      if (!fs.existsSync(this._stateFilesDir)) {
        fs.mkdirSync(this._stateFilesDir);
      }
      if (!fs.existsSync(this._notebooksDir)) {
        fs.mkdirSync(this._notebooksDir);
      }
    } catch (exception) {
      return false;
    }
    return true;
  }

  private _removeProjectDir(): void {
    fs.rmSync(this._path, { recursive: true, force: true });
  }

  private _addProjectEntryToDb(): void {
    const projectsDbPath = config.projectsDbPath;
    let projectsData = fs.readFileSync(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const projects = JSON.parse(projectsData);
    projects.push({
      id: this._id,
      type: Projects.type,
    });
    projectsData = JSON.stringify(projects);
    fs.writeFileSync(projectsDbPath, projectsData, { encoding: "utf-8" });
  }

  private _removeProjectEntryFromDb(): void {
    const projectsDbPath = config.projectsDbPath;
    let projectsData = fs.readFileSync(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    let projects = JSON.parse(projectsData);
    projects = projects.filter((project: Project) => project.id !== this._id);
    projectsData = JSON.stringify(projects);
    fs.writeFileSync(projectsDbPath, projectsData, { encoding: "utf-8" });
  }

  private _readProjectFiles(): void {
    this._canvas = this._readJsonFileAsObject(this._canvasJsonPath);
    this._dag = this._readJsonFileAsObject(this._dagJsonPath);
  }

  private _readJsonFileAsObject(path: string): Record<string, unknown> {
    const data = fs.readFileSync(path, { encoding: "utf-8", flag: "r" });
    return JSON.parse(data);
  }

  private _writeProjectFiles(): void {
    this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
    this._writeObjectToJsonFile(this._dag, this._dagJsonPath);
  }

  private _writeObjectToJsonFile(
    object: Record<string, unknown>,
    path: string
  ) {
    const data = JSON.stringify(object);
    fs.writeFileSync(path, data, { encoding: "utf-8" });
  }

  public async _initRepo(): Promise<void> {
    await git.init(this._repo);
    await this.commit(
      config.defaultCommitAuthorName,
      config.defaultCommitAuthorEmail,
      "Initial commit"
    );
  }

  get id(): string {
    return this._id;
  }

  get path(): string {
    return this._path;
  }

  get canvas(): Record<string, unknown> {
    return this._canvas;
  }

  set canvas(canvas: Record<string, unknown>) {
    this._canvas = canvas;
    this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
  }

  get dag(): Record<string, unknown> {
    return this._dag;
  }

  set dag(dag: Record<string, unknown>) {
    this._dag = dag;
    this._writeObjectToJsonFile(this._dag, this._dagJsonPath);
  }

  public asJson(): ProjectJson {
    return {
      id: this._id,
      type: Projects.type,
      attributes: {
        path: this._path,
        canvas: this._canvas,
        dag: this._dag,
        notebooks_dir: this._notebooksDir,
      },
    };
  }

  public async commit(
    authorName: string,
    authorEmail: string,
    message: string
  ): Promise<string> {
    // The following is equivalent to `git add -A .`
    await git
      .statusMatrix(this._repo)
      .then((status) =>
        Promise.all(
          status.map(([filepath, , workingTreeStatus]) =>
            workingTreeStatus
              ? git.add({ ...this._repo, filepath })
              : git.remove({ ...this._repo, filepath })
          )
        )
      );

    const sha = await git.commit({
      ...this._repo,
      author: {
        name: authorName ? authorName : config.defaultCommitAuthorName,
        email: authorEmail ? authorEmail : config.defaultCommitAuthorEmail,
      },
      message: message ? message : config.defaultCommitMessage,
    });

    return sha;
  }

  public delete(): void {
    this._removeProjectDir();
    this._removeProjectEntryFromDb();
  }
}
