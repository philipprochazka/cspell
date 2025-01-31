import type { BufferEncoding } from './models/BufferEncoding.js';
import type { FileReference, FileResource, UrlOrFilename, UrlOrReference } from './models/FileResource.js';
import type { Stats } from './models/index.js';

export interface CSpellIO {
    /**
     * Read a file
     * @param uriOrFilename - uri of the file to read
     * @param encoding - optional encoding.
     * @returns A TextFileResource.
     */
    readFile(uriOrFilename: UrlOrReference, encoding?: BufferEncoding): Promise<FileResource>;
    /**
     * Read a file in Sync mode.
     * Note: `http` requests will fail.
     * @param uriOrFilename - uri of the file to read
     * @param encoding - optional encoding.
     * @returns A TextFileResource.
     */
    readFileSync(uriOrFilename: UrlOrReference, encoding?: BufferEncoding): FileResource;
    /**
     * Write content to a file using utf-8 encoding.
     * It will fail to write to non-file uris.
     * @param uriOrFilename - uri
     * @param content - string to write.
     */
    writeFile(uriOrFilename: UrlOrReference, content: string | ArrayBufferView): Promise<FileReference>;
    /**
     * Get Stats on a uri.
     * @param uriOrFilename - uri to fetch stats on
     * @returns Stats if successful.
     */
    getStat(uriOrFilename: UrlOrReference): Promise<Stats>;
    /**
     * Get Stats on a uri.
     * @param uriOrFilename - uri to fetch stats on
     * @returns Stats if successful, otherwise it throws an error.
     */
    getStatSync(uriOrFilename: UrlOrReference): Stats;
    /**
     * Compare two Stats.
     * @param left - left stat
     * @param right - right stat
     * @returns 0 if they are equal and non-zero if they are not.
     */
    compareStats(left: Stats, right: Stats): number;

    /**
     * Convert a string to a URL
     * @param urlOrFilename - string or URL to convert.
     *   If it is a URL, then it is just returned as is.
     *   If is is a string and fully formed URL, then it is parsed.
     *   If it is a string without a protocol/scheme it is assumed to be relative to `relativeTo`.
     * @param relativeTo - optional
     */
    toURL(urlOrFilename: UrlOrReference, relativeTo?: string | URL): URL;

    /**
     * Convert a string to a File URL
     * @param urlOrFilename - string or URL to convert.
     * @param relativeTo - optional
     */
    toFileURL(urlOrFilename: UrlOrFilename, relativeTo?: string | URL): URL;

    /**
     * Try to determine the base name of a URL.
     *
     * Note: this handles `data:` URLs with `filename` attribute:
     *
     * Example:
     * - `data:text/plain;charset=utf8;filename=hello.txt,Hello` would have a filename of `hello.txt`
     * - `file:///user/project/cspell.config.yaml` would have a filename of `cspell.config.yaml`
     * - `https://raw.guc.com/sss/cspell/main/cspell.schema.json` would have a filename of `cspell.schema.json`
     * @param urlOrFilename - string or URL to extract the basename from.
     */
    urlBasename(urlOrFilename: UrlOrReference): string;
    /**
     * Try to determine the directory URL of the uri.
     *
     * Example:
     * - `file:///user/local/file.txt` becomes `file:///user/local/`
     * - `file:///user/local/` becomes `file:///user/`
     *
     * @param urlOrFilename - string or URL
     */
    urlDirname(urlOrFilename: UrlOrReference): URL;

    // /**
    //  *
    //  * @param uriOrFilename
    //  * @param relativeTo -
    //  */
    // resolveUrl(uriOrFilename: UrlOrFilename, relativeTo: UrlOrFilename): URL;
}
