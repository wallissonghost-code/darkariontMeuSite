import test, { after, before } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { ref, uploadBytes, getBytes } from 'firebase/storage';
let env;
const rules = fs.readFileSync(path.resolve(process.cwd(), '../storage.rules'), 'utf8');
before(async () => { env = await initializeTestEnvironment({ projectId:'demo-darkariont-security', storage:{ rules } }); });
after(async () => env?.cleanup());
const jpeg = new Uint8Array([0xff,0xd8,0xff,0xd9]);
test('owner can upload jpeg profile', async () => {
  const storage = env.authenticatedContext('alice').storage();
  await assertSucceeds(uploadBytes(ref(storage,'usuarios/alice/perfil.jpg'), jpeg, { contentType:'image/jpeg' }));
});
test('cross-user profile upload denied', async () => {
  const storage = env.authenticatedContext('alice').storage();
  await assertFails(uploadBytes(ref(storage,'usuarios/bob/perfil.jpg'), jpeg, { contentType:'image/jpeg' }));
});
test('unsupported profile content type denied', async () => {
  const storage = env.authenticatedContext('alice').storage();
  await assertFails(uploadBytes(ref(storage,'usuarios/alice/perfil.webp'), new TextEncoder().encode('<svg/>'), { contentType:'image/svg+xml' }));
});
test('unknown storage path denied', async () => {
  const storage = env.authenticatedContext('alice').storage();
  await assertFails(uploadBytes(ref(storage,'public/test.txt'), new TextEncoder().encode('test'), { contentType:'text/plain' }));
});
test('anonymous profile read denied', async () => {
  const ownerStorage = env.authenticatedContext('alice').storage();
  await uploadBytes(ref(ownerStorage,'usuarios/alice/perfil.webp'), jpeg, { contentType:'image/webp' });
  await assertFails(getBytes(ref(env.unauthenticatedContext().storage(),'usuarios/alice/perfil.webp')));
});
