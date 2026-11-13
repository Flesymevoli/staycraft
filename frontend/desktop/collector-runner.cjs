// Electron utility processes retain their IPC handle after an imported script
// finishes. Exit explicitly so the desktop can receive the completed result.
const {pathToFileURL}=require('node:url');
const script=process.argv[2];
process.argv=[process.argv[0],script,...process.argv.slice(3)];
import(pathToFileURL(script).href).then(
 ()=>process.exit(process.exitCode||0),
 ()=>process.exit(1),
);
