import * as fs from "fs";
import * as uuid from "uuid";

import config from "../../config";

const canvasJsonFilename = "canvas.json";
const dagJsonFilename = "dag.json";
const projectsType = "projects";

export interface ProjectJson extends Object {
  id: string;
  type: string;
  attributes: {
    path: string;
    canvas: Record<string, unknown>;
    dag: Record<string, unknown>;
  };
}

export class Project {
  private readonly _id: string;
  private _path: string;
  private _canvasJsonPath: string;
  private _canvas: Record<string, unknown>;
  private _dagJsonPath: string;
  private _dag: Record<string, unknown>;

  constructor(id = "") {
    this._id = id;

    let isNewProject = false;
    if (this._id === "") {
      isNewProject = true;
      this._id = uuid.v4();
    }

    const projectParentDirPath = config.projectsDirPath;
    this._path = `${projectParentDirPath}/${this._id}`;
    this._canvasJsonPath = `${this._path}/${canvasJsonFilename}`;
    this._canvas = {};
    this._dagJsonPath = `${this._path}/${dagJsonFilename}`;
    this._dag = {};

    if (isNewProject) {
      this._createProjectDir();
      this._addProjectEntryToDb();
      this._writeProjectFiles();
    } else {
      this._readProjectFiles();
    }
  }

  private _createProjectDir(): boolean {
    try {
      if (!fs.existsSync(this._path)) {
        fs.mkdirSync(this._path);
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
      type: projectsType,
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

  get id(): string {
    return this._id;
  }

  get canvas(): Record<string, unknown> {
    return this._canvas;
  }

  set canvas(canvas: Record<string, unknown>) {
    this._canvas = canvas;
  }

  get dag(): Record<string, unknown> {
    return this._dag;
  }

  set dag(dag: Record<string, unknown>) {
    this._dag = dag;
  }

  public asJson(): ProjectJson {
    return {
      id: this._id,
      type: projectsType,
      attributes: {
        path: this._path,
        canvas: this._canvas,
        dag: this._dag,
      },
    };
  }

  public commit(): string {
    // TODO: implement this
    return "commit-sha";
  }

  public delete(): void {
    this._removeProjectDir();
    this._removeProjectEntryFromDb();
  }
}
