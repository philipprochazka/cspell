import * as Dictionaries from './Dictionaries';
import { getDefaultSettings, loadConfig } from '../Settings';
import * as path from 'path';
import * as fs from 'fs-extra';
import { CSpellUserSettings } from '@cspell/cspell-types';
import { isSpellingDictionaryLoadError } from './SpellingDictionaryError';

// cspell:ignore café rhône

const root = path.resolve(__dirname, '../..');
const samples = path.join(root, 'samples');

describe('Validate getDictionary', () => {
    const ignoreCaseFalse = { ignoreCase: false };
    const ignoreCaseTrue = { ignoreCase: true };

    test.each`
        word       | opts               | expected
        ${'zero'}  | ${ignoreCaseFalse} | ${false}
        ${'Café'}  | ${ignoreCaseFalse} | ${true}
        ${'CAFÉ'}  | ${ignoreCaseFalse} | ${true}
        ${'café'}  | ${ignoreCaseFalse} | ${true}
        ${'cafe'}  | ${ignoreCaseTrue}  | ${true}
        ${'CAFE'}  | ${ignoreCaseTrue}  | ${true}
        ${'Rhône'} | ${ignoreCaseFalse} | ${true}
        ${'RHÔNE'} | ${ignoreCaseFalse} | ${true}
        ${'rhône'} | ${ignoreCaseFalse} | ${false}
        ${'RHÔNE'} | ${ignoreCaseTrue}  | ${true}
        ${'rhône'} | ${ignoreCaseTrue}  | ${true}
        ${'rhone'} | ${ignoreCaseFalse} | ${false}
        ${'rhone'} | ${ignoreCaseTrue}  | ${true}
        ${'snarf'} | ${ignoreCaseTrue}  | ${false}
    `('tests that userWords are included in the dictionary', async ({ word, opts, expected }) => {
        const settings = {
            ...getDefaultSettings(),
            dictionaries: [],
            words: ['one', 'two', 'three', 'café', '!snarf'],
            userWords: ['four', 'five', 'six', 'Rhône'],
        };

        const dict = await Dictionaries.getDictionary(settings);
        settings.words.forEach((w) => {
            const word = w.replace(/^[!+*]*(.*?)[*+]*$/, '$1');
            const found = w[0] !== '!';
            const result = { word, found: dict.has(word) };
            expect(result).toEqual({ word, found });
        });
        settings.userWords.forEach((w) => {
            const word = w.replace(/^[!+*]*(.*?)[*+]*$/, '$1');
            const found = w[0] !== '!';
            const result = { word, found: dict.has(word) };
            expect(result).toEqual({ word, found });
        });
        expect(dict.has(word, opts)).toBe(expected);
    });

    test.each`
        word       | opts               | expected
        ${'zero'}  | ${undefined}       | ${false}
        ${'Rhône'} | ${ignoreCaseFalse} | ${true}
        ${'RHÔNE'} | ${ignoreCaseFalse} | ${true}
        ${'Café'}  | ${ignoreCaseFalse} | ${true}
        ${'rhône'} | ${ignoreCaseFalse} | ${false}
        ${'rhone'} | ${ignoreCaseFalse} | ${false}
        ${'café'}  | ${ignoreCaseFalse} | ${true}
        ${'rhône'} | ${ignoreCaseFalse} | ${false}
        ${'rhone'} | ${ignoreCaseFalse} | ${false}
        ${'cafe'}  | ${ignoreCaseFalse} | ${false}
        ${'café'}  | ${ignoreCaseTrue}  | ${true}
        ${'rhône'} | ${ignoreCaseTrue}  | ${true}
        ${'rhone'} | ${ignoreCaseTrue}  | ${true}
        ${'cafe'}  | ${ignoreCaseTrue}  | ${true}
    `('Case sensitive "$word" $opts', async ({ word, opts, expected }) => {
        const settings = {
            ...getDefaultSettings(),
            dictionaries: [],
            words: ['one', 'two', 'three', 'café'],
            userWords: ['four', 'five', 'six', 'Rhône'],
            caseSensitive: true,
        };

        const dict = await Dictionaries.getDictionary(settings);
        settings.words.forEach((word) => {
            const result = { word, found: dict.has(word) };
            expect(result).toEqual({ word, found: true });
        });
        settings.userWords.forEach((word) => {
            const result = { word, found: dict.has(word) };
            expect(result).toEqual({ word, found: true });
        });
        expect(dict.has(word, opts)).toBe(expected);
    });

    test('Refresh Dictionary Cache', async () => {
        const tempDictPath = path.join(__dirname, '..', '..', 'temp', 'words.txt');
        await fs.mkdirp(path.dirname(tempDictPath));
        await fs.writeFile(tempDictPath, 'one\ntwo\nthree\n');

        const settings = getDefaultSettings();
        const defs = (settings.dictionaryDefinitions || []).concat([
            {
                name: 'temp',
                path: tempDictPath,
            },
            {
                name: 'not_found',
                path: tempDictPath,
            },
        ]);
        const toLoad = ['node', 'html', 'css', 'not_found', 'temp'];
        const dicts = await Promise.all(Dictionaries.loadDictionaries(toLoad, defs));

        expect(dicts[3].has('one')).toBe(true);
        expect(dicts[3].has('four')).toBe(false);

        await Dictionaries.refreshDictionaryCache(0);
        const dicts2 = await Promise.all(Dictionaries.loadDictionaries(toLoad, defs));

        // Since noting changed, expect them to be the same.
        expect(dicts.length).toEqual(toLoad.length);
        expect(dicts2.length).toEqual(dicts.length);
        dicts.forEach((d, i) => expect(dicts2[i]).toEqual(d));

        // Update one of the dictionaries to see if it loads.
        await fs.writeFile(tempDictPath, 'one\ntwo\nthree\nfour\n');

        const dicts3 = await Promise.all(Dictionaries.loadDictionaries(toLoad, defs));
        // Should be using cache and will not contain the new words.
        expect(dicts3[3].has('one')).toBe(true);
        expect(dicts3[3].has('four')).toBe(false);

        await Dictionaries.refreshDictionaryCache(0);

        const dicts4 = await Promise.all(Dictionaries.loadDictionaries(toLoad, defs));
        // Should be using the latest copy of the words.
        expect(dicts4[3].has('one')).toBe(true);
        expect(dicts4[3].has('four')).toBe(true);
    });

    interface TestLoadFromConfig {
        configFile: string;
        expectedErrors: Error[];
    }

    test.each`
        configFile                              | expectedErrors
        ${sample('yaml-config/cspell.yaml')}    | ${[{ name: 'missing dictionary file', message: 'failed to load' }]}
        ${sample('.cspell.json')}               | ${[{ name: 'missing dictionary file', message: 'failed to load' }]}
        ${sample('js-config/cspell.config.js')} | ${[]}
    `(
        'Load related dictionaries for config $configFile',
        async ({ configFile, expectedErrors }: TestLoadFromConfig) => {
            const settings = await loadConfig(configFile);
            if (!settings) {
                // eslint-disable-next-line jest/no-conditional-expect
                expect(settings).toBeDefined();
                return;
            }
            // Enable ALL dictionaries
            settings.dictionaries = getAllDictionaryNames(settings);
            const d = await Dictionaries.getDictionary(settings);
            const errors = d.getErrors();
            expect(errors).toHaveLength(expectedErrors.length);
            errors.forEach((e) => expect(isSpellingDictionaryLoadError(e)).toBe(true));
            expect(errors).toEqual(expect.arrayContaining(expectedErrors.map((e) => expect.objectContaining(e))));
        }
    );
});

function sample(file: string): string {
    return path.join(samples, file);
}

function getAllDictionaryNames(settings: CSpellUserSettings): string[] {
    const { dictionaries = [], dictionaryDefinitions = [] } = settings;

    return dictionaries.concat(dictionaryDefinitions.map((d) => d.name));
}
