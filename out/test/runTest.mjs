import path from 'path';
import Mocha from 'mocha';
import glob from 'glob';

export async function run() {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    });

    const testsRoot = path.resolve('out/test/suite');
    const files = glob.sync('**/*.test.js', { cwd: testsRoot });
    files.forEach(f => mocha.addFile(path.resolve(testsRoot, f)));
    return new Promise((resolve, reject) => {
        try {
            mocha.run(failures => {
                if (failures > 0) {
                    reject(new Error(`${failures} tests failed.`));
                } else {
                    resolve();
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

if (import.meta.url === process.argv[1] || import.meta.url === `file://${process.argv[1]}`) {
    run();
}
