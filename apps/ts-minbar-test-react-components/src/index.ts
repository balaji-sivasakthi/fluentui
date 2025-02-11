import * as path from 'path';
import * as fs from 'node:fs/promises';
import {
  prepareTempDirs,
  log,
  shEcho,
  TempPaths,
  generateFiles,
  addResolutionPathsForProjectPackages,
  packProjectPackages,
} from '@fluentui/scripts-projects-test';

const tsVersion = '3.9';
const testName = 'ts-minbar-react-components';

/**
 *
 * REMOVE after https://github.com/microsoft/keyborg/issues/69 is fixed
 */
async function pinKeyborgUntilDtsIsFixed(appRoot: string) {
  const jsonPath = path.join(appRoot, 'package.json');
  const jsonContent = await fs.readFile(jsonPath, 'utf-8');
  const json = JSON.parse(jsonContent);
  json.resolutions['keyborg'] = '2.3.0';
  await fs.writeFile(jsonPath, JSON.stringify(json, null, 2));
}

async function performTest() {
  let tempPaths: TempPaths;
  const logger = log(`test:${testName}`);

  try {
    const scaffoldPathRoot = path.resolve(__dirname, '../files');

    tempPaths = prepareTempDirs(`${testName}-`);
    logger(`✔️ Temporary directories created under ${tempPaths.root}`);

    // Install dependencies, using the minimum TS version supported for consumers
    const dependencies = [
      '@types/react@17',
      '@types/react-dom@17',
      'react@17',
      'react-dom@17',
      `typescript@${tsVersion}`,
    ].join(' ');
    await shEcho(`yarn add ${dependencies}`, tempPaths.testApp);
    logger(`✔️ Dependencies were installed`);

    const packedPackages = await packProjectPackages(logger, '@fluentui/react-components');
    await addResolutionPathsForProjectPackages(tempPaths.testApp);

    await pinKeyborgUntilDtsIsFixed(tempPaths.testApp);

    await shEcho(`yarn add ${packedPackages['@fluentui/react-components']}`, tempPaths.testApp);
    logger(`✔️ Fluent UI packages were added to dependencies`);

    generateFiles(scaffoldPathRoot, tempPaths.testApp);
    logger(`✔️ Source and configs were copied`);

    await shEcho(`npx npm-which yarn`);

    await shEcho(`yarn --version`);
    await shEcho(`yarn tsc --version`);
    await shEcho(`yarn tsc --version`, tempPaths.testApp);
  } catch (err) {
    console.error('Something went wrong setting up the test:');
    console.error(err instanceof Error ? err?.stack : err);
    process.exit(1);
  }

  try {
    await shEcho(`yarn tsc --noEmit`, tempPaths.testApp);
    logger(`✔️ Example project was successfully built with typescript@${tsVersion}`);
  } catch (e) {
    console.error(e);

    console.log('');
    console.error(
      `Building a test project referencing @fluentui/react-components using typescript@${tsVersion} failed.`,
    );
    console.error(
      `This is most likely because you added an API in @fluentui/react-components or a dependency which uses ` +
        `typescript features introduced in a version newer than ${tsVersion} (see logs above for the exact error).`,
    );
    process.exit(1);
  }
}

performTest();
