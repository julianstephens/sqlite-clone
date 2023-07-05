import { promises as fsPromises } from "fs";
import { FileHandle } from "fs/promises";
import Database from "./database";
import logger from "./logger";
import { FixedArray } from "./types";
import { Cyberlite as CB } from "./types/cyberlite";
import { propertyOf } from "./utils";

/** Caches pages and writes to db file  */
export default class Pager {
  readonly path: string;
  #fileHandle: FileHandle | null = null;
  fileLength: number;
  pages: FixedArray<Buffer | null, 100>;

  /**
   * @param path location of the db file
   */
  constructor(path: string) {
    this.path = path;
    this.getFile(path).then((size) => {
      this.fileLength = size;
      this.pages = Array.apply(null, {
        length: Database.TABLE_MAX_PAGES,
      });
    });
  }

  #handleError = (status: CB.CyberliteErrorStatus, err?: unknown) => {
    if (err) {
      const cbErr = propertyOf(CB.CyberliteError, (x) => x[status]);
      logger.error(cbErr);
      process.exitCode = 1;
      throw new Error(cbErr);
    }
  };

  /**
   * Opens the db file for writing
   * @param path location of the db file
   * @returns file descriptor and file length
   */
  getFile = async (path: string) => {
    let size: number;

    try {
      // open with 'w' flag creates file or truncates existing
      this.#fileHandle = await fsPromises.open(path, "w");
      const stats = await this.#fileHandle.stat();
      size = stats.size;
    } catch (err) {
      this.#handleError("IOERR_OPEN", err);
    } finally {
      await this.#fileHandle?.close();
      this.#fileHandle = null;
    }

    return size;
  };

  /**
   * Checks for page in cache or reads from db file
   * @param pageNum page to retrieve
   * @returns requested buffer
   */
  getPage = async (pageNum: number) => {
    if (pageNum > Database.TABLE_MAX_PAGES) {
      this.#handleError("TABLE_FULL", true);
    }

    // page not cached. create and load from db file
    const page = Buffer.alloc(Database.PAGE_SIZE);
    let numPages = ~~(this.fileLength / Database.PAGE_SIZE);
    let parsedPage: Buffer;

    if (this.fileLength % Database.PAGE_SIZE) numPages++;

    if (pageNum <= numPages) {
      try {
        this.#fileHandle = await fsPromises.open(this.path, "w");
        const { size } = await this.#fileHandle.stat();
        if (size && size > 0) {
          const res = await this.#fileHandle.read(
            page,
            0,
            Database.PAGE_SIZE,
            pageNum * Database.PAGE_SIZE,
          );
          parsedPage = res.buffer;
        }
      } catch (err) {
        this.#handleError("IOERR_READ", err);
      } finally {
        this.#fileHandle?.close();
        this.#fileHandle = null;
      }
    }
    return parsedPage;
  };

  /**
   * Commits changes in page cache
   * @param pageNum
   */
  flush = async (pageNum: number) => {
    if (!this.pages[pageNum]) {
      this.#handleError("CYBERLITE_INTERNAL", true);
    }

    try {
      this.#fileHandle = await fsPromises.open(this.path, "w");
      await this.#fileHandle.write(
        this.pages[pageNum],
        0,
        Database.PAGE_SIZE,
        pageNum * Database.PAGE_SIZE,
      );
    } catch (err) {
      this.#handleError("IOERR_OPEN", err);
    } finally {
      await this.#fileHandle?.close();
      this.#fileHandle = null;
    }
  };
}
