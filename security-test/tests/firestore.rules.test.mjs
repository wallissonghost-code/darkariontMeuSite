import test, { after, before } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
let env;
const rules = fs.readFileSync(path.resolve(process.cwd(), '../firestore.rules'), 'utf8');
before(async () => {
  env = await initializeTestEnvironment({ projectId:'demo-darkariont-security', firestore:{ rules } });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore();
    await setDoc(doc(db,'usuarios/alice'), { nome:'Alice', email:'alice@test.local', telefone:'', role:'cliente', vip:0, carimbos:0, creditos:0, totalGasto:0, tema:'dark' });
    await setDoc(doc(db,'usuarios/bob'), { nome:'Bob', email:'bob@test.local', telefone:'', role:'cliente', vip:0, carimbos:0, creditos:0, totalGasto:0, tema:'dark' });
    await setDoc(doc(db,'compras/order-bob'), { clienteId:'bob' });
  });
});
after(async () => env?.cleanup());
test('anonymous profile read denied', async () => assertFails(getDoc(doc(env.unauthenticatedContext().firestore(),'usuarios/alice'))));
test('owner profile read allowed', async () => assertSucceeds(getDoc(doc(env.authenticatedContext('alice',{email:'alice@test.local'}).firestore(),'usuarios/alice'))));
test('cross-user profile read denied', async () => assertFails(getDoc(doc(env.authenticatedContext('alice',{email:'alice@test.local'}).firestore(),'usuarios/bob'))));
test('self role escalation denied', async () => assertFails(updateDoc(doc(env.authenticatedContext('alice',{email:'alice@test.local'}).firestore(),'usuarios/alice'),{role:'admin'})));
test('cross-user purchase read denied', async () => assertFails(getDoc(doc(env.authenticatedContext('alice',{email:'alice@test.local'}).firestore(),'compras/order-bob'))));
test('admin claim can read user profile', async () => assertSucceeds(getDoc(doc(env.authenticatedContext('security-admin',{admin:true,email:'admin@test.local'}).firestore(),'usuarios/bob'))));
test('unknown collection denied by default', async () => assertFails(getDoc(doc(env.authenticatedContext('alice',{email:'alice@test.local'}).firestore(),'nao_autorizado/x'))));
