import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const reports = path.resolve(process.cwd(),'reports');
fs.mkdirSync(reports,{recursive:true});
function run(name, command, args) {
  const p = spawnSync(command,args,{cwd:process.cwd(),encoding:'utf8',shell:process.platform==='win32'});
  return { name, status:p.status===0?'PASS':'FAIL', exitCode:p.status ?? 1, stdout:(p.stdout||'').trim(), stderr:(p.stderr||'').trim() };
}
const suites = [
  run('static-audit',process.execPath,['scripts/static-audit.mjs']),
  run('firebase-rules','npx',['firebase','emulators:exec','--only','firestore,storage','--project','demo-darkariont-security','node --test tests/*.test.mjs'])
];
const report = { generatedAt:new Date().toISOString(), scope:'controlled local defensive tests', status:suites.some(x=>x.status==='FAIL')?'FAIL':'PASS', suites };
fs.writeFileSync(path.join(reports,'latest.json'),JSON.stringify(report,null,2));
console.log('\n=== DARKARIONT SECURITY TEST ===');
for (const suite of suites) console.log(`${suite.status.padEnd(4)}  ${suite.name}`);
console.log(`RESULT: ${report.status}`);
if (report.status==='FAIL') process.exitCode=1;
