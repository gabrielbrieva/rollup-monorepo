import path from 'path';
import typescript from '@wessberg/rollup-plugin-ts';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import sourcemaps from 'rollup-plugin-sourcemaps';
import json from '@rollup/plugin-json';
//import minimist from 'minimist';
import batchPackages from '@lerna/batch-packages';
import filterPackages from '@lerna/filter-packages';
import { getPackages } from '@lerna/project';
//import repo from './lerna.json';
//import fs from 'fs';

/**
 * Get a list of the non-private sorted packages with Lerna v3
 * @see https://github.com/lerna/lerna/issues/1848
 * @return {Promise<Package[]>} List of packages
 */

async function getSortedPackages(scope, ignore)
{
    const packages = await getPackages(__dirname);
    const filtered = filterPackages(
        packages,
        scope,
        ignore,
        false
    );

    return batchPackages(filtered)
        .reduce((arr, batch) => arr.concat(batch), []);
}

async function main()
{
    const plugins = [
        //sourcemaps(),
        nodeResolve(/*{
            browser: true,
            preferBuiltins: false,
        }*/),
        //commonjs(),
        //json(),
        typescript({
            tsconfig: "tsconfig.json",
            browserslist: false
        })
    ];

    const sourcemap = true;
    const results = [];

    // Support --scope and --ignore globs if passed in via commandline
    //const { scope, ignore } = minimist(process.argv.slice(2));
    //const packages = await getSortedPackages(scope, ignore);
    const packages = await getSortedPackages();

    const namespaces = {};
    const pkgData = {};

    // Create a map of globals to use for bundled packages
    packages.forEach((pkg) =>
    {
        const data = pkg.toJSON();
        pkgData[pkg.name] = data;
        namespaces[pkg.name] = data.namespace || 'NCR';
    });

    packages.forEach((pkg) =>
    {

        // Check for bundle folder
        const external = [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.peerDependencies || {})
        ];

        const basePath = path.relative(__dirname, pkg.location);
        let input = path.join(basePath, 'src/index.ts');

        const {
            main,
            module,
            bundle
        } = pkgData[pkg.name];

        const name = pkg.name.replace(/[^a-z|0-9]+/g, '_');

        results.push({
            input,
            output: [
                {
                    file: path.join(basePath, main),
                    format: 'cjs',
                    sourcemap,
                },
                {
                    file: path.join(basePath, module),
                    format: 'esm',
                    sourcemap,
                },
                {
                    file: path.join(basePath, bundle),
                    format: 'iife',
                    name: name,
                    sourcemap,
                    globals: namespaces
                }
            ],
            external,
            plugins,
        });
    });

    console.log(JSON.stringify(results, null, 3));

    return results;
}

export default main();
