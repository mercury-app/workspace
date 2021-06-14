import * as fs from "fs";
import * as fsp from "fs/promises";
import * as uuid from "uuid";
import git from "isomorphic-git";

import config from "../../config";

interface ProjectsDbEntry extends Object {
  id: string;
}

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

  static async get(): Promise<Array<Project>> {
    const projectsDbPath = config.projectsDbPath;
    const projectsDbData = await fsp.readFile(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const projectsDbJson = JSON.parse(projectsDbData) as Array<ProjectsDbEntry>;
    return Promise.all(projectsDbJson.map((obj) => Project.get(obj.id)));
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
  private _repo: { fs: typeof fsp; dir: string };

  static async make(): Promise<Project> {
    const id = uuid.v4();
    const project = new Project(id);
    project._createProjectDir();
    project._addProjectEntryToDb();
    project._writeProjectFiles();
    project._initRepo();
    project._readProjectFiles();
    return project;
  }

  static async get(id: string): Promise<Project> {
    const project = new Project(id);
    project._readProjectFiles();
    return project;
  }

  static async exists(id: string): Promise<boolean> {
    const projects = await Projects.get();
    return projects.some((project) => project.id === id);
  }

  private constructor(id: string) {
    this._id = id;
    const projectParentDirPath = config.projectsDirPath;
    this._path = `${projectParentDirPath}/${this._id}`;
    this._stateFilesDir = `${this._path}/.mercury`;
    this._notebooksDir = `${this._path}/notebooks`;

    this._canvasJsonPath = `${this._stateFilesDir}/${Project._canvasJsonFilename}`;
    this._dagJsonPath = `${this._stateFilesDir}/${Project._dagJsonFilename}`;
    this._canvas = {};
    this._dag = {};

    // A convenience structure that is passed in calls to isomorphic git APIs
    this._repo = { fs: fsp, dir: this._path };
  }

  private async _createProjectDir(): Promise<boolean> {
    try {
      if (!fs.existsSync(this._path)) {
        await fsp.mkdir(this._path);
      }
      if (!fs.existsSync(this._stateFilesDir)) {
        await fsp.mkdir(this._stateFilesDir);
      }
      if (!fs.existsSync(this._notebooksDir)) {
        await fsp.mkdir(this._notebooksDir);
      }
    } catch (exception) {
      return false;
    }
    return true;
  }

  private async _removeProjectDir(): Promise<void> {
    await fsp.rm(this._path, { recursive: true, force: true });
  }

  private async _addProjectEntryToDb(): Promise<void> {
    const projectsDbPath = config.projectsDbPath;
    let projectsData = await fsp.readFile(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    const projects = JSON.parse(projectsData);
    projects.push({
      id: this._id,
    });
    projectsData = JSON.stringify(projects);
    await fsp.writeFile(projectsDbPath, projectsData, { encoding: "utf-8" });
  }

  private async _removeProjectEntryFromDb(): Promise<void> {
    const projectsDbPath = config.projectsDbPath;
    let projectsData = await fsp.readFile(projectsDbPath, {
      encoding: "utf-8",
      flag: "r",
    });
    let projects = JSON.parse(projectsData);
    projects = projects.filter((project: Project) => project.id !== this._id);
    projectsData = JSON.stringify(projects);
    await fsp.writeFile(projectsDbPath, projectsData, { encoding: "utf-8" });
  }

  private async _readProjectFiles(): Promise<void> {
    this._canvas = await this._readJsonFileAsObject(this._canvasJsonPath);
    this._dag = await this._readJsonFileAsObject(this._dagJsonPath);
  }

  private async _readJsonFileAsObject(
    path: string
  ): Promise<Record<string, unknown>> {
    const data = await fsp.readFile(path, { encoding: "utf-8", flag: "r" });
    return JSON.parse(data);
  }

  private async _writeProjectFiles(): Promise<void> {
    await this._writeObjectToJsonFile(this._canvas, this._canvasJsonPath);
    await this._writeObjectToJsonFile(this._dag, this._dagJsonPath);
  }

  private async _writeObjectToJsonFile(
    object: Record<string, unknown>,
    path: string
  ): Promise<void> {
    const data = JSON.stringify(object);
    await fsp.writeFile(path, data, { encoding: "utf-8" });
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

  public toJson(): ProjectJson {
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

  public async delete(): Promise<void> {
    await this._removeProjectDir();
    await this._removeProjectEntryFromDb();
  }
}
